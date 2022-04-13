export default function merge(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  // Start by copying the first object
  const c = { ...a };

  Object.entries(b).forEach(([key, value]) => {
    // If both sides are arrays merge them
    if (a && Array.isArray(a[key]) && Array.isArray(value)) {
      // TODO: Need to deep merge objects?
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      c[key] = [...(a[key] as []), ...value];
    } else if (
      !Array.isArray(value) &&
      isObject(value as Record<string, unknown>)
    ) {
      c[key] = merge(
        a[key] as Record<string, unknown>,
        b[key] as Record<string, unknown>
      );
    } else {
      c[key] = value;
    }
  });

  return c;
}

function isObject(obj: Record<string, unknown>) {
  return obj !== null && typeof obj === "object";
}
