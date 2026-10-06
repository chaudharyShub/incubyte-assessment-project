import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format';
import { useSalaryStats, type InsightsGroupBy } from './api';
import { SalaryStatsChart } from './SalaryStatsChart';

interface Props {
  groupBy: InsightsGroupBy;
  /** How the grouping reads in a heading and a column header, e.g. "country". */
  noun: string;
}

/** Salary statistics for one grouping: a chart of the medians, and every figure in a table. */
export function SalaryStatsSection({ groupBy, noun }: Props) {
  const stats = useSalaryStats(groupBy);
  const title = `Salary by ${noun}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          Median monthly salary in INR, with the full figures alongside.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.isPending && <Skeleton className="h-48 w-full" aria-label={`Loading ${title}`} />}

        {stats.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              We could not load these figures.
              <Button variant="outline" size="sm" onClick={() => stats.refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {stats.data?.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">There are no active employees.</p>
        )}

        {stats.data && stats.data.length > 0 && (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <SalaryStatsChart groups={stats.data} />

            <Table aria-label={title}>
              <TableHeader>
                <TableRow>
                  <TableHead className="capitalize">{noun}</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Median</TableHead>
                  <TableHead className="text-right">Lowest</TableHead>
                  <TableHead className="text-right">Highest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.data.map((group) => (
                  <TableRow key={group.key}>
                    <TableCell className="font-medium">{group.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {group.headcount.toLocaleString('en-IN')}
                    </TableCell>
                    {[group.averageInr, group.medianInr, group.minInr, group.maxInr].map(
                      (amount, index) => (
                        <TableCell key={index} className="text-right tabular-nums">
                          {formatMoney(amount, 'INR', { decimals: false })}
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
