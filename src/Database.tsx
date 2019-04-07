import * as React from "react";
import PouchDB from "pouchdb";
import { Document } from "./Document";

interface DatabaseProps {
  /**
   * Children components.
   */
  children: React.ReactNode;

  /**
   * (Optional) Name or instance of the local PouchDB instance.
   *
   * Normally you just specify a name such as 'local' or 'test', but for unusual circumstances you can pass along an
   * existing PouchDB instance.
   *
   * Defaults to 'local' if not specified.
   */
  database?: string | PouchDB.Database;

  /**
   * (Optional) URL or instance of a remote CouchDB compatible database to synchronize with.
   */
  remote?: string | PouchDB.Database;
}

export interface DatabaseContext {
  db: PouchDB.Database;
  watchDocument(id: string, component: Document): void;
}

export interface Doc {
  [key: string]: string;
  _id: string;
  _rev: string;
}

export const Context = React.createContext<DatabaseContext>(null);

/**
 * Component for using PouchDB with React components. In order to wrap a component in a <Document />
 * you need to use this component upstream of it.
 */
export class Database extends React.Component<DatabaseProps> {
  static defaultProps = {
    database: "local"
  };

  private db: PouchDB.Database;

  private sync: PouchDB.Replication.Sync<{}>;

  private changes: PouchDB.Core.Changes<{}>;

  private watching: {
    // Id of the document to be watched
    id: string;
    // <Document /> component instance
    component: Document;
  }[] = [];

  constructor(props: DatabaseProps) {
    super(props);

    // Create our new local database
    if (
      typeof this.props.database === "object" &&
      this.props.database.constructor.name === "PouchDB"
    ) {
      console.log("Database property is an instance of PouchDB");

      this.db = this.props.database as PouchDB.Database;
    } else {
      this.db = new PouchDB(this.props.database as string);
    }
  }

  // eslint-disable-next-line max-lines-per-function
  componentDidMount(): void {
    if (!this.props.remote) {
      return;
    }

    // Replicate to a remote database
    this.sync = this.db.sync(this.props.remote, { retry: true, live: true });

    this.changes = this.db
      .changes({
        conflicts: true,
        live: true,
        include_docs: true
      })
      .on("change", (change: PouchDB.Core.ChangesResponseChange<Doc>) => {
        // eslint-disable-next-line no-console
        console.log("Received change = ", change);

        this.watching.forEach(watch => {
          // if (change.deleted === true) { /* handle deletion /* }

          // If this isn't the doc we're looking for, skip over it
          if (watch.id !== change.id) {
            return;
          }

          if (change.doc._conflicts) {
            // Handle conflict here
            this.db
              // Note: What happens when there is more than one conflict?
              .get(watch.id, { rev: change.doc._conflicts[0] })
              .then((conflict: Doc) => {
                watch.component.handleConflict(change.doc, conflict);
              });
          }

          // If we don't have the revision for this change already (meaning it's likely external and not local) apply it
          if (watch.component.getRevision() !== change.doc._rev) {
            watch.component.setRevision(change.doc._rev);
            watch.component.setDocument(change.doc);
          }
        });
      });
  }

  componentWillUnmount(): void {
    if (this.props.remote) {
      this.sync.cancel();
      this.changes.cancel();
      this.watching = [];
    }
  }

  render(): React.ReactNode {
    const contextValue: DatabaseContext = {
      db: this.db,
      watchDocument: (id: string, component: Document) => {
        this.watching.push({ id, component });
      }
    };

    return (
      <Context.Provider value={contextValue}>
        {this.props.children}
      </Context.Provider>
    );
  }
}

export default Database;
