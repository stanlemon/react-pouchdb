import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

export default {
  input: "dist/index.js",
  output: [
    {
      name: "ReactPouchDB",
      file: "dist/react-pouchdb.js",
      format: "iife",
      globals: {
        react: "React",
        "react-dom": "ReactDOM",
        pouchdb: "PouchDB",
        // Not having this throws a warning
        "https://unpkg.com/es-react/react.js": "React"
      }
    },
    {
      name: "ReactPouchDB",
      file: "dist/react-pouchdb.module.js",
      format: "esm",
      globals: {
        react: "React",
        "react-dom": "ReactDOM",
        pouchdb: "PouchDB"
      }
    }
  ],
  external: [
    "react",
    "react-dom",
    "pouchdb",
    "https://unpkg.com/es-react/react.js",
    "https://unpkg.com/pouchdb@7.1.1/dist/pouchdb.min.js"
  ],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    // Replacements are intended for the esm build to make it usable
    replace({
      delimiters: ["", ""],
      'from "react"': 'from "https://unpkg.com/es-react/react.js"',
      'import PouchDB from "pouchdb"':
        'import "https://unpkg.com/pouchdb@7.1.1/dist/pouchdb.min.js"'
    })
  ]
};
