import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { createTaskSchema } from '../schema.js'
import { serializeTask } from '../helpers/task-utils.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'

const createTask = {
  method: 'POST',
  path: '/api/v1/tasks',
  options: {
    description: 'Create a task',
    notes:
      'Creates a task. title and dueDateTime (yyyy-MM-ddTHH:mm:ss) are required; description is optional; status defaults to TODO.',
    tags: ['api', 'tasks'],
    validate: {
      payload: createTaskSchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          201: { description: 'Task created' },
          400: { description: 'Validation failed' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const taskService = new TaskService(request.prisma, request.server.logger)

      const task = serializeTask(await taskService.createTask(request.payload))

      return h
        .response(task)
        .code(HTTP_STATUS.CREATED)
        .header('Location', `/api/v1/tasks/${task.id}`)
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_CREATION_FAILED',
        'Failed to create task'
      )
    }
  }
}

export default createTask
