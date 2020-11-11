import React from "react";
import { render, screen } from "@testing-library/react";

import { Database } from "./Database";

test("<Database/> renders children", async (): Promise<void> => {
  const text = "Hello World";
  render(
    <Database>
      <h1>{text}</h1>
    </Database>
  );

  const items = await screen.findAllByText(text);
  expect(items).toHaveLength(1);
});
