export type None = null | undefined;
export type Option<A> = A | None;

export function expect<A>(thing: Option<A>, error: Error): A {
  if (isNone(thing)) {
    throw error;
  }
  return thing;
}

export function unwrap<A>(thing: Option<A>): A {
  return expect(thing, new Error('Unwrapped a null or undefined value'));
}

export function isSome<A>(thing: Option<A>): thing is A {
  return thing !== null && thing !== undefined;
}

export function isNone<A>(thing: Option<A>): thing is None {
  return !isSome(thing);
}
