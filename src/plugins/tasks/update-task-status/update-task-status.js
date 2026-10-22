import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { taskIdParamsSchema, updateTaskStatusSchema } from '../schema.js'
import { serializeTask } from '../helpers/task-utils.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'

const updateTaskStatus = {
  method: 'PATCH',
  path: '/api/v1/tasks/{id}/status',
  options: {
    description: 'Update the status of a task',
    notes: 'Sets the status to TODO, IN_PROGRESS or COMPLETED.',
    tags: ['api', 'tasks'],
    validate: {
      params: taskIdParamsSchema,
      payload: updateTaskStatusSchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          200: { description: 'Status updated' },
          400: { description: 'Missing or invalid status' },
          404: { description: 'Task not found' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const { id } = request.params
      const { status } = request.payload
      const taskService = new TaskService(request.prisma, request.server.logger)

      const task = await taskService.updateTaskStatus(id, status)

      return h.response(serializeTask(task)).code(HTTP_STATUS.OK)
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_STATUS_UPDATE_FAILED',
        'Failed to update task status'
      )
    }
  }
}

export default updateTaskStatus
