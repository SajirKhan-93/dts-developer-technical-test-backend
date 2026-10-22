import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { listTasksQuerySchema } from '../schema.js'
import { serializeTask } from '../helpers/task-utils.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'

const listTasks = {
  method: 'GET',
  path: '/api/v1/tasks',
  options: {
    description: 'Retrieve all tasks (optionally searched by title)',
    notes:
      'Returns the tasks ordered by creation date/time (newest first). Use search to find tasks whose title contains the text (case-insensitive).',
    tags: ['api', 'tasks'],
    validate: {
      query: listTasksQuerySchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          200: { description: 'List of tasks (empty if none match)' },
          400: { description: 'Invalid search' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const taskService = new TaskService(request.prisma, request.server.logger)

      const tasks = await taskService.getTasks({ search: request.query.search })

      return h.response(tasks.map(serializeTask)).code(HTTP_STATUS.OK)
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_LIST_FAILED',
        'Failed to retrieve tasks'
      )
    }
  }
}

export default listTasks
