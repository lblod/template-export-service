import { z } from 'zod';

const FileSchema = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.string(),
  format: z.string(),
  size: z.coerce.number(),
  extension: z.string(),
  createdOn: z.coerce.date(),
});

export const LogicalFileSchema = FileSchema;

export const PhysicalFileSchema = FileSchema.extend({
  sourceUri: z.string(),
});

export type LogicalFile = z.infer<typeof LogicalFileSchema>;
export type PhysicalFile = z.infer<typeof PhysicalFileSchema>;
