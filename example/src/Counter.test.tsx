import React from "react";
import { mount, shallow } from "enzyme";
import { Counter } from "./Counter";

test("<Counter/> Defaults count to 0", (): void => {
  const wrapper = mount(<Counter />);

  expect(wrapper.props().count).toBe(0);
});

test("<Counter/> count can be set on the component", (): void => {
  const expected = 101;

  const wrapper = mount(<Counter count={expected} />);

  expect(wrapper.props().count).toBe(expected);
});

test("<Counter/> Renders the current count", (): void => {
  const count = 99;

  const wrapper = mount(<Counter count={count} />);

  // Stick our number is a string so we can check for it in the component
  const countStr = `${count}`;

  expect(wrapper.contains(countStr)).toBeTruthy();
});

test("<Counter/> can be incremented with a button", (): void => {
  let state: number;

  const putDocument = ({ count }: { count: number }): void => {
    state = count;
  };

  const wrapper = shallow(<Counter putDocument={putDocument} />);

  wrapper.find("button#increment").simulate("click");

  expect(state).toBe(1);
});

test("<Counter/> can be decremented with a button", (): void => {
  let state: number;

  const putDocument = ({ count }: { count: number }): void => {
    state = count;
  };

  const wrapper = shallow(<Counter count={10} putDocument={putDocument} />);

  wrapper.find("button#decrement").simulate("click");

  expect(state).toBe(9);
});
