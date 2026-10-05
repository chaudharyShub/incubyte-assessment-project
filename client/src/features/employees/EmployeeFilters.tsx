import { useEffect, useState } from 'react';
import type { EmployeeListParams, Meta } from '@/api/types';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useDebouncedValue } from '@/lib/use-debounced-value';

interface Props {
  params: EmployeeListParams;
  meta: Meta | undefined;
  onChange: (changes: Partial<EmployeeListParams>) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export function EmployeeFilters({ params, meta, onChange }: Props) {
  // The box updates on every keystroke; the list is only asked once typing pauses.
  const [search, setSearch] = useState(params.search);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearch !== params.search) onChange({ search: debouncedSearch });
    // Only a settled search term should trigger this, not every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="search"
        aria-label="Search by name or email"
        placeholder="Search by name or email"
        className="w-full sm:w-64"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <NativeSelect
        aria-label="Country"
        value={params.country}
        onChange={(event) => onChange({ country: event.target.value })}
      >
        <NativeSelectOption value="">All countries</NativeSelectOption>
        {meta?.countries.map((country) => (
          <NativeSelectOption key={country.code} value={country.code}>
            {country.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Department"
        value={params.department}
        onChange={(event) => onChange({ department: event.target.value })}
      >
        <NativeSelectOption value="">All departments</NativeSelectOption>
        {meta?.departments.map((department) => (
          <NativeSelectOption key={department.id} value={department.id}>
            {department.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Level"
        value={params.level}
        onChange={(event) => onChange({ level: event.target.value })}
      >
        <NativeSelectOption value="">All levels</NativeSelectOption>
        {meta?.levels.map((level) => (
          <NativeSelectOption key={level.id} value={level.id}>
            {level.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        aria-label="Status"
        value={params.status}
        onChange={(event) => onChange({ status: event.target.value })}
      >
        <NativeSelectOption value="">Any status</NativeSelectOption>
        <NativeSelectOption value="active">Active</NativeSelectOption>
        <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
