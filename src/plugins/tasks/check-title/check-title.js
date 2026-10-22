import { TaskService } from '../services/task-service.js'
import { HTTP_STATUS } from '../../../common/constants/index.js'
import { checkTitleSchema } from '../schema.js'
import { validationFailAction } from '../../../common/helpers/validation-fail-action.js'
import { handleError } from '../../../common/helpers/error-handler.js'
import {
  buildSuccessResponse,
  buildValidationErrorResponse
} from '../../../common/helpers/response-builder.js'

const checkTitle = {
  method: 'POST',
  path: '/api/v1/tasks/check-title',
  options: {
    description: 'Check if a task title already exists',
    notes:
      'Titles must be unique (ignoring case and repeated spaces). Returns 200 when the title is free, or 400 with a TASK_TITLE_DUPLICATE validation error. Send id to ignore that task.',
    tags: ['api', 'tasks'],
    validate: {
      payload: checkTitleSchema,
      failAction: validationFailAction
    },
    plugins: {
      'hapi-swagger': {
        responses: {
          200: { description: 'Title is available' },
          400: { description: 'Title is invalid or already used' }
        }
      }
    }
  },
  handler: async (request, h) => {
    try {
      const taskService = new TaskService(request.prisma, request.server.logger)

      const result = await taskService.checkDuplicateTitle(request.payload)

      if (!result.isValid) {
        return buildValidationErrorResponse(h, HTTP_STATUS.BAD_REQUEST, [
          result.errors
        ])
      }

      return buildSuccessResponse(h, {
        title: request.payload.title,
        valid: true
      })
    } catch (error) {
      return handleError(
        error,
        request,
        h,
        'TASK_TITLE_CHECK_FAILED',
        'Failed to check task title'
      )
    }
  }
}

export default checkTitle
