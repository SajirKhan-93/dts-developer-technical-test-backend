-- Existing tasks get the time this runs. The default is UTC wall-clock time, matching how Prisma stores timestamps.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC');

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC, id DESC);
