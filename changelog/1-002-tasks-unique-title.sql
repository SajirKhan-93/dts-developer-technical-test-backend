-- Titles must be unique, ignoring case. Earlier duplicates (if any) keep the
-- oldest task as is; each later one gets " (<id>)" appended so nothing is lost.
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(title) ORDER BY id) AS position
    FROM tasks
)
UPDATE tasks
SET title = LEFT(tasks.title, 230) || ' (' || tasks.id || ')'
FROM ranked
WHERE ranked.id = tasks.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_title_lower ON tasks (LOWER(title));
