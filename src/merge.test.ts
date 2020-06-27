import merge from "./merge";

test("merge", () => {
  const a = {
    one: "one1",
    two: "two",
    three: {
      a: "a1",
      b: "b",
    },
    four: [1, 2, 3],
  };
  const b = {
    one: "one2",
    three: {
      a: "a2",
      c: "c",
    },
    four: [3, 4, 5],
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
  });
});
