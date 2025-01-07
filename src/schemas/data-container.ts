import { z } from 'zod';

export const DataContainerSchema = z.object({
  id: z.string(),
  uri: z.string(),
});

export type DataContainer = z.infer<typeof DataContainerSchema>;
