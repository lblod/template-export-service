import { z } from 'zod';

export const JobErrorSchema = z.object({
  id: z.string(),
  uri: z.string(),
  message: z.string(),
});

export type JobError = z.infer<typeof JobErrorSchema>;
