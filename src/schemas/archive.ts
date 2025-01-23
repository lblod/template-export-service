import { z } from 'zod';
import { DataContainerSchema } from './data-container';

export const ArchiveSchema = DataContainerSchema.extend({
  fileUri: z.string(),
});

export type Archive = z.infer<typeof ArchiveSchema>;
