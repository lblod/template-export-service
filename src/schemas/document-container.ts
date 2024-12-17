import { z } from 'zod';

export const DocumentContainerSchema = z.object({
  id: z.string(),
  uri: z.string(),
  currentVersionUri: z.string(),
  folderUri: z.string().optional(),
  linkedSnippetListUris: z.set(z.string()),
});

export type DocumentContainer = z.infer<typeof DocumentContainerSchema>;
