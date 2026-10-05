import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';

interface Props {
  /** The id of the input inside; the label points at it and the error is `${id}-error`. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

/** A labelled form control with its validation message underneath. */
export function FormField({ id, label, error, children }: Props) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
