import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { EmployeeListParams, EmployeeSort, SortOrder } from '@/api/types';

const DEFAULTS: EmployeeListParams = {
  search: '',
  country: '',
  department: '',
  level: '',
  status: '',
  sort: 'name',
  order: 'asc',
  page: 1,
};

const SORTS: readonly string[] = ['name', 'hireDate', 'salary'];

/**
 * The employee list's search, filters, sorting and page, kept in the URL so a
 * view can be bookmarked or shared and the back button undoes a change.
 */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<EmployeeListParams>(() => {
    const text = (key: string) => searchParams.get(key) ?? '';
    const page = Number(searchParams.get('page'));
    return {
      search: text('search'),
      country: text('country'),
      department: text('department'),
      level: text('level'),
      status: text('status'),
      sort: SORTS.includes(text('sort')) ? (text('sort') as EmployeeSort) : DEFAULTS.sort,
      order: (text('order') === 'desc' ? 'desc' : 'asc') as SortOrder,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [searchParams]);

  const update = useCallback(
    (changes: Partial<EmployeeListParams>) => {
      // Changing what is listed starts again from the first page.
      const next = { ...params, page: 1, ...changes };
      const query = new URLSearchParams();
      for (const key of Object.keys(DEFAULTS) as (keyof EmployeeListParams)[]) {
        if (next[key] !== DEFAULTS[key]) query.set(key, String(next[key]));
      }
      setSearchParams(query, { replace: true });
    },
    [params, setSearchParams],
  );

  return { params, update };
}
