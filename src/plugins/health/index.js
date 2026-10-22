import { HTTP_STATUS } from '../../common/constants/index.js'

const healthSimple = {
  method: 'GET',
  path: '/health',
  options: {
    description: 'Simple health check',
    tags: ['api', 'health']
  },
  handler: (_request, h) =>
    h.response({ message: 'success' }).code(HTTP_STATUS.OK)
}

const healthFull = {
  method: 'GET',
  path: '/health-detailed',
  options: {
    description: 'Health check including a database query',
    tags: ['api', 'health']
  },
  handler: async (request, h) => {
    try {
      await request.prisma.$queryRaw`SELECT 1`
      return h
        .response({
          status: 'healthy',
          checks: { postgres: { healthy: true } }
        })
        .code(HTTP_STATUS.OK)
    } catch (error) {
      request.server.logger.error({ error }, 'Postgres health check failed')
      return h
        .response({
          status: 'unhealthy',
          checks: { postgres: { healthy: false } }
        })
        .code(HTTP_STATUS.SERVICE_UNAVAILABLE)
    }
  }
}

const healthPlugin = {
  name: 'health',
  version: '1.0.0',
  register: (server, _options) => {
    server.route([healthSimple, healthFull])
  }
}

export default healthPlugin
export { healthSimple, healthFull }
