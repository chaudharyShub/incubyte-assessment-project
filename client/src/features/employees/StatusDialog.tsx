import type { Employee } from '@/api/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateEmployee } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

/** Asks for confirmation before marking an employee inactive, or active again. */
export function StatusDialog({ open, onOpenChange, employee }: Props) {
  const update = useUpdateEmployee(employee.id);
  const deactivating = employee.status === 'active';

  function confirm() {
    update.mutate(
      { status: deactivating ? 'inactive' : 'active' },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {deactivating ? `Mark ${employee.name} inactive?` : `Mark ${employee.name} active?`}
          </DialogTitle>
          <DialogDescription>
            {deactivating
              ? 'They will stay in the employee list with their salary history, but will no longer count towards headcount, payroll or salary statistics.'
              : 'They will count towards headcount, payroll and salary statistics again.'}
          </DialogDescription>
        </DialogHeader>

        {update.isError && (
          <Alert variant="destructive">
            <AlertDescription>{update.error.message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            variant={deactivating ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={update.isPending}
          >
            {deactivating ? 'Mark inactive' : 'Mark active'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
