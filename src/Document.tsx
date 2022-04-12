import * as React from "react";
import omit from "lodash/omit";
import pick from "lodash/pick";
import {
  DatabaseContext,
  DatabaseContextType,
  Doc,
  ExistingDoc,
} from "./Database";
import merge from "./merge";

/**
 * Properties specific to the <Document/> component.
 */
export type DocumentProps = {
  id: string;
  debug?: boolean;
  onConflict?: (yours: ExistingDoc, theirs: ExistingDoc) => ExistingDoc;
  loading?: React.ReactNode;
  children?: React.ReactChild;
  component?: React.ReactNode;
};

export interface DocumentState {
  rev?: string;

  data: Record<string, unknown>;

  initialized: boolean;
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  putDocument: (data: Record<string, any>) => void;
}

export interface DocumentContextType {
  id: string;
}

export const DocumentContext = React.createContext<
  DocumentContextType | undefined
>(undefined);

type PassThruDocumentProps = Pick<
  DocumentProps,
  "debug" | "loading" | "onConflict"
>;

export function withDocument<P>(
  id: string,
  WrappedComponent: React.ComponentType<P>
): React.FunctionComponent<Omit<P, "putDocument"> & PassThruDocumentProps> {
  const documentPropKeys = ["debug", "loading", "onConflict"];
  const DocumentComponent = (
    props: Omit<P, "putDocument"> & PassThruDocumentProps
  ) => {
    const documentProps = pick(
      "loading",
      documentPropKeys
    ) as PassThruDocumentProps;
    const componentProps = omit(props, documentPropKeys) as P;
    return (
      <Document id={id} {...documentProps}>
        <WrappedComponent {...componentProps} />
      </Document>
    );
  };
  return DocumentComponent;
}

export class Document extends React.PureComponent<
  DocumentProps,
  DocumentState,
  DatabaseContextType
> {
  static contextType = DatabaseContext;
  declare context: React.ContextType<typeof DatabaseContext>;

  static defaultProps: Partial<DocumentProps> = {
    debug: false,
    onConflict(yours: ExistingDoc, theirs: ExistingDoc): ExistingDoc {
      // Shallow merge objects, giving preference to yours
      return merge(theirs, yours) as ExistingDoc;
    },
    loading: <React.Fragment />,
  };

  state: DocumentState = {
    initialized: false,
    data: {},
  };

  private log(...args: unknown[]): void {
    if (this.props.debug) {
      // eslint-disable-next-line no-console
      console.log.apply(null, args);
    }
  }

  /**
   * Get the revision of the current PouchDB document.
   */
  getRevision(): string | undefined {
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
      .reduce(
        (
          obj: { [key: string]: unknown },
          key: string
        ): {
          [key: string]: unknown;
        } => {
          obj[key] = doc[key];
          return obj;
        },
        {}
      );

    return data;
  }

  componentDidMount(): void {
    // Add our current document to the ones we are watching
    this.context?.watchDocument(this.props.id, this);

    this.context?.db
      .get(this.props.id, { conflicts: true })
      .then((doc) => {
        // If a conflict exists, load the current and the conflict and pass it along to our handler
        if (doc._conflicts) {
          this.context?.db
            // Note: What happens when there is more than one conflict?
            .get(this.props.id, { rev: doc._conflicts[0] })
            .then((conflict) => {
              this.handleConflict(doc as ExistingDoc, conflict as ExistingDoc);
            })
            .catch((err) => console.error(err));
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
    } as Doc;

    this.context?.db
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
            this.context?.db
              .get(this.props.id)
              .then((original) => {
                this.handleConflict(
                  putData as ExistingDoc,
                  original as ExistingDoc
                );
              })
              .catch((err) => console.error(err));
          }
          // This indicates a brand new document that we are creating, the document can be either 'missing' or 'deleted'
          if (err.status === 404) {
            this._putDocument({ _id: this.props.id, ...data } as ExistingDoc);
          }
        }
      );
  };

  private _putDocument = (data: Doc | ExistingDoc) => {
    this.context?.db
      .put(data)
      .then((response) => {
        this.setRevision(response?.rev);
        return response;
      })
      .catch((err) => console.error(err));
  };

  handleConflict(yours: ExistingDoc, theirs: ExistingDoc): void {
    this.log("Document Conflict (yours, theirs)", yours, theirs);

    // There is no conflict handler, so nothing to do
    if (!this.props.onConflict) {
      return;
    }

    const winningRev = yours._rev > theirs._rev ? yours._rev : theirs._rev;
    const losingRev = yours._rev < theirs._rev ? yours._rev : theirs._rev;
    const result = this.extractDocument(this.props.onConflict(yours, theirs));

    // Delete the conflicting document forcefully
    this.context?.db
      .put(
        {
          _deleted: true,
          _id: this.props.id,
          _rev: losingRev,
        },
        { force: true } // Force the delete
      )
      .catch((err) => console.error(err));

    // Put the new merge document in
    this.context?.db
      .put({
        ...result,
        _id: this.props.id,
        _rev: winningRev,
      })
      .catch((err) => console.error(err));

    // Update our state after the conflict
    this.setDocument(result);
  }

  render(): React.ReactNode {
    // If we haven't initialized the document yet
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
