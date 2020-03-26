/* eslint-disable max-lines-per-function */
import React from "react";
import PouchDB from "pouchdb";
import { configure, mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import waitForExpect from "wait-for-expect";
import { Database } from "./Database";
import { Document, withDocument, PuttableProps } from "./Document";

configure({ adapter: new Adapter() });

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require("pouchdb-adapter-memory"));

class TestComponent extends React.Component<
  PuttableProps & { value?: string }
> {
  static defaultProps = {
    value: "",
  };

  onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.props.putDocument({ value: e.target.value });
  };

  render(): React.ReactNode {
    return (
      <div>
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

function Loading(): React.FunctionComponentElement<null> {
  return <div>Loading...</div>;
}

async function getPouchDb(): Promise<PouchDB.Database> {
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

test("withDocument() renders wrapped component", async (): Promise<void> => {
  // Add some initial state to our document, this should get loaded into the component
  const db = await getPouchDb();

  await db.put({ _id: "test", value: "Hello World" });

  const Test = withDocument("test", TestComponent);

  const wrapper = mount(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  // The component is not initialized while waiting for PouchDB to fetch its document
  expect(wrapper.find(Document).state().initialized).toBe(false);
  // Uninitialized means that we should have a loading component in the tree
  expect(wrapper.find(Loading).length).toBe(1);
  // And we should not have the component we wrapped
  expect(wrapper.find(TestComponent).length).toBe(0);

  await waitForExpect(() => {
    expect(wrapper.find(Document).state().initialized).toBe(true);
  }, 1000);

  // Force the component to re-render now that it is initialized
  wrapper.update();

  expect(wrapper.find(Loading).length).toBe(0);
  expect(wrapper.find(TestComponent).length).toBe(1);

  // Our value property from the document came back
  expect(wrapper.find(TestComponent).prop("value")).toBe("Hello World");
  expect(wrapper.html()).toContain("Hello World");

  // These properties should not come back from the PouchDB document
  expect(wrapper.find(TestComponent).prop("_id")).toBe(undefined);
  expect(wrapper.find(TestComponent).prop("_rev")).toBe(undefined);

  wrapper.unmount();
});

test("withDocument() initializes with no existing document", async (): Promise<
  void
> => {
  const db = await getPouchDb();

  const Test = withDocument("test", TestComponent);

  const wrapper = mount(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  // Wait until our component is initialized
  await waitForExpect(() => {
    expect(wrapper.find(Document).state().initialized).toBe(true);
  }, 1000);

  wrapper.unmount();
});

test("withDocument() updates document in PouchDB", async (): Promise<void> => {
  const db = await getPouchDb();

  const Test = withDocument("test", TestComponent);

  const wrapper = mount(
    <Database database={db}>
      <Test loading={<Loading />} />
    </Database>
  );

  // Wait until our component is initialized
  await waitForExpect(() => {
    expect(wrapper.find(Document).state().initialized).toBe(true);
  }, 3000);

  wrapper.update();

  const input = wrapper.find("input#value");

  expect(input.length).toBe(1);
  expect(input.props().value).toBe("");

  const newValue = "My new value";

  input.simulate("change", { target: { value: newValue } });

  expect(wrapper.find(Document).state().data.value).toBe(newValue);

  wrapper.update();

  await waitForExpect(async () => {
    const doc = (await db.get("test")) as { value: string };
    expect(doc.value).toBe(newValue);
  }, 1000);

  expect(wrapper.find("input#value").props().value).toBe(newValue);

  wrapper.unmount();
});

test("withDocument() receives changes from a remote db", async (): Promise<
  void
> => {
  // Add some initial state to our document, this should get loaded into the component
  const db = await getPouchDb();

  const remoteDb = new PouchDB("remote", { adapter: "memory" });

  const Test = withDocument("test", TestComponent);

  const wrapper = mount(
    <Database database={db} remote={remoteDb}>
      <Test value="Start" loading={<Loading />} />
    </Database>
  );

  await waitForExpect(() => {
    expect(wrapper.find(Document).state().initialized).toBe(true);
  }, 1000);

  // Force the component to re-render now that it is initialized
  wrapper.update();

  expect(wrapper.find(TestComponent).length).toBe(1);

  expect(wrapper.find(TestComponent).props().value).toBe("Start");

  await remoteDb.put({ _id: "test", value: "Finish" });

  await waitForExpect(() => {
    wrapper.update();
    expect(wrapper.find(TestComponent).props().value).toBe("Finish");
  }, 1000);

  // These properties should not come back from the PouchDB document
  expect(wrapper.find(TestComponent).prop("_id")).toBe(undefined);
  expect(wrapper.find(TestComponent).prop("_rev")).toBe(undefined);

  wrapper.unmount();
});
