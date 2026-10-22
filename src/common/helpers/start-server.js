import { config } from '../../config.js'

import { createServer } from '../../server.js'
import { migrate } from '../../plugins/database/helpers/migrate.js'
import { createLogger } from './logging/logger.js'

async function startServer() {
  if (config.get('postgres.migrateOnStart')) {
    const logger = createLogger()
    await migrate({ log: (message) => logger.info(message) })
  }

  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your backend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
