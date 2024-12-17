import { z } from 'zod';

const LOGGING_LEVELS = [
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
] as const;

const EnvSchema = z.object({
  LOGGING_LEVEL: z.enum(LOGGING_LEVELS).default('info'),
});

export const ENV = EnvSchema.parse(process.env);
