# React PouchDB Components

React components for interacting with [PouchDB](https://pouchdb.com) documents.  These components can be used to wrap parts of an application and both load and save state to a document.  These components can be used both with React and React Native.

*These components have been written in typescript.*

## Getting Started

Simply run:

```shell
npm install --save @stanlemon/react-pouchdb pouchdb
```

...and profit!

## Example

Check out the [example app](./example/), which creates several different counters using different forms of the `<Document />` component.

You can run the app by doing:

```shell
cd ./example/
npm install
npm start
```

## PouchDB Components

Several components for making PouchDB easy to use are included.

To beging using, start with the `<Database />` component which must be used at the highest level you wish to use PouchDB at.

```jsx
<Database database="local" remote="http://127.0.0.1:5984/test">
  <h1>Database</h1>
</Database>
```

Any component can be wrapped in a `<Document />` which loads data from a PouchDB document, receives changes if that local PouchDB instance is syncing from a remote CouchDB instance, and provides a `putDocument()` method that can be used in place of `setState()` under most circumstances.

Using a higher order function:
```jsx
import { Counter } from "./Counter";
const WrappedCounter = withDocument("counter", Counter);
<WrappedCounter />
```

Using the component and wrapping children:
```jsx
import { Counter } from "./Counter";
<Document id="counter" loading={<div>Loading...</div>}>
  <Counter />
</Document>
```

Using the component with the 'component' property
```jsx
import { Counter } from "./Counter";
<Document id="counter" component={<Counter />} />
```

If you want to get the PouchDB instance as a `db` property on a component, simply wrap it in `<Aware/>`.  This can be nested anywhere in your tree so long as at the top level you have a `<Database />` component.

```jsx
<Database>
  <Aware>
    <h1>You could put a component here that will get the "db" property.</h1>
  </Aware>
</Database>
```

## Syncing to a Remote Database

The `<PouchDb.Database>` component has an attribute called `remote` that can be either a `PouchDB` instance or a valid URL for a CouchBD compatible database instance.  Change detection is managed centrally in a single set of listeners and state is updated in components in real time. You can specify an `onConflict()` handler on the `<Document/>` component to deal with conflicts if they arise. *A default handler that performs a blind merge is offered by default.*

If you want a quick and easy way to test this out, install `pouchdb-server` and run it.

Install `pouchdb-server`:

```shell
npm install -g pouchdb-server
```

Run `pouchdb-server`:
```shell
pouchdb-server -m
```
_The `-m` attribute stores data in memory only, if you would rather use sql do `npm install -g pouchdb-adapter-node-websql` and then use the `--sqlite` argument when starting the `pouchdb-server` instance instead of `-m`._


## Build & Test

To get started:
```shell
npm install
```

To build the library:
```shell
npm run build
```

To run the tests:
```shell
npm run test
```