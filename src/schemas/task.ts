import { z } from 'zod';
import { JOB_STATUSES } from '../constants';

export const TaskSchema = z.object({
  id: z.string(),
  uri: z.string(),
  createdOn: z.coerce.date(),
  updatedOn: z.coerce.date().optional(),
  statusUri: z.nativeEnum(JOB_STATUSES),
  operationUri: z.string().optional(),
  errorUri: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
