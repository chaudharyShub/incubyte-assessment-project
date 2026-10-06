import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatMoney, formatPercentChange } from '@/lib/format';
import { useEmployee, useMeta, useSalaryHistory } from './api';
import { ChangeSalaryDialog } from './ChangeSalaryDialog';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { PeerComparisonCard } from './PeerComparisonCard';
import { StatusBadge } from './StatusBadge';
import { StatusDialog } from './StatusDialog';

// The charting library is large, so it is only downloaded when there is a chart to draw.
const SalaryHistoryChart = lazy(() =>
  import('./SalaryHistoryChart').then((module) => ({ default: module.SalaryHistoryChart })),
);

type OpenDialog = 'edit' | 'salary' | 'status' | null;

function BackLink() {
  return (
    <Link to="/employees" className="text-sm text-muted-foreground hover:text-foreground">
      ← All employees
    </Link>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function EmployeeDetailPage() {
  const id = Number(useParams().id);
  const employeeQuery = useEmployee(id);
  const history = useSalaryHistory(id);
  const meta = useMeta();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const close = (open: boolean) => !open && setOpenDialog(null);

  if (employeeQuery.isPending) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Loading employee">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (employeeQuery.isError) {
    const notFound =
      employeeQuery.error instanceof ApiError && [400, 404].includes(employeeQuery.error.status);
    return (
      <div className="grid gap-4">
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>
            {notFound ? 'This employee does not exist.' : 'We could not load this employee.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const employee = employeeQuery.data;
  const active = employee.status === 'active';

  return (
    <div className="grid gap-4">
      <BackLink />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          <StatusBadge status={employee.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setOpenDialog('edit')} disabled={!meta.data}>
            Edit details
          </Button>
          <Button variant="outline" onClick={() => setOpenDialog('status')}>
            {active ? 'Mark inactive' : 'Mark active'}
          </Button>
          <Button
            onClick={() => setOpenDialog('salary')}
            disabled={!active}
            title={active ? undefined : 'The salary of an inactive employee cannot be changed'}
          >
            Change salary
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Email">{employee.email}</Detail>
              <Detail label="Job title">{employee.jobTitle}</Detail>
              <Detail label="Department">{employee.departmentName}</Detail>
              <Detail label="Level">{employee.levelName}</Detail>
              <Detail label="Country">{employee.countryName}</Detail>
              <Detail label="Hire date">{formatDate(employee.hireDate)}</Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current monthly salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {formatMoney(employee.salary, employee.currencyCode)}
            </p>
            {employee.currencyCode !== 'INR' && (
              <p className="text-sm text-muted-foreground">
                about {formatMoney(employee.salaryInr, 'INR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peers are active employees, so an inactive employee has nobody to be compared with. */}
      {active && <PeerComparisonCard employee={employee} />}

      <Card>
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {history.isPending && <Skeleton className="h-24 w-full" />}
          {history.isError && (
            <p className="text-sm text-destructive">We could not load the salary history.</p>
          )}
          {/* A single record is one flat line, which says nothing the table does not. */}
          {history.data && history.data.length > 1 && (
            <Suspense fallback={<Skeleton className="h-50 w-full" />}>
              <SalaryHistoryChart history={history.data} />
            </Suspense>
          )}
          {history.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead className="text-right">Monthly salary</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((record, index) => {
                  const previous = history.data[index + 1];
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {formatDate(record.effectiveDate)}
                        {index === 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">Current</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(record.amount, record.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {previous
                          ? formatPercentChange(previous.amount, record.amount)
                          : 'Starting salary'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta.data && (
        <EmployeeFormDialog
          open={openDialog === 'edit'}
          onOpenChange={close}
          meta={meta.data}
          employee={employee}
          onSaved={() => setOpenDialog(null)}
        />
      )}
      <ChangeSalaryDialog open={openDialog === 'salary'} onOpenChange={close} employee={employee} />
      <StatusDialog open={openDialog === 'status'} onOpenChange={close} employee={employee} />
    </div>
  );
}
