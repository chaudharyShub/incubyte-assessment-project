import type { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactInr, formatMoney } from '@/lib/format';
import { useInsightsSummary } from './api';
import { SalaryStatsSection } from './SalaryStatsSection';

function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold">{value}</p>
        {detail && <p className="mt-1 text-sm text-muted-foreground tabular-nums">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export function InsightsPage() {
  const summary = useInsightsSummary();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Active employees only. Monthly salaries, converted to INR at fixed exchange rates.
        </p>
      </div>

      {summary.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            We could not load the headcount and payroll.
            <Button variant="outline" size="sm" onClick={() => summary.refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!summary.isError && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile
            label="Headcount"
            value={
              summary.data ? (
                summary.data.headcount.toLocaleString('en-IN')
              ) : (
                <Skeleton className="h-9 w-32" />
              )
            }
          />
          <StatTile
            label="Total monthly payroll"
            value={
              summary.data ? (
                formatCompactInr(Number(summary.data.totalPayrollInr))
              ) : (
                <Skeleton className="h-9 w-32" />
              )
            }
            detail={summary.data && formatMoney(summary.data.totalPayrollInr, 'INR')}
          />
        </div>
      )}

      <SalaryStatsSection groupBy="country" noun="country" />
      <SalaryStatsSection groupBy="department" noun="department" />
      <SalaryStatsSection groupBy="level" noun="level" />
    </div>
  );
}
