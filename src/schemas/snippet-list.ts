import { z } from 'zod';

export const SnippetListSchema = z.object({
  id: z.string(),
  uri: z.string(),
  label: z.string(),
  createdOn: z.coerce.date(),
  snippetUris: z.set(z.string()),
  importedResourceUris: z.set(z.string()),
});

export type SnippetList = z.infer<typeof SnippetListSchema>;
