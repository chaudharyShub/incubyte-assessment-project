import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PAGE_SIZE, useEmployees, useMeta } from './api';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeeTable } from './EmployeeTable';
import { Pagination } from './Pagination';
import { useListParams } from './use-list-params';

export function EmployeesPage() {
  const { params, update } = useListParams();
  const meta = useMeta();
  const employees = useEmployees(params);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const page = employees.data;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Button onClick={() => setAdding(true)} disabled={!meta.data}>
          Add employee
        </Button>
      </div>

      <EmployeeFilters params={params} meta={meta.data} onChange={update} />

      {employees.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            We could not load the employees.
            <Button variant="outline" size="sm" onClick={() => employees.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {employees.isPending && (
        <div className="grid gap-2" aria-busy="true" aria-label="Loading employees">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {page && (
        <>
          <Card className="py-0">
            <CardContent
              // Dimmed while a new page or filter is loading over the previous rows.
              className={cn('px-0 transition-opacity', employees.isPlaceholderData && 'opacity-60')}
            >
              {page.items.length > 0 ? (
                <EmployeeTable
                  employees={page.items}
                  sort={params.sort}
                  order={params.order}
                  onSort={(sort, order) => update({ sort, order })}
                />
              ) : (
                <p className="p-8 text-center text-muted-foreground">
                  No employees match your search and filters.
                </p>
              )}
            </CardContent>
          </Card>

          <Pagination
            page={page.page}
            pageSize={PAGE_SIZE}
            total={page.total}
            onPageChange={(next) => update({ page: next })}
          />
        </>
      )}

      {meta.data && (
        <EmployeeFormDialog
          open={adding}
          onOpenChange={setAdding}
          meta={meta.data}
          onSaved={(employee) => navigate(`/employees/${employee.id}`)}
        />
      )}
    </div>
  );
}
