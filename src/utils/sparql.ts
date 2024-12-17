type Binding = Record<
  string,
  {
    value: string;
    type: string;
  }
>;

export function objectify(binding: Binding) {
  const result: Record<string, string> = {};
  Object.entries(binding).forEach(([key, term]) => {
    result[key] = term.value;
  });
  return result;
}
