import { z } from 'zod';
import { coercedSet } from './common';

export const DocumentContainerSchema = z.object({
  id: z.string(),
  uri: z.string(),
  currentVersionUri: z.string(),
  folderUri: z.string().optional(),
  linkedSnippetListUris: coercedSet(z.string()),
});
export type DocumentContainer = z.infer<typeof DocumentContainerSchema>;
