import * as React from "react";
import { DatabaseContext, DatabaseContextType, Doc } from "./Database";
import merge from "./merge";

export interface DocumentIdProps {
  id: string;
}

/**
 * Properties specific to the <Document/> component.
 */
export interface DocumentProps {
  /**
   * If debug is enabled there is additional logging to the console.
   */
  debug?: boolean;
  onConflict?(yours: Doc, theirs: Doc): Doc;
  loading?: React.ReactNode;
  children?: React.ReactChild;
  component?: React.ReactNode;
}

export interface DocumentState {
  rev: string | null;

  data: Record<string, unknown>;

  initialized: boolean;
}

export type putDocument = (data: Record<string, unknown>) => void;

/**
 * Wrapped components need a put property.
 */
export interface PuttableProps {
  /**
   * Put data into state and the mapped PouchDB document.
   *
   * If you are using a <Document/> component you should call this.props.putDocument() instead of this.setState().
   *
   * @param data Data to be put in both state and PouchDB.
   */
  putDocument: putDocument;
}

export interface DocumentContextType {
  id: string;
}

export const DocumentContext = React.createContext<DocumentContextType>(null);

export function withDocument<P>(
  id: string,
  WrappedComponent: React.ComponentType<P & PuttableProps>
): React.FunctionComponent<P & DocumentProps> {
  return (props: P & DocumentProps): React.ReactElement<P & DocumentProps> => (
    <Document id={id} loading={props.loading}>
      <WrappedComponent
        // This property will get overwritten by <Document />
        putDocument={(): void => {
          /* do nothing */
        }}
        {...props}
      />
    </Document>
  );
}

export class Document extends React.PureComponent<
  DocumentIdProps & DocumentProps,
  DocumentState,
  DatabaseContextType
> {
  static contextType = DatabaseContext;

  context!: React.ContextType<typeof DatabaseContext>;

  static defaultProps: DocumentProps = {
    debug: false,
    onConflict(yours: Doc, theirs: Doc): Doc {
      // Shallow merge objects, giving preference to yours
      return merge(theirs, yours) as Doc;
    },
  };

  state: DocumentState = {
    rev: null,
    initialized: false,
    data: {},
  };

  private db: PouchDB.Database;

  private log(...args: unknown[]): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log.apply(null, args);
    }
  }

  /**
   * Get the revision of the current PouchDB document.
   */
  getRevision(): string {
    return this.state.rev;
  }

  /**
   * Set the revision of the current PouchDB document in the component state.
   * @param rev revision of the current PouchDB document.
   */
  setRevision(rev: string): void {
    this.setState({
      rev,
    });
  }

  /**
   * Set a document in the component state.
   * @param doc document from PouchDB.
   */
  setDocument(doc: Record<string, unknown> = {}): void {
    // We don't want to put '_rev' or '_id' in our state data
    const data = this.extractDocument(doc);

    this.setState({
      initialized: true,
      data,
    });
  }

  /**
   * Given a document from PouchDB extract the _id and _rev fields from it.
   * @param doc pouchdb document
   */
  private extractDocument(
    doc: Record<string, unknown>
  ): Record<string, unknown> {
    const data = Object.keys(doc)
      // Create a new key set that excludes these two keys
      .filter(
        (k) =>
          k !== "_id" && k !== "_rev" && k !== "_deleted" && k !== "_conflicts"
      )
      // Create a new object using the keyset and the original values
      // Note that the [key]: string type here basically states that every key on the object is a string
      .reduce((obj: { [key: string]: unknown }, key: string): {
        [key: string]: unknown;
      } => {
        obj[key] = doc[key];
        return obj;
      }, {});

    return data;
  }

  componentDidMount(): void {
    // Add our current document to the ones we are watching
    this.context.watchDocument(this.props.id, this);

    this.context.db
      .get(this.props.id, { conflicts: true })
      .then((doc) => {
        // If a conflict exists, load the current and the conflict and pass it along to our handler
        if (doc._conflicts) {
          this.context.db
            // Note: What happens when there is more than one conflict?
            .get(this.props.id, { rev: doc._conflicts[0] })
            .then((conflict) => {
              this.handleConflict(doc as Doc, conflict as Doc);
            });
        }

        this.setRevision(doc._rev);
        this.setDocument(doc as Doc);
      })
      .catch(
        (err: { status: number; message: string; reason: string }): void => {
          // We did not find a document, but the component is now initialized
          // The document can be either 'missing' or 'deleted'
          if (err.status === 404) {
            this.setDocument();
          }
        }
      );
  }

  /**
   * Replacement for setState() in managed components.
   *
   * This method updates the component state as well as updates the PouchDb document.
   * It is passed along to the child component and is the primary method for properties
   * to trickle down to children.
   */
  private putDocument = (data: Record<string, unknown>): void => {
    // Set the internal state, this gives us the changes right away - we update the revision after the put
    this.setDocument(data);

    const putData = {
      ...{ _id: this.props.id, ...data },
      ...(this.state.rev !== null ? { _rev: this.state.rev } : {}),
    };

    this.context.db
      .put(putData)
      .then((response: PouchDB.Core.Response) => {
        this.setRevision(response.rev);
        return response;
      })
      .catch(
        (err: { status: number; message: string; reason: string }): void => {
          // eslint-disable-next-line no-console
          console.error("An error occurred while putting a document", err);

          if (err.status === 409) {
            // Handle 'immediate' conflict
            // Do we still need to do this with our external handling?
            this.context.db.get(this.props.id).then((original) => {
              this.handleConflict(putData, original as Doc);
            });
          }
          // This indicates a brand new document that we are creating, the document can be either 'missing' or 'deleted'
          if (err.status === 404) {
            this._putDocument({ _id: this.props.id, ...data });
          }
        }
      );
  };

  private _putDocument = (data: Doc): Promise<PouchDB.Core.Response> => {
    return this.context.db.put(data).then((response: PouchDB.Core.Response) => {
      this.setRevision(response.rev);
      return response;
    });
  };

  handleConflict(yours: Doc, theirs: Doc): void {
    this.log("Document Conflict (yours, theirs)", yours, theirs);

    const winningRev = yours._rev > theirs._rev ? yours._rev : theirs._rev;
    const losingRev = yours._rev < theirs._rev ? yours._rev : theirs._rev;
    const result = this.extractDocument(this.props.onConflict(yours, theirs));

    // Delete the conflicting document forcefully
    this.context.db.put(
      {
        _deleted: true,
        _id: this.props.id,
        _rev: losingRev,
      },
      { force: true } // Force the delete
    );

    // Put the new merge document in
    this.context.db.put({
      ...result,
      _id: this.props.id,
      _rev: winningRev,
    });

    // Update our state after the conflict
    this.setDocument(result);
  }

  render(): React.ReactNode {
    // If we haven't initialized the document yet and don't have a loading component
    if (!this.state.initialized && !this.props.loading) {
      return <React.Fragment />;
    }

    // If we haven't initialized the document yet return the loading component
    if (!this.state.initialized) {
      return this.props.loading;
    }

    const props = {
      ...this.props,
      ...this.state.data,
      putDocument: this.putDocument,
    };

    const child = (
      this.props.component ? this.props.component : this.props.children
    ) as React.ReactElement;

    if (!child) {
      throw new Error("A component or children must be specified.");
    }

    const contextValue: DocumentContextType = {
      id: this.props.id,
    };

    return (
      <DocumentContext.Provider value={contextValue}>
        {React.cloneElement(child, props)}
      </DocumentContext.Provider>
    );
  }
}
