import { z } from 'zod';

export const SnippetVersionSchema = z.object({
  id: z.string(),
  uri: z.string(),
  title: z.string(),
  content: z.string(),
  createdOn: z.coerce.date(),
  snippetUri: z.string(),
  validThrough: z.coerce.date().optional(),
});

// Thanks to coersion the input type differs, but the `z.input` helper doesn't handle this
// We should get this in zod 4,
// See https://github.com/colinhacks/zod/issues/2519
// and https://github.com/colinhacks/zod/pull/3862
export type SnippetVersionInput = Omit<
  z.input<typeof SnippetVersionSchema>,
  'createdOn' | 'validThrough'
> & {
  createdOn: Date | string | number;
  validThrough?: Date | string | number;
};
export type SnippetVersion = z.infer<typeof SnippetVersionSchema>;
