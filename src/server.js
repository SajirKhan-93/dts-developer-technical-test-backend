import Hapi from '@hapi/hapi'

import { config } from './config.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { failAction } from './common/helpers/fail-action.js'
import { boomToErrorResponse } from './common/helpers/boom-to-error-response.js'
import { prisma } from './plugins/database/prisma.js'
import healthPlugin from './plugins/health/index.js'
import tasksPlugin from './plugins/tasks/index.js'
import swaggerPlugin from './plugins/swagger/index.js'

function createServerConfig() {
  return {
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  }
}

async function registerCorePlugins(server) {
  // Hapi Plugins:
  // requestLogger - automatically logs incoming requests
  // prisma        - Prisma ORM integration with a pg Pool
  // router        - routes used in the app
  await server.register([
    requestLogger,
    {
      plugin: prisma,
      options: config.get('postgres')
    },
    healthPlugin,
    tasksPlugin
  ])
}

async function registerSwagger(server) {
  // Register swagger after all routes are registered so all routes are included
  if (config.get('swagger.enabled')) {
    await server.register(swaggerPlugin)
  }
}

async function createServer() {
  const server = Hapi.server(createServerConfig())
  await registerCorePlugins(server)
  await registerSwagger(server)
  server.ext('onPreResponse', boomToErrorResponse)
  return server
}

export { createServer }
