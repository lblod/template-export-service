import { z } from 'zod';
import { coercedSet } from './common';

export const DocumentContainerSchema = z.object({
  id: z.string(),
  uri: z.string(),
  currentVersionUri: z.string(),
  folderUri: z.string().optional(),
  linkedSnippetListUris: coercedSet(z.string()),
  publisherUri: z.string().optional(),
});
export type DocumentContainer = z.infer<typeof DocumentContainerSchema>;
