import { HTTP_STATUS } from '../constants/index.js'

/**
 * Reusable validation fail action for Hapi routes.
 * Returns every validation failure as { field, errorCode } with a 400 status.
 * The Joi message of each rule is the error code (see tasks/schema.js).
 *
 * @param {Object} _request - Hapi request object
 * @param {Object} h - Hapi response toolkit
 * @param {Error} error - Joi validation error
 * @returns {Object} Hapi response
 */
export function validationFailAction(_request, h, error) {
  const errors =
    error.details?.map((detail) => ({
      field: detail.path?.join('.') || detail.context?.label || 'unknown',
      errorCode: detail.message
    })) || []

  if (errors.length === 0) {
    errors.push({ field: 'unknown', errorCode: 'VALIDATION_ERROR' })
  }

  return h
    .response({ validationErrors: errors })
    .code(HTTP_STATUS.BAD_REQUEST)
    .takeover()
}
