import { z } from 'zod';
import { coercedSet } from './common';

export const SnippetListSchema = z.object({
  id: z.string(),
  uri: z.string(),
  label: z.string(),
  createdOn: z.coerce.date(),
  snippetUris: coercedSet(z.string()),
  importedResourceUris: coercedSet(z.string()),
});

// Thanks to coersion the input type differs, but the `z.input` helper doesn't handle this
// We should get this in zod 4,
// See https://github.com/colinhacks/zod/issues/2519
// and https://github.com/colinhacks/zod/pull/3862
export type SnippetListInput = Omit<
  z.input<typeof SnippetListSchema>,
  'createdOn'
> & {
  createdOn: Date | string | number;
};
export type SnippetList = z.infer<typeof SnippetListSchema>;
