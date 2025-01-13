import { z } from 'zod';

export const EditorDocumentSchema = z.object({
  id: z.string(),
  uri: z.string(),
  title: z.string(),
  content: z.string(),
  context: z.string().optional(),
  createdOn: z.coerce.date(),
  updatedOn: z.coerce.date(),
  previousVersionUri: z.string().optional(),
  documentContainerUri: z.string(),
});

// Thanks to coersion the input type differs, but the `z.input` helper doesn't handle this
// We should get this in zod 4,
// See https://github.com/colinhacks/zod/issues/2519
// and https://github.com/colinhacks/zod/pull/3862
export type EditorDocumentInput = Omit<
  z.input<typeof EditorDocumentSchema>,
  'createdOn' | 'updatedOn'
> & {
  createdOn: Date | string | number;
  updatedOn: Date | string | number;
};
export type EditorDocument = z.infer<typeof EditorDocumentSchema>;
