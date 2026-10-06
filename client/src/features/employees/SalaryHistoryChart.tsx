import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SalaryRecord } from '@/api/types';
import { formatDate, formatMoney, todayIsoDate } from '@/lib/format';

interface Point {
  time: number;
  amount: number;
  /** The date the salary shown at this point took effect. */
  effectiveDate: string;
}

const HEIGHT = 200;
const TEXT_STYLE = { fill: 'var(--muted-foreground)', fontSize: 12 };

const toTime = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

/** The props Recharts passes to a custom tooltip; only these two are used. */
interface HistoryTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

interface Currency {
  currencyCode: string;
}

const monthFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function HistoryTooltip({ active, payload, currencyCode }: HistoryTooltipProps & Currency) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium tabular-nums">
        {formatMoney(point.amount.toFixed(2), currencyCode)}
      </p>
      <p className="text-xs text-muted-foreground">since {formatDate(point.effectiveDate)}</p>
    </div>
  );
}

/**
 * Monthly salary over time as a stepped line: flat until a change takes effect,
 * then a jump. One series, so one colour and no legend. The line runs on to
 * today, because the latest salary still applies.
 */
export function SalaryHistoryChart({ history }: { history: SalaryRecord[] }) {
  const currencyCode = history[0]!.currencyCode;
  const oldestFirst = [...history].reverse();
  const latest = oldestFirst.at(-1)!;

  const data: Point[] = oldestFirst.map((record) => ({
    time: toTime(record.effectiveDate),
    amount: Number(record.amount),
    effectiveDate: record.effectiveDate,
  }));
  data.push({
    time: Math.max(toTime(todayIsoDate()), toTime(latest.effectiveDate)),
    amount: Number(latest.amount),
    effectiveDate: latest.effectiveDate,
  });

  return (
    <div aria-hidden="true" style={{ height: HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="time"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time: number) => monthFormat.format(time)}
            tick={TEXT_STYLE}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={48}
          />
          <YAxis
            // Not starting at zero keeps small raises visible.
            domain={['auto', 'auto']}
            tickFormatter={(amount: number) =>
              formatMoney(String(amount), currencyCode, { decimals: false })
            }
            tick={TEXT_STYLE}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip
            content={<HistoryTooltip currencyCode={currencyCode} />}
            cursor={{ stroke: 'var(--border)' }}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="amount"
            stroke="var(--viz-series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
