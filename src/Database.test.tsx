import React from "react";
import { mount } from "enzyme";
import { Database } from "./Database";

test("<Database/> renders children", (): void => {
  const text = "Hello World";
  const wrapper = mount(
    <Database>
      <h1>{text}</h1>
    </Database>
  );

  expect(wrapper.props().database).toBe(Database.defaultProps.database);

  expect(wrapper.children().length).toBe(1);

  expect(wrapper.children().contains(text)).toBe(true);
});
