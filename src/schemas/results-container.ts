import { z } from 'zod';

export const ResultsContainerSchema = z.object({
  id: z.string(),
  uri: z.string(),
  logicalFileUri: z.string(),
});

export type ResultsContainer = z.infer<typeof ResultsContainerSchema>;
