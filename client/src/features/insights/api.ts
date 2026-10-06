import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export type InsightsGroupBy = 'country' | 'department' | 'level';

/** Monthly figures in INR, as decimal strings. Active employees only. */
export interface InsightsSummary {
  headcount: number;
  totalPayrollInr: string;
}

export interface SalaryStatsGroup {
  key: string;
  label: string;
  headcount: number;
  averageInr: string;
  medianInr: string;
  minInr: string;
  maxInr: string;
}

export function useInsightsSummary() {
  return useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: () => api<InsightsSummary>('/insights/summary'),
  });
}

export function useSalaryStats(groupBy: InsightsGroupBy) {
  return useQuery({
    queryKey: ['insights', 'salary-stats', groupBy],
    queryFn: async () =>
      (await api<{ groups: SalaryStatsGroup[] }>(`/insights/salary-stats?groupBy=${groupBy}`))
        .groups,
  });
}
