import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Employee } from '@/api/types';
import { FormField } from '@/components/FormField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { applyServerErrors } from '@/lib/form-errors';
import { formatMoney, todayIsoDate } from '@/lib/format';
import { useChangeSalary } from './api';
import { AMOUNT_PATTERN } from './EmployeeFormDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

interface FormValues {
  amount: string;
  effectiveDate: string;
}

export function ChangeSalaryDialog({ open, onOpenChange, employee }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change salary</DialogTitle>
          <DialogDescription>
            {employee.name} currently earns {formatMoney(employee.salary, employee.currencyCode)} a
            month. The current salary stays in the history.
          </DialogDescription>
        </DialogHeader>
        <ChangeSalaryForm employee={employee} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ChangeSalaryForm({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const changeSalary = useChangeSalary(employee.id);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { amount: '', effectiveDate: todayIsoDate() } });

  async function save(values: FormValues) {
    setFormError(null);
    try {
      await changeSalary.mutateAsync({ ...values, amount: values.amount.trim() });
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, ['amount', 'effectiveDate'], setError));
    }
  }

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(save)}>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FormField
        id="amount"
        label={`New monthly salary (${employee.currencyCode})`}
        error={errors.amount?.message}
      >
        <Input
          id="amount"
          inputMode="decimal"
          autoFocus
          aria-invalid={Boolean(errors.amount)}
          aria-describedby="amount-error"
          {...register('amount', {
            required: 'Enter the new salary',
            validate: (value) =>
              (AMOUNT_PATTERN.test(value.trim()) && Number(value) > 0) ||
              'Enter an amount greater than zero, with at most 2 decimal places',
          })}
        />
      </FormField>

      <FormField id="effectiveDate" label="Effective date" error={errors.effectiveDate?.message}>
        <Input
          id="effectiveDate"
          type="date"
          max={todayIsoDate()}
          aria-invalid={Boolean(errors.effectiveDate)}
          aria-describedby="effectiveDate-error"
          {...register('effectiveDate', {
            required: 'Enter the effective date',
            validate: (value) =>
              value <= todayIsoDate() || 'Effective date cannot be in the future',
          })}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={changeSalary.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={changeSalary.isPending}>
          {changeSalary.isPending ? 'Saving…' : 'Save new salary'}
        </Button>
      </DialogFooter>
    </form>
  );
}
