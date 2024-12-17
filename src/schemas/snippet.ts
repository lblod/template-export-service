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

export type Snippet = z.infer<typeof SnippetSchema>;
