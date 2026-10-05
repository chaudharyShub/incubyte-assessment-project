-- Up Migration

CREATE TABLE users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Down Migration

DROP TABLE users;
