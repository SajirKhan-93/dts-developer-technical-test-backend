import { describe, test, expect, beforeEach, vi } from 'vitest'
import { TaskService, normaliseTitle } from './task-service.js'
import { ConflictError, NotFoundError } from '../../../common/errors/index.js'

describe('normaliseTitle', () => {
  test('trims and collapses whitespace', () => {
    expect(normaliseTitle('  Review   the \t bundle ')).toBe(
      'Review the bundle'
    )
  })
})

describe('TaskService', () => {
  let prisma
  let service

  beforeEach(() => {
    prisma = {
      tasks: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      }
    }
    service = new TaskService(prisma, { info: vi.fn() })
  })

  describe('checkDuplicateTitle', () => {
    test('looks for the normalised title case-insensitively', async () => {
      await service.checkDuplicateTitle({ title: '  Review   bundle ' })

      expect(prisma.tasks.findFirst).toHaveBeenCalledWith({
        where: { title: { equals: 'Review bundle', mode: 'insensitive' } },
        select: { id: true }
      })
    })

    test('is valid when no task uses the title', async () => {
      await expect(
        service.checkDuplicateTitle({ title: 'T' })
      ).resolves.toEqual({ isValid: true })
    })

    test('returns a TASK_TITLE_DUPLICATE error when a task uses the title', async () => {
      prisma.tasks.findFirst.mockResolvedValue({ id: 4n })

      const result = await service.checkDuplicateTitle({ title: 'T' })

      expect(result.isValid).toBe(false)
      expect(result.errors).toEqual({
        errorCode: 'TASK_TITLE_DUPLICATE',
        message: 'A task with this title already exists',
        field: 'title'
      })
    })

    test('ignores the task with the given id', async () => {
      await service.checkDuplicateTitle({ title: 'T', id: 9 })

      expect(prisma.tasks.findFirst.mock.calls[0][0].where.id).toEqual({
        not: 9n
      })
    })
  })

  describe('createTask', () => {
    test('defaults the status to TODO and stores the due date as a Date', async () => {
      prisma.tasks.create.mockResolvedValue({ id: 1n })

      await service.createTask({
        title: 'T',
        description: '',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(prisma.tasks.create).toHaveBeenCalledWith({
        data: {
          title: 'T',
          description: null,
          status: 'TODO',
          due_date_time: new Date('2026-11-30T17:00:00.000Z')
        }
      })
    })

    test('stores the normalised title', async () => {
      prisma.tasks.create.mockResolvedValue({ id: 1n })

      await service.createTask({
        title: 'Review   bundle',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(prisma.tasks.create.mock.calls[0][0].data.title).toBe(
        'Review bundle'
      )
    })

    test('keeps a supplied status and description', async () => {
      prisma.tasks.create.mockResolvedValue({ id: 1n })

      await service.createTask({
        title: 'T',
        description: 'detail',
        status: 'IN_PROGRESS',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(prisma.tasks.create.mock.calls[0][0].data).toMatchObject({
        description: 'detail',
        status: 'IN_PROGRESS'
      })
    })

    test('throws ConflictError without creating when the title is taken', async () => {
      prisma.tasks.findFirst.mockResolvedValue({ id: 4n })

      await expect(
        service.createTask({ title: 'T', dueDateTime: '2026-11-30T17:00:00' })
      ).rejects.toThrow(ConflictError)
      expect(prisma.tasks.create).not.toHaveBeenCalled()
    })

    test('turns a unique index violation into ConflictError', async () => {
      prisma.tasks.create.mockRejectedValue({ code: 'P2002' })

      await expect(
        service.createTask({ title: 'T', dueDateTime: '2026-11-30T17:00:00' })
      ).rejects.toThrow(ConflictError)
    })

    test('rethrows other database errors', async () => {
      const error = new Error('connection lost')
      prisma.tasks.create.mockRejectedValue(error)

      await expect(
        service.createTask({ title: 'T', dueDateTime: '2026-11-30T17:00:00' })
      ).rejects.toBe(error)
    })
  })

  describe('getTaskById', () => {
    test('returns the task', async () => {
      const task = { id: 1n }
      prisma.tasks.findUnique.mockResolvedValue(task)

      await expect(service.getTaskById(1)).resolves.toBe(task)
      expect(prisma.tasks.findUnique).toHaveBeenCalledWith({
        where: { id: 1n }
      })
    })

    test('throws NotFoundError when the task does not exist', async () => {
      prisma.tasks.findUnique.mockResolvedValue(null)

      await expect(service.getTaskById(99)).rejects.toThrow(NotFoundError)
      await expect(service.getTaskById(99)).rejects.toThrow(
        'Task with id 99 not found'
      )
    })
  })

  describe('getTasks', () => {
    test('returns the tasks, newest created first', async () => {
      const tasks = [{ id: 2n }, { id: 1n }]
      prisma.tasks.findMany.mockResolvedValue(tasks)

      await expect(service.getTasks()).resolves.toBe(tasks)
      expect(prisma.tasks.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
      })
    })

    test('searches titles case-insensitively', async () => {
      prisma.tasks.findMany.mockResolvedValue([])

      await service.getTasks({ search: '  bundle ' })

      expect(prisma.tasks.findMany.mock.calls[0][0].where).toEqual({
        title: { contains: 'bundle', mode: 'insensitive' }
      })
    })

    test('ignores a blank search', async () => {
      prisma.tasks.findMany.mockResolvedValue([])

      await service.getTasks({ search: '   ' })

      expect(prisma.tasks.findMany.mock.calls[0][0].where).toEqual({})
    })
  })

  describe('updateTaskStatus', () => {
    test('updates an existing task', async () => {
      prisma.tasks.findUnique.mockResolvedValue({ id: 1n })
      prisma.tasks.update.mockResolvedValue({ id: 1n, status: 'COMPLETED' })

      const result = await service.updateTaskStatus(1, 'COMPLETED')

      expect(result.status).toBe('COMPLETED')
      expect(prisma.tasks.update).toHaveBeenCalledWith({
        where: { id: 1n },
        data: { status: 'COMPLETED' }
      })
    })

    test('throws NotFoundError without updating when the task is missing', async () => {
      prisma.tasks.findUnique.mockResolvedValue(null)

      await expect(service.updateTaskStatus(5, 'TODO')).rejects.toThrow(
        NotFoundError
      )
      expect(prisma.tasks.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteTask', () => {
    test('deletes an existing task', async () => {
      prisma.tasks.findUnique.mockResolvedValue({ id: 1n })

      await service.deleteTask(1)

      expect(prisma.tasks.delete).toHaveBeenCalledWith({ where: { id: 1n } })
    })

    test('throws NotFoundError without deleting when the task is missing', async () => {
      prisma.tasks.findUnique.mockResolvedValue(null)

      await expect(service.deleteTask(7)).rejects.toThrow(NotFoundError)
      expect(prisma.tasks.delete).not.toHaveBeenCalled()
    })
  })
})
