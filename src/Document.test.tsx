/* eslint-disable max-lines-per-function */
import React from "react";
import PouchDB from "pouchdb";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import waitForExpect from "wait-for-expect";
import { Database } from "./Database";
import { Document, withDocument, PuttableProps } from "./Document";
import { getPouchDb, Loading } from "./test-utils";

type TestComponentProps = {
  value?: string;
} & PuttableProps;
class TestComponent extends React.Component<TestComponentProps> {
  static defaultProps = {
    value: "",
    putDocument: () => {
      return;
    },
  };

  onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.props.putDocument({ value: e.target.value });
  };

  render(): React.ReactNode {
    return (
      <div>
        Test Component
        <input
          id="value"
          type="text"
          value={this.props.value}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

test("Wrapped component renders", async (): Promise<void> => {
  const Test = (
    <Database>
      <Document id="test">
        <TestComponent value="Hello World" />
      </Document>
    </Database>
  );
  render(Test);

  await waitFor(() => screen.getByText("Test Component"));

  const input = screen.getByRole("textbox");
  expect(input).toHaveValue("Hello World");
});

test("withDocument() renders wrapped component", async (): Promise<void> => {
  // Add some initial state to our document, this should get loaded into the component
  const db = await getPouchDb();

  await db.put({ _id: "test", value: "Hello World" });

  const Test = withDocument("test", TestComponent);

  render(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  await waitFor(() => screen.getByText("Test Component"));

  const input = screen.getByRole("textbox");
  expect(input).toHaveValue("Hello World");
});

test("withDocument() initializes with no existing document", async (): Promise<void> => {
  const db = await getPouchDb();

  const Test = withDocument("test", TestComponent);

  render(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  await waitFor(() => screen.getByText("Test Component"));

  const input = screen.getByRole("textbox");
  expect(input).toHaveValue("");
});

test("withDocument() updates document in PouchDB", async (): Promise<void> => {
  const db = await getPouchDb();

  const Test = withDocument("test", TestComponent);

  render(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  await waitFor(() => screen.getByText("Test Component"));

  const input = screen.getByRole("textbox");

  const newValue = "My new value";

  fireEvent.change(input, { target: { value: newValue } });

  expect(input).toHaveValue(newValue);

  await waitForExpect(async () => {
    const doc = (await db.get("test")) as { value: string };
    expect(doc.value).toBe(newValue);
  }, 1000);
});

test("withDocument() receives changes from a remote db", async (): Promise<void> => {
  // Add some initial state to our document, this should get loaded into the component
  const db = await getPouchDb();

  const remoteDb = new PouchDB("remote", { adapter: "memory" });

  const Test = withDocument("test", TestComponent);

  render(
    <Database database={db} remote={remoteDb}>
      <Test value="Start" loading={<Loading />} />
    </Database>
  );

  await waitFor(() => screen.getByText("Test Component"));

  expect(screen.getByRole("textbox")).toHaveValue("Start");

  await remoteDb.put({ _id: "test", value: "Finish" });

  await waitForExpect(() => {
    expect(screen.getByRole("textbox")).toHaveValue("Start");
  }, 1000);
});
