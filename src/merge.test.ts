import merge from "./merge";

//eslint-disable-next-line max-lines-per-function
test("merge", () => {
  const a = {
    one: "one1",
    two: "two",
    three: {
      a: "a1",
      b: "b",
    },
    four: [1, 2, 3],
    five: "five",
    seven: "eight",
  };
  const b = {
    one: "one2",
    three: {
      a: "a2",
      c: "c",
    },
    four: [3, 4, 5],
    five: ["f", "i", "v", "e"],
    six: [0, 0, 0],
    seven: {
      eight: "eight",
    },
  };

  expect(merge(a, b)).toMatchObject({
    one: "one2",
    two: "two",
    three: {
      a: "a2",
      b: "b",
      c: "c",
    },
    four: [1, 2, 3, 3, 4, 5],
    five: ["f", "i", "v", "e"],
    six: [0, 0, 0],
    seven: {
      eight: "eight",
    },
  });
});
