import type { CSSProperties } from 'react';
import type { Employee, PeerComparison } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import { usePeerComparison } from './api';

function headline(difference: number): string {
  if (difference === 0) return 'At the median';
  return `${Math.abs(difference).toFixed(1)}% ${difference > 0 ? 'above' : 'below'} the median`;
}

/** Where `value` falls between `min` and `max`, as a percentage of the way along. */
function positionBetween(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

interface FigureProps {
  label: string;
  value: string;
  className?: string;
  style?: CSSProperties;
}

function Figure({ label, value, className, style }: FigureProps) {
  return (
    <div className={className} style={style}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Comparison({ employee, peers }: { employee: Employee; peers: PeerComparison }) {
  const money = (amount: string) => formatMoney(amount, peers.currencyCode);
  const [min, max] = [Number(peers.min), Number(peers.max)];
  const salaryAt = positionBetween(Number(employee.salary), min, max);
  const medianAt = positionBetween(Number(peers.median), min, max);

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-2xl font-semibold">{headline(peers.differenceFromMedianPercent)}</p>
        <p className="text-sm text-muted-foreground">
          Among {peers.peerCount.toLocaleString('en-IN')} active {employee.levelName} employees in{' '}
          {employee.countryName}
        </p>
      </div>

      {/* The same figures are in the text around it, so the picture is hidden from screen readers. */}
      <div className="relative h-8" aria-hidden="true">
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-muted" />
        <div
          className="absolute top-1.5 h-5 w-0.5 -translate-x-1/2 bg-muted-foreground"
          style={{ left: `${medianAt}%` }}
        />
        <div
          className="absolute top-2 size-4 -translate-x-1/2 rounded-full bg-(--viz-series-1) ring-2 ring-card"
          style={{ left: `${salaryAt}%` }}
        />
      </div>

      <dl className="relative flex justify-between text-sm">
        <Figure label="Lowest" value={money(peers.min)} />
        <Figure
          label="Median"
          value={money(peers.median)}
          className="absolute -translate-x-1/2 text-center"
          // Sits under its mark on the bar, but never so far out that it runs into the ends.
          style={{ left: `${Math.min(80, Math.max(20, medianAt))}%` }}
        />
        <Figure label="Highest" value={money(peers.max)} className="text-right" />
      </dl>
    </div>
  );
}

/**
 * How an active employee's salary compares with active employees in the same
 * country and level. Peers share a currency, so nothing is converted.
 */
export function PeerComparisonCard({ employee }: { employee: Employee }) {
  const peers = usePeerComparison(employee.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compared to peers</CardTitle>
      </CardHeader>
      <CardContent>
        {peers.isPending && <Skeleton className="h-28 w-full" />}
        {peers.isError && (
          <p className="text-sm text-destructive">We could not load the peer comparison.</p>
        )}
        {peers.data === null && (
          <p className="text-sm text-muted-foreground">
            There are too few active {employee.levelName} employees in {employee.countryName} to
            compare with.
          </p>
        )}
        {peers.data && <Comparison employee={employee} peers={peers.data} />}
      </CardContent>
    </Card>
  );
}
