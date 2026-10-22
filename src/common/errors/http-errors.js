import { BaseError } from './base-error.js'
import { HTTP_STATUS } from '../constants/index.js'

/**
 * 400 Bad Request - Invalid request data or business rule violation
 */
export class BadRequestError extends BaseError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', field = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, code, field)
  }
}

/**
 * 404 Not Found - Requested resource does not exist
 */
export class NotFoundError extends BaseError {
  constructor(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    field = null
  ) {
    super(message, HTTP_STATUS.NOT_FOUND, code, field)
  }
}

/**
 * 409 Conflict - Request conflicts with current state (e.g., duplicate record)
 */
export class ConflictError extends BaseError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', field = null) {
    super(message, HTTP_STATUS.CONFLICT, code, field)
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends BaseError {
  constructor(
    message = 'Service unavailable',
    code = 'SERVICE_UNAVAILABLE',
    field = null
  ) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, code, field)
  }
}
