import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { serverSchema } from './config/server.js'
import { logSchema } from './config/log.js'
import { postgresSchema } from './config/postgres.js'

convict.addFormats(convictFormatWithValidator)

const config = convict({
  ...serverSchema,
  ...logSchema,
  ...postgresSchema
})

config.validate({ allowed: 'strict' })

export { config }
