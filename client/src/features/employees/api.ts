import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  Employee,
  EmployeeChanges,
  EmployeeListParams,
  EmployeePage,
  Meta,
  NewEmployee,
  SalaryChange,
  SalaryRecord,
} from '@/api/types';

export const PAGE_SIZE = 25;

function toQueryString(params: EmployeeListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '') query.set(key, String(value));
  }
  query.set('pageSize', String(PAGE_SIZE));
  return query.toString();
}

/** Countries, departments and levels. They do not change while the app is open. */
export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: () => api<Meta>('/meta'),
    staleTime: Infinity,
  });
}

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: ['employees', 'list', params],
    queryFn: () => api<EmployeePage>(`/employees?${toQueryString(params)}`),
    // Keep the current rows on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: async () => (await api<{ employee: Employee }>(`/employees/${id}`)).employee,
  });
}

export function useSalaryHistory(id: number) {
  return useQuery({
    queryKey: ['employees', 'detail', id, 'salary-history'],
    queryFn: async () =>
      (await api<{ history: SalaryRecord[] }>(`/employees/${id}/salary-history`)).history,
  });
}

/** After any change, lists and insights are out of date; the saved employee is put straight into the cache. */
function useEmployeeMutation<TInput>(request: (input: TInput) => Promise<{ employee: Employee }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => (await request(input)).employee,
    onSuccess: (employee) => {
      queryClient.setQueryData(['employees', 'detail', employee.id], employee);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['insights'] }),
      ]);
    },
  });
}

export function useCreateEmployee() {
  return useEmployeeMutation((employee: NewEmployee) =>
    api<{ employee: Employee }>('/employees', { method: 'POST', body: employee }),
  );
}

export function useUpdateEmployee(id: number) {
  return useEmployeeMutation((changes: EmployeeChanges) =>
    api<{ employee: Employee }>(`/employees/${id}`, { method: 'PATCH', body: changes }),
  );
}

export function useChangeSalary(id: number) {
  return useEmployeeMutation((change: SalaryChange) =>
    api<{ employee: Employee }>(`/employees/${id}/salary`, { method: 'POST', body: change }),
  );
}
