import { z } from 'zod';

export const SnippetVersionSchema = z.object({
  id: z.string(),
  uri: z.string(),
  title: z.string(),
  content: z.string(),
  createdOn: z.coerce.date(),
  previousVersionUri: z.string().optional(),
  validThrough: z.coerce.date().optional(),
});

export type SnippetVersion = z.infer<typeof SnippetVersionSchema>;
