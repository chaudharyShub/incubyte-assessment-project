import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

/**
 * Shows a failed save on the form. Errors the server attributes to a field of
 * this form are put on that field; anything else is returned as one message
 * for the top of the form.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';

  const details = Object.entries(error.details ?? {});
  const known = details.filter(([field]) => fields.includes(field as Path<T>));
  for (const [field, messages] of known) {
    setError(field as Path<T>, { type: 'server', message: messages[0] });
  }

  if (known.length > 0 && known.length === details.length) return null;
  const others = details.filter((entry) => !known.includes(entry)).flatMap(([, m]) => m);
  return others.length > 0 ? others.join(' ') : error.message;
}
