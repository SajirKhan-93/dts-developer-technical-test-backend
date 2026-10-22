const BOOM_ERROR_CODES = {
  400: 'BAD_REQUEST',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE'
}

/**
 * Hapi onPreResponse extension that rewrites framework errors (unknown route,
 * malformed JSON, wrong method...) into the same { errors: [...] } shape the
 * route handlers use, so API clients only ever parse one error format.
 */
export function boomToErrorResponse(request, h) {
  const { response } = request

  if (!response.isBoom) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const isServerError = statusCode >= 500

  if (isServerError) {
    request.logger?.error(response)
  }

  return h
    .response({
      errors: [
        {
          errorCode:
            BOOM_ERROR_CODES[statusCode] ??
            (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED'),
          message: isServerError
            ? 'Internal server error'
            : response.output.payload.message,
          field: null
        }
      ]
    })
    .code(statusCode)
}
