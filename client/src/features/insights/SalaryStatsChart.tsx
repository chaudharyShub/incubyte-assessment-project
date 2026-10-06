import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactInr, formatMoney } from '@/lib/format';
import type { SalaryStatsGroup } from './api';

interface ChartRow extends SalaryStatsGroup {
  median: number;
}

const ROW_HEIGHT = 44;
const AXIS_HEIGHT = 36;
const BAR_THICKNESS = 18;
const TEXT_STYLE = { fill: 'var(--muted-foreground)', fontSize: 12 };

/** The props Recharts passes to a custom tooltip; only these two are used. */
interface StatsTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

function StatsTooltip({ active, payload }: StatsTooltipProps) {
  const group = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !group) return null;

  const rows: [string, string][] = [
    ['Median', formatMoney(group.medianInr, 'INR')],
    ['Average', formatMoney(group.averageInr, 'INR')],
    ['Lowest', formatMoney(group.minInr, 'INR')],
    ['Highest', formatMoney(group.maxInr, 'INR')],
  ];

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{group.label}</p>
      <p className="mb-1 text-xs text-muted-foreground">
        {group.headcount.toLocaleString('en-IN')} active employees
      </p>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 tabular-nums">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Median monthly salary per group as horizontal bars. One series, so one colour
 * and no legend; the heading says what is plotted. Each bar carries its value,
 * and hovering shows the rest of the group's figures.
 */
export function SalaryStatsChart({ groups }: { groups: SalaryStatsGroup[] }) {
  const data: ChartRow[] = groups.map((group) => ({ ...group, median: Number(group.medianInr) }));
  const longestLabel = Math.max(...groups.map((group) => group.label.length));

  return (
    <div aria-hidden="true" style={{ height: groups.length * ROW_HEIGHT + AXIS_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={formatCompactInr}
            tick={TEXT_STYLE}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            // Wide enough for the longest name on one line.
            width={longestLabel * 8 + 16}
            tick={{ ...TEXT_STYLE, fill: 'var(--foreground)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip
            content={<StatsTooltip />}
            cursor={{ fill: 'var(--muted)' }}
            isAnimationActive={false}
          />
          <Bar
            dataKey="median"
            fill="var(--viz-series-1)"
            barSize={BAR_THICKNESS}
            // Rounded at the value end, square where the bar meets the baseline.
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="median"
              position="right"
              formatter={(value) => formatCompactInr(Number(value))}
              style={{ ...TEXT_STYLE, fill: 'var(--foreground)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
