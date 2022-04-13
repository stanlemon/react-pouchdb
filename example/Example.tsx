import { createRoot } from "react-dom/client";
import { Database, Document, withDocument } from "../src";
import { Counter } from "./Counter";

/**
 * Example <Counter/> wrapped in PouchDB documents three different ways.
 */
function Example(): React.ReactElement {
  const style = { fontFamily: "San Francisco, Helvetica, Arial, sans-serif" };
  const WrappedCounter = withDocument("counter1", Counter);
  return (
    <Database database="local" remote="http://127.0.0.1:5984/test">
      <div style={style}>
        <h1>Three Counters, Three Ways!</h1>
        <hr />

        <h2>Using a higher order function:</h2>
        <WrappedCounter count={0} loading={<div>Loading Counter...</div>} />
        <br />

        <h2>Wrapping the component as a child:</h2>
        <Document id="counter2">
          <Counter />
        </Document>
        <br />

        <h2>Wrapping the component as a property:</h2>
        <Document id="counter3" component={<Counter />} />
      </div>
    </Database>
  );
}

const root = createRoot(
  document.body.appendChild(document.createElement("div"))
);
root.render(<Example />);
