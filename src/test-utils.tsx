import React from "react";
import PouchDB from "pouchdb";

if (!window.setImmediate) {
  window.setImmediate = window.setTimeout;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require("pouchdb-adapter-memory"));

export function Loading(): React.FunctionComponentElement<null> {
  return <div>Loading...</div>;
}

export async function getPouchDb(): Promise<PouchDB.Database> {
  // An existing database, we'll pass this into our component to be used
  const db = new PouchDB("local", { adapter: "memory" });

  // If the test document exists we're going to delete it before each test
  try {
    const doc = await db.get("test");
    await db.remove(doc);
  } catch (err) {
    // Don't need to do anything
  }

  return db;
}
