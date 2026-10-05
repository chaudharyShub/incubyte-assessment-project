import { z } from 'zod';
import { AppError } from './errors.js';

/**
 * Parses `input` with `schema`, or throws a 400 whose details map each invalid
 * field to its messages, e.g. `{ email: ['Enter a valid email address'] }`.
 */
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', fieldErrors);
  }
  return result.data;
}
