-- Up Migration

-- Append-only: one row per salary an employee has had, including the current one.
CREATE TABLE salary_history (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id    integer NOT NULL REFERENCES employees (id),
  amount         numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency_code  char(3) NOT NULL REFERENCES currencies (code),
  effective_date date NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salary_history_one_per_day UNIQUE (employee_id, effective_date)
);

ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

-- Down Migration

DROP TABLE salary_history;
