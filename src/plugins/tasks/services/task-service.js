import { ConflictError, NotFoundError } from '../../../common/errors/index.js'
import {
  TASK_ERROR_CODES,
  TASK_STATUS
} from '../../../common/constants/index.js'
import { parseLocalDateTime } from '../helpers/task-utils.js'

const PRISMA_UNIQUE_VIOLATION = 'P2002'

/** Trims and collapses runs of whitespace so 'Review  bundle' and 'Review bundle' match */
export function normaliseTitle(title) {
  return title.trim().replaceAll(/\s+/g, ' ')
}

function duplicateTitleError() {
  return new ConflictError(
    'A task with this title already exists',
    TASK_ERROR_CODES.TITLE_DUPLICATE,
    'title'
  )
}

export class TaskService {
  constructor(prisma, logger) {
    this.prisma = prisma
    this.logger = logger
  }

  /**
   * Checks whether a task already uses this title (case-insensitive).
   * @param {Object} payload - Contains title and an optional id of a task to ignore
   * @returns {Promise<{isValid: boolean, errors?: Object}>}
   */
  async checkDuplicateTitle({ title, id }) {
    this.logger.info('Checking if task title exists')

    const where = {
      title: { equals: normaliseTitle(title), mode: 'insensitive' }
    }
    if (id) {
      where.id = { not: BigInt(id) }
    }

    const existing = await this.prisma.tasks.findFirst({
      where,
      select: { id: true }
    })

    if (existing) {
      const { code, message, field } = duplicateTitleError().toJSON()
      return { isValid: false, errors: { errorCode: code, message, field } }
    }

    return { isValid: true }
  }

  async createTask({ title, description, status, dueDateTime }) {
    this.logger.info('Creating task')

    const normalisedTitle = normaliseTitle(title)

    const duplicate = await this.checkDuplicateTitle({ title: normalisedTitle })
    if (!duplicate.isValid) {
      throw duplicateTitleError()
    }

    try {
      return await this.prisma.tasks.create({
        data: {
          title: normalisedTitle,
          description: description || null,
          status: status ?? TASK_STATUS.TODO,
          due_date_time: parseLocalDateTime(dueDateTime)
        }
      })
    } catch (error) {
      // Two requests with the same title can both pass the check above
      if (error.code === PRISMA_UNIQUE_VIOLATION) {
        throw duplicateTitleError()
      }
      throw error
    }
  }

  async getTaskById(id) {
    this.logger.info({ id }, 'Fetching task')

    const task = await this.prisma.tasks.findUnique({
      where: { id: BigInt(id) }
    })

    if (!task) {
      throw new NotFoundError(
        `Task with id ${id} not found`,
        TASK_ERROR_CODES.NOT_FOUND,
        'id'
      )
    }

    return task
  }

  /**
   * Lists tasks, newest created first, optionally filtered by a title search.
   * @param {Object} [params]
   * @param {string} [params.search] - Case-insensitive text to find in the title
   * @returns {Promise<Array>}
   */
  async getTasks({ search } = {}) {
    const searchTerm = search?.trim()
    const where = searchTerm
      ? { title: { contains: searchTerm, mode: 'insensitive' } }
      : {}

    this.logger.info({ search: searchTerm }, 'Fetching tasks')

    return this.prisma.tasks.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
    })
  }

  async updateTaskStatus(id, status) {
    await this.getTaskById(id)

    this.logger.info({ id, status }, 'Updating task status')

    return this.prisma.tasks.update({
      where: { id: BigInt(id) },
      data: { status }
    })
  }

  async deleteTask(id) {
    await this.getTaskById(id)

    this.logger.info({ id }, 'Deleting task')

    await this.prisma.tasks.delete({ where: { id: BigInt(id) } })
  }
}
