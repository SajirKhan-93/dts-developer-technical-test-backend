# HMCTS Task Manager - Backend (HapiJS)

A Node.js/HapiJS REST API for caseworker tasks: Hapi plugins per feature, Joi validation, Prisma over PostgreSQL, convict config, pino logging, hapi-swagger docs, Vitest tests.

Runs on **http://localhost:3001**.

## Set up from scratch

Start here if you have nothing installed. You need Node.js and a PostgreSQL server with an empty database called `hmcts_database`. The `tasks` table is created for you when the backend starts.

**1. Install Node.js 24 or newer** from https://nodejs.org (check with `node -v`).

**2. Get a PostgreSQL server.** Pick one:

- **Installer (Windows/macOS/Linux):** download PostgreSQL 16 or newer from https://www.postgresql.org/download/ and run it with the defaults (port `5432`). The installer asks you to choose a password for the `postgres` user. Remember it. On Windows you can also run `winget install PostgreSQL.PostgreSQL.17`.
- **Docker:** this creates the server _and_ the database in one step, so skip step 3:

  ```powershell
  docker run --name hmcts-postgres -e POSTGRES_PASSWORD=<choose a password> -e POSTGRES_DB=hmcts_database -p 5432:5432 -d postgres:17
  ```

Check the server is running: on Windows open **Services** and look for `postgresql-x64-<version>` with status Running (`docker ps` for Docker).

**3. Create the database** (not needed with Docker). Either use `psql`:

```powershell
# Windows: psql is in C:\Program Files\PostgreSQL\<version>\bin if it is not on your PATH
psql -U postgres -h localhost -c "CREATE DATABASE hmcts_database;"
```

or open **pgAdmin** (installed with PostgreSQL), connect to the server, right-click **Databases > Create > Database**, name it `hmcts_database` and save.

**4. Install the dependencies** (in this folder):

```powershell
npm install
```

**5. Start the backend** with your `postgres` password, as described below. The first start creates the `tasks` table from the SQL files in `changelog/`; later starts leave existing data alone.

**6. Check it.** Open http://localhost:3001/documentation, or http://localhost:3001/health-detailed (which queries the database).

| Problem                                    | Likely cause                                                   |
| ------------------------------------------ | -------------------------------------------------------------- |
| `password authentication failed`           | `DB_PASSWORD` does not match the `postgres` password you chose |
| `database "hmcts_database" does not exist` | Step 3 was skipped                                             |
| `ECONNREFUSED 127.0.0.1:5432`              | The PostgreSQL server is not running, or is on another port    |
| `EADDRINUSE`                               | Something is already using port 3001 (stop the old process)    |

Tests need none of this: `npm test` runs without a database.

## Run it

### From VS Code (recommended)

Open this folder in VS Code (or the parent `Code Challenge` folder, which has the same launch settings), run `npm install` once, then open **Run and Debug** and start **Backend: run (port 3001)** (F5). The database settings, including the password, are in `.vscode/launch.json` (in whichever folder you opened), so there is nothing to type. Replace `DB_PASSWORD` there with your `postgres` password. Breakpoints work.

The same file has **Backend: apply database changelog** and **Backend: run tests**. To start the backend and frontend together, open the parent `Code Challenge` folder (or `hmcts-own.code-workspace`) and run **Backend + Frontend**.

If VS Code uses an old Node version, restart it so it picks up Node 24.

### From a terminal

```powershell
npm install
$env:DB_PASSWORD = "<your postgres password>"
npm run dev
```

Both ways apply the SQL files in `changelog/` before the server starts (safe to repeat; `npm run db:migrate` does it on its own). The terminal route runs it with `node --watch`.

| Variable              | Default          | Notes                                                                           |
| --------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `PORT`                | `3001`           |                                                                                 |
| `DB_HOST`             | `127.0.0.1`      |                                                                                 |
| `DB_PORT`             | `5432`           |                                                                                 |
| `DB_DATABASE`         | `hmcts_database` |                                                                                 |
| `DB_USERNAME`         | `postgres`       |                                                                                 |
| `DB_PASSWORD`         | empty            | Set in `.vscode/launch.json`, or a git-ignored `.env` file.                     |
| `DB_MIGRATE_ON_START` | `false`          | `true` applies `changelog/` when the server starts (the launch config sets it). |
| `LOG_LEVEL`           | `info`           |                                                                                 |

`.vscode/launch.json` contains a local development password. Change it, or keep it out of version control, before sharing the project anywhere public.

## API

Swagger UI: http://localhost:3001/documentation (OpenAPI JSON: `/swagger.json`)

| Method   | Path                          | Description                                                   | Success            |
| -------- | ----------------------------- | ------------------------------------------------------------- | ------------------ |
| `POST`   | `/api/v1/tasks`               | Create a task                                                 | `201` + `Location` |
| `POST`   | `/api/v1/tasks/check-title`   | Check a title is not already used                             | `200`              |
| `GET`    | `/api/v1/tasks`               | All tasks, newest created first. Optional `?search=` by title | `200`              |
| `GET`    | `/api/v1/tasks/{id}`          | Get a task                                                    | `200`              |
| `PATCH`  | `/api/v1/tasks/{id}/status`   | Update the status                                             | `200`              |
| `DELETE` | `/api/v1/tasks/{id}`          | Delete a task                                                 | `204`              |
| `GET`    | `/health`, `/health-detailed` | Health checks (the second queries the DB)                     | `200`              |

Task fields: `title` (required, max 255, **unique**), `description` (optional, max 2000), `status` (`TODO` | `IN_PROGRESS` | `COMPLETED`, defaults to `TODO`), `dueDateTime` (required, `yyyy-MM-ddTHH:mm[:ss]`, no timezone).

**Unique titles.** Titles are compared ignoring case, leading/trailing spaces and repeated spaces, and are stored with repeated spaces collapsed. `POST /api/v1/tasks` returns `409 TASK_TITLE_DUPLICATE` for a title that is taken. A unique index on `LOWER(title)` (`changelog/1-002`) also catches two requests racing. `POST /api/v1/tasks/check-title` with `{ "title": "..." }` (and optionally `id` to ignore one task) lets a client ask first: `200 { title, valid: true }`, or `400` with `validationErrors: [{ errorCode: "TASK_TITLE_DUPLICATE", ... }]`.

**Search.** `GET /api/v1/tasks?search=bundle` returns the tasks whose title contains the text (case-insensitive). Without `search` it returns every task. The response is an array:

```json
[
  {
    "id": 7,
    "title": "Review bundle",
    "description": null,
    "status": "TODO",
    "dueDateTime": "2026-11-30T17:00:00",
    "createdAt": "2026-10-22T15:42:44.000Z"
  }
]
```

```powershell
curl.exe -X POST http://localhost:3001/api/v1/tasks -H "Content-Type: application/json" -d '{\"title\":\"Review bundle\",\"dueDateTime\":\"2026-11-30T17:00:00\"}'
```

### Errors

Errors come in two shapes. Validation failures return every problem at once, with the Joi message as an error code:

```json
{
  "validationErrors": [{ "field": "title", "errorCode": "TASK_TITLE_REQUIRED" }]
}
```

Everything else (not found, malformed JSON, unknown route, unexpected failure):

```json
{
  "errors": [
    {
      "errorCode": "TASK_NOT_FOUND",
      "message": "Task with id 9 not found",
      "field": "id"
    }
  ]
}
```

| Status | When                                                           |
| ------ | -------------------------------------------------------------- |
| `400`  | Validation failure, malformed JSON, non-numeric id, bad search |
| `404`  | No task with that id, or unknown route                         |
| `409`  | The title is already used by another task                      |
| `500`  | Unexpected failure (details are logged, never returned)        |

## Where things are

```
src/index.js, server.js, config.js, config/*.js   entry, Hapi server, convict schemas
src/common/                                       constants, errors, helpers (fail-action, error-handler...)
src/plugins/tasks/                                the feature plugin
    index.js                                      registers the routes
    schema.js                                     Joi schemas (error codes as messages)
    create-task/ list-tasks/ get-task/ ...        one folder per route: { method, path, options, handler }
    services/task-service.js                      business logic + Prisma calls
    helpers/task-utils.js                         date parsing and response shaping
src/plugins/database/prisma.js                    Prisma + pg pool plugin (decorates request.prisma)
src/plugins/database/helpers/migrate.js           applies changelog/*.sql
prisma/schema.prisma, changelog/                  data model and SQL schema
```

`changelog/1-001-tasks.sql` uses `CREATE TABLE IF NOT EXISTS`, so it also works against a database that already has the `tasks` table from the Java version of this project (same columns). `changelog/1-002` first renames any existing duplicate titles (the oldest keeps its title, later ones get ` (<id>)` added) and then adds the unique index. The Java version does not check for duplicates, so against the same database it would now fail on a duplicate title. `changelog/1-003` adds a `created_at` column (UTC wall-clock time, filled by the database); tasks that already existed got the time the changelog ran. The list is ordered by `created_at` then `id`, newest first, and each task in the API has a `createdAt` field (an ISO-8601 UTC time such as `2026-10-22T15:42:44.000Z`; the frontend does not display it).

## Tests

```powershell
npm test          # Vitest with coverage; no database needed
npm run lint
npm run format:check
```

Route tests run the real Hapi lifecycle against an in-memory stand-in for Prisma (`src/common/test-helpers/fake-prisma.js`).

Tests sit next to the file they test: one `*.test.js` per route handler (`create-task.test.js`, ...), the service, schemas, helpers, the Prisma plugin, the migration runner, `server.js`, `start-server.js` and so on. `tasks-routes.test.js` is the end-to-end test of the routes through Hapi.
