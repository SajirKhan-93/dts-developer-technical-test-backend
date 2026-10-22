import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { taskIdParamsSchema } from '../schema.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'

const deleteTask = {
  method: 'DELETE',
  path: '/api/v1/tasks/{id}',
  options: {
    description: 'Delete a task',
    notes: 'Deletes the task, or returns 404 if it does not exist.',
    tags: ['api', 'tasks'],
    validate: {
      params: taskIdParamsSchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          204: { description: 'Task deleted' },
          400: { description: 'Invalid ID' },
          404: { description: 'Task not found' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const taskService = new TaskService(request.prisma, request.server.logger)

      await taskService.deleteTask(request.params.id)

      return h.response().code(HTTP_STATUS.NO_CONTENT)
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_DELETE_FAILED',
        'Failed to delete task'
      )
    }
  }
}

export default deleteTask
