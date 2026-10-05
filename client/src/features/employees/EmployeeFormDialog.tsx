import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Employee, Meta } from '@/api/types';
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { applyServerErrors } from '@/lib/form-errors';
import { todayIsoDate } from '@/lib/format';
import { useCreateEmployee, useUpdateEmployee } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: Meta;
  /** Present when editing; absent when adding. */
  employee?: Employee;
  onSaved: (employee: Employee) => void;
}

interface FormValues {
  name: string;
  email: string;
  jobTitle: string;
  departmentId: string;
  levelId: string;
  countryCode: string;
  hireDate: string;
  salary: string;
}

const FIELDS = [
  'name',
  'email',
  'jobTitle',
  'departmentId',
  'levelId',
  'countryCode',
  'hireDate',
  'salary',
] as const;

export const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export function EmployeeFormDialog({ open, onOpenChange, ...formProps }: Props) {
  const editing = Boolean(formProps.employee);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit employee' : 'Add employee'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Country and hire date cannot be changed. To change pay, use “Change salary”.'
              : 'The starting salary is recorded from the hire date.'}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form starts fresh every time. */}
        <EmployeeForm {...formProps} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({
  meta,
  employee,
  onSaved,
  onCancel,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? 0);
  const saving = create.isPending || update.isPending;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: employee?.name ?? '',
      email: employee?.email ?? '',
      jobTitle: employee?.jobTitle ?? '',
      departmentId: employee ? String(employee.departmentId) : '',
      levelId: employee ? String(employee.levelId) : '',
      countryCode: '',
      hireDate: '',
      salary: '',
    },
  });

  const countryCode = useWatch({ control, name: 'countryCode' });
  const currencyCode = meta.countries.find((c) => c.code === countryCode)?.currencyCode;

  async function save(values: FormValues) {
    setFormError(null);
    const details = {
      name: values.name,
      email: values.email,
      jobTitle: values.jobTitle,
      departmentId: Number(values.departmentId),
      levelId: Number(values.levelId),
    };
    try {
      const saved = employee
        ? await update.mutateAsync(details)
        : await create.mutateAsync({
            ...details,
            countryCode: values.countryCode,
            hireDate: values.hireDate,
            salary: values.salary,
          });
      onSaved(saved);
    } catch (error) {
      setFormError(applyServerErrors(error, FIELDS, setError));
    }
  }

  const invalid = (field: keyof FormValues) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': `${field}-error`,
  });

  return (
    <form noValidate className="grid gap-4" onSubmit={handleSubmit(save)}>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Name" error={errors.name?.message}>
          <Input
            id="name"
            {...invalid('name')}
            {...register('name', { required: 'Enter a name' })}
          />
        </FormField>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            {...invalid('email')}
            {...register('email', { required: 'Enter an email address' })}
          />
        </FormField>

        <FormField id="jobTitle" label="Job title" error={errors.jobTitle?.message}>
          <Input
            id="jobTitle"
            {...invalid('jobTitle')}
            {...register('jobTitle', { required: 'Enter a job title' })}
          />
        </FormField>

        <FormField id="departmentId" label="Department" error={errors.departmentId?.message}>
          <NativeSelect
            id="departmentId"
            className="w-full"
            {...invalid('departmentId')}
            {...register('departmentId', { required: 'Choose a department' })}
          >
            <NativeSelectOption value="">Choose…</NativeSelectOption>
            {meta.departments.map((department) => (
              <NativeSelectOption key={department.id} value={department.id}>
                {department.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        <FormField id="levelId" label="Level" error={errors.levelId?.message}>
          <NativeSelect
            id="levelId"
            className="w-full"
            {...invalid('levelId')}
            {...register('levelId', { required: 'Choose a level' })}
          >
            <NativeSelectOption value="">Choose…</NativeSelectOption>
            {meta.levels.map((level) => (
              <NativeSelectOption key={level.id} value={level.id}>
                {level.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>

        {!employee && (
          <>
            <FormField id="countryCode" label="Country" error={errors.countryCode?.message}>
              <NativeSelect
                id="countryCode"
                className="w-full"
                {...invalid('countryCode')}
                {...register('countryCode', { required: 'Choose a country' })}
              >
                <NativeSelectOption value="">Choose…</NativeSelectOption>
                {meta.countries.map((country) => (
                  <NativeSelectOption key={country.code} value={country.code}>
                    {country.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>

            <FormField id="hireDate" label="Hire date" error={errors.hireDate?.message}>
              <Input
                id="hireDate"
                type="date"
                max={todayIsoDate()}
                {...invalid('hireDate')}
                {...register('hireDate', {
                  required: 'Enter a hire date',
                  validate: (value) =>
                    value <= todayIsoDate() || 'Hire date cannot be in the future',
                })}
              />
            </FormField>

            <FormField
              id="salary"
              label={currencyCode ? `Monthly salary (${currencyCode})` : 'Monthly salary'}
              error={errors.salary?.message}
            >
              <Input
                id="salary"
                inputMode="decimal"
                {...invalid('salary')}
                {...register('salary', {
                  required: 'Enter a monthly salary',
                  validate: (value) =>
                    (AMOUNT_PATTERN.test(value.trim()) && Number(value) > 0) ||
                    'Enter an amount greater than zero, with at most 2 decimal places',
                })}
              />
            </FormField>
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </Button>
      </DialogFooter>
    </form>
  );
}
