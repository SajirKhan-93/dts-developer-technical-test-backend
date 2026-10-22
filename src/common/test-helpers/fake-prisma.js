/**
 * Minimal in-memory stand-in for the Prisma `tasks` delegate, so route tests
 * can run the real Hapi lifecycle (validation, handlers, serialising) without
 * a database. It supports just the query shapes TaskService uses, and
 * enforces the case-insensitive unique title index like PostgreSQL does.
 */
export function createFakePrisma() {
  const rows = new Map()
  let nextId = 1n

  const matches = (row, where = {}) => {
    const { title, id } = where

    if (
      title?.equals !== undefined &&
      row.title.toLowerCase() !== title.equals.toLowerCase()
    ) {
      return false
    }
    if (
      title?.contains !== undefined &&
      !row.title.toLowerCase().includes(title.contains.toLowerCase())
    ) {
      return false
    }
    return !(id?.not !== undefined && row.id === id.not)
  }

  const sorted = (where) =>
    [...rows.values()]
      .filter((row) => matches(row, where))
      .sort((a, b) => b.created_at - a.created_at || Number(b.id - a.id))

  return {
    tasks: {
      create: async ({ data }) => {
        const isDuplicate = [...rows.values()].some(
          (row) => row.title.toLowerCase() === data.title.toLowerCase()
        )
        if (isDuplicate) {
          throw Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002'
          })
        }
        // The database fills created_at; here each task is one second after the last
        const row = {
          id: nextId,
          created_at: new Date(Date.UTC(2026, 0, 1) + Number(nextId) * 1000),
          ...data
        }
        nextId++
        rows.set(row.id, row)
        return row
      },
      findUnique: async ({ where }) => rows.get(where.id) ?? null,
      findFirst: async ({ where }) => sorted(where)[0] ?? null,
      findMany: async ({ where, skip = 0, take } = {}) =>
        sorted(where).slice(skip, take === undefined ? undefined : skip + take),
      count: async ({ where } = {}) => sorted(where).length,
      update: async ({ where, data }) => {
        const row = rows.get(where.id)
        Object.assign(row, data)
        return row
      },
      delete: async ({ where }) => {
        rows.delete(where.id)
      }
    }
  }
}
