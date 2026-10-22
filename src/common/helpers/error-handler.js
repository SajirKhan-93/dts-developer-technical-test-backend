import { BaseError } from '../errors/base-error.js'
import { HTTP_STATUS } from '../constants/index.js'

export function handleError(
  error,
  request,
  h,
  defaultErrorCode = 'OPERATION_FAILED',
  defaultErrorMessage = 'Operation failed'
) {
  request.server.logger.error({ error }, error.message)

  // Handle application errors with status codes
  if (error instanceof BaseError) {
    const errorJson = error.toJSON()
    return h
      .response({
        errors: [
          {
            errorCode: errorJson.code,
            message: errorJson.message,
            field: errorJson.field
          }
        ]
      })
      .code(error.statusCode)
  }

  // Handle generic errors without leaking internals
  return h
    .response({
      errors: [
        {
          errorCode: defaultErrorCode,
          message: defaultErrorMessage,
          field: null
        }
      ]
    })
    .code(HTTP_STATUS.INTERNAL_SERVER_ERROR)
}
