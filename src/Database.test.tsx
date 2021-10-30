import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Database } from "./Database";
import { getPouchDb } from "./test-utils";

test("<Database/> renders children", async (): Promise<void> => {
  const db = await getPouchDb();

  const text = "Hello World";
  render(
    <Database database={db}>
      <h1>{text}</h1>
    </Database>
  );

  expect(screen.getByText(text)).toBeInTheDocument();

  await waitFor(() => screen.getByText(text));
});
