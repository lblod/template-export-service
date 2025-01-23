import { z } from 'zod';

export function coercedSet<T extends z.ZodTypeAny>(elementType: T) {
  return z
    .union([z.array(elementType), z.set(elementType)])
    .transform((l) => new Set<z.infer<T>>(l));
}
