import { z } from 'zod';

export const EditorDocumentSchema = z.object({
  id: z.string(),
  uri: z.string(),
  title: z.string(),
  content: z.string(),
  context: z.string().optional(),
  createdOn: z.coerce.date(),
  updatedOn: z.coerce.date(),
});

export type EditorDocument = z.infer<typeof EditorDocumentSchema>;
