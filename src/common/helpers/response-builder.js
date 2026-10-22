import { HTTP_STATUS } from '../constants/index.js'

/**
 * Builds a validation error response with validationErrors array
 * @param {Object} h - Hapi response toolkit
 * @param {number} statusCode - HTTP status code
 * @param {Array} validationErrors - Array of { field, errorCode, message? } objects
 * @returns {Object} Hapi response
 */
export function buildValidationErrorResponse(h, statusCode, validationErrors) {
  return h.response({ validationErrors }).code(statusCode)
}

/**
 * Builds a success response
 * @param {Object} h - Hapi response toolkit
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (defaults to 200 OK)
 * @returns {Object} Hapi response
 */
export function buildSuccessResponse(h, data, statusCode = HTTP_STATUS.OK) {
  return h.response(data).code(statusCode)
}
