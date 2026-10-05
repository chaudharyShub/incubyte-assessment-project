import type { EmployeeStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return status === 'active' ? (
    <Badge variant="secondary">Active</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  );
}
