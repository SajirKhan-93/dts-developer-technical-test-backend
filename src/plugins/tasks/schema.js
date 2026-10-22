import Joi from 'joi'

import {
  SIZE,
  TASK_ERROR_CODES,
  TASK_STATUS,
  TASK_STATUSES,
  VALIDATION_ERROR_CODES
} from '../../common/constants/index.js'
import { parseLocalDateTime } from './helpers/task-utils.js'

const objectMessages = {
  'object.base': VALIDATION_ERROR_CODES.VALIDATION_INVALID_OBJECT,
  'object.unknown': VALIDATION_ERROR_CODES.VALIDATION_UNKNOWN_FIELD,
  'any.required': VALIDATION_ERROR_CODES.VALIDATION_INVALID_OBJECT
}

const idSchema = Joi.number()
  .integer()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER)
  .required()
  .messages({
    'any.required': TASK_ERROR_CODES.ID_INVALID,
    'number.base': TASK_ERROR_CODES.ID_INVALID,
    'number.integer': TASK_ERROR_CODES.ID_INVALID,
    'number.min': TASK_ERROR_CODES.ID_INVALID,
    'number.max': TASK_ERROR_CODES.ID_INVALID,
    'number.unsafe': TASK_ERROR_CODES.ID_INVALID
  })

const titleSchema = Joi.string()
  .trim()
  .max(SIZE.LENGTH_255)
  .required()
  .messages({
    'any.required': TASK_ERROR_CODES.TITLE_REQUIRED,
    'string.base': TASK_ERROR_CODES.TITLE_REQUIRED,
    'string.empty': TASK_ERROR_CODES.TITLE_REQUIRED,
    'string.max': TASK_ERROR_CODES.TITLE_TOO_LONG
  })

const descriptionSchema = Joi.string()
  .trim()
  .max(SIZE.LENGTH_2000)
  .allow('', null)
  .optional()
  .messages({
    'string.base': TASK_ERROR_CODES.DESCRIPTION_TOO_LONG,
    'string.max': TASK_ERROR_CODES.DESCRIPTION_TOO_LONG
  })

const statusMessages = {
  'any.only': TASK_ERROR_CODES.STATUS_INVALID,
  'string.base': TASK_ERROR_CODES.STATUS_INVALID,
  'string.empty': TASK_ERROR_CODES.STATUS_INVALID
}

const dueDateTimeSchema = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) =>
    parseLocalDateTime(value) ? value : helpers.error('any.invalid')
  )
  .messages({
    'any.required': TASK_ERROR_CODES.DUE_DATE_TIME_REQUIRED,
    'string.empty': TASK_ERROR_CODES.DUE_DATE_TIME_REQUIRED,
    'string.base': TASK_ERROR_CODES.DUE_DATE_TIME_INVALID,
    'any.invalid': TASK_ERROR_CODES.DUE_DATE_TIME_INVALID
  })

/**
 * Params schema for routes with a task ID
 */
export const taskIdParamsSchema = Joi.object({
  id: idSchema
}).messages(objectMessages)

/**
 * Payload schema for creating a task. Status is optional and defaults to TODO.
 */
export const createTaskSchema = Joi.object({
  title: titleSchema,
  description: descriptionSchema,
  status: Joi.string()
    .valid(...TASK_STATUSES)
    .default(TASK_STATUS.TODO)
    .messages(statusMessages),
  dueDateTime: dueDateTimeSchema
})
  .required()
  .messages(objectMessages)

/**
 * Payload schema for updating the status of a task
 */
export const updateTaskStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...TASK_STATUSES)
    .required()
    .messages({
      ...statusMessages,
      'any.required': TASK_ERROR_CODES.STATUS_REQUIRED
    })
})
  .required()
  .messages(objectMessages)

/**
 * Query schema for listing tasks, optionally filtered by a title search
 */
export const listTasksQuerySchema = Joi.object({
  search: Joi.string()
    .trim()
    .max(SIZE.LENGTH_255)
    .allow('')
    .optional()
    .messages({
      'string.base': TASK_ERROR_CODES.SEARCH_TOO_LONG,
      'string.max': TASK_ERROR_CODES.SEARCH_TOO_LONG
    })
}).messages(objectMessages)

/**
 * Payload schema for checking whether a title is already used.
 * id is optional and excludes that task from the check.
 */
export const checkTitleSchema = Joi.object({
  title: titleSchema,
  id: idSchema.optional()
})
  .required()
  .messages(objectMessages)
