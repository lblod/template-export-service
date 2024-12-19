import { z } from 'zod';

export const SnippetSchema = z.object({
  id: z.string(),
  uri: z.string(),
  position: z.coerce.number().optional(),
  createdOn: z.coerce.date(),
  updatedOn: z.coerce.date(),
  currentVersionUri: z.string(),
  linkedSnippetListUris: z.set(z.string()),
});

// Thanks to coersion the input type differs, but the `z.input` helper doesn't handle this
// We should get this in zod 4,
// See https://github.com/colinhacks/zod/issues/2519
// and https://github.com/colinhacks/zod/pull/3862
export type SnippetInput = Omit<
  z.input<typeof SnippetSchema>,
  'createdOn' | 'updatedOn' | 'position'
> & {
  createdOn: Date | string | number;
  updatedOn: Date | string | number;
  position?: string | number;
};
export type Snippet = z.infer<typeof SnippetSchema>;
