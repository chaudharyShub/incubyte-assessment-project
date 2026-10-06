import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Employee, EmployeeSort, SortOrder } from '@/api/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/format';
import { StatusBadge } from './StatusBadge';

interface Props {
  employees: Employee[];
  sort: EmployeeSort;
  order: SortOrder;
  onSort: (sort: EmployeeSort, order: SortOrder) => void;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

export function EmployeeTable({ employees, sort, order, onSort }: Props) {
  const navigate = useNavigate();

  function sortableHead(column: EmployeeSort, label: string, className?: string): ReactNode {
    const active = sort === column;
    const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead aria-sort={active ? ARIA_SORT[order] : 'none'} className={className}>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
          // A second click on the active column reverses it.
          onClick={() => onSort(column, active && order === 'asc' ? 'desc' : 'asc')}
        >
          {label}
          <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      </TableHead>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {sortableHead('name', 'Name')}
          <TableHead>Job title</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Country</TableHead>
          {sortableHead('hireDate', 'Hire date')}
          {sortableHead('salary', 'Monthly salary', 'text-right [&>button]:flex-row-reverse')}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow
            key={employee.id}
            className="cursor-pointer"
            onClick={(event) => {
              // The name stays a real link, for keyboard and new-tab use, and handles its own clicks.
              if (event.target instanceof Element && event.target.closest('a')) return;
              navigate(`/employees/${employee.id}`);
            }}
          >
            <TableCell>
              <Link
                to={`/employees/${employee.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {employee.name}
              </Link>
              <div className="text-xs text-muted-foreground">{employee.email}</div>
            </TableCell>
            <TableCell>{employee.jobTitle}</TableCell>
            <TableCell>{employee.departmentName}</TableCell>
            <TableCell>{employee.levelName}</TableCell>
            <TableCell>{employee.countryName}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(employee.hireDate)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(employee.salary, employee.currencyCode)}
              {employee.currencyCode !== 'INR' && (
                <div className="text-xs text-muted-foreground">
                  {formatMoney(employee.salaryInr, 'INR')}
                </div>
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={employee.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
