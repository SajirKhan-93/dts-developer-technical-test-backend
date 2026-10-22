import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { taskIdParamsSchema } from '../schema.js'
import { serializeTask } from '../helpers/task-utils.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'

const getTask = {
  method: 'GET',
  path: '/api/v1/tasks/{id}',
  options: {
    description: 'Retrieve a task by ID',
    notes: 'Returns the task, or 404 if it does not exist.',
    tags: ['api', 'tasks'],
    validate: {
      params: taskIdParamsSchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          200: { description: 'Task found' },
          400: { description: 'Invalid ID' },
          404: { description: 'Task not found' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const taskService = new TaskService(request.prisma, request.server.logger)

      const task = await taskService.getTaskById(request.params.id)

      return h.response(serializeTask(task)).code(HTTP_STATUS.OK)
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_RETRIEVAL_FAILED',
        'Failed to retrieve task'
      )
    }
  }
}

export default getTask
