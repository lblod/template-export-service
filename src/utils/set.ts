export function addAll<T>(set: Set<T>, ...items: T[]) {
  items.forEach((item) => {
    set.add(item);
  });
}

export function popElement<T>(set: Set<T>): T | undefined {
  if (set.size === 0) {
    return;
  }
  const next = set.values().next().value as T;
  set.delete(next);
  return next;
}
