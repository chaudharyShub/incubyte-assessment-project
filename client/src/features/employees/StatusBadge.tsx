import type { EmployeeStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return status === 'active' ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
      Active
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">Inactive</Badge>
  );
}
