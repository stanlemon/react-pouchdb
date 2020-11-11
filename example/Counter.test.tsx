import React from "react";
import { Counter } from "./Counter";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

test("<Counter/> Defaults count to 0", (): void => {
  render(<Counter />);

  expect(screen.getByTestId("current-count")).toHaveTextContent("0");
});

test("<Counter/> count can be set on the component", (): void => {
  const expected = 101;

  render(<Counter count={expected} />);

  expect(screen.getByTestId("current-count")).toHaveTextContent(`${expected}`);
});

test("<Counter/> can be incremented with a button", (): void => {
  let state: number;

  const putDocument = ({ count }: { count: number }): void => {
    state = count;
  };

  render(<Counter putDocument={putDocument} />);

  expect(screen.getByTestId("current-count")).toHaveTextContent("0");

  fireEvent.click(screen.getByRole("button", { name: "Increment +" }));

  expect(state).toBe(1);
});

test("<Counter/> can be decremented with a button", (): void => {
  let state: number;

  const putDocument = ({ count }: { count: number }): void => {
    state = count;
  };

  render(<Counter count={10} putDocument={putDocument} />);

  expect(screen.getByTestId("current-count")).toHaveTextContent("10");

  fireEvent.click(screen.getByRole("button", { name: "Decrement -" }));

  expect(state).toBe(9);
});
