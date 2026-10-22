import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import HapiSwagger from 'hapi-swagger'
import { config } from '../../config.js'

/**
 * hapi-swagger reads each registered route's `tags`, `description`, `notes`,
 * and Joi `validate` schemas to auto-generate the OpenAPI spec. Routes must
 * include the 'api' tag to be included.
 *
 * Swagger UI: /documentation   OpenAPI JSON: /swagger.json
 */
const hapiSwaggerOptions = {
  info: {
    title: 'HMCTS Task Manager - Backend API',
    description:
      'RESTful API for creating, retrieving, updating and deleting caseworker tasks.',
    version: config.get('serviceVersion') ?? '1.0.0'
  },
  tags: [
    { name: 'tasks', description: 'Caseworker task management' },
    { name: 'health', description: 'Service health checks' }
  ],
  grouping: 'tags',
  documentationPath: '/documentation',
  jsonPath: '/swagger.json'
}

const swaggerPlugin = {
  name: 'swagger',
  version: '1.0.0',
  async register(server) {
    await server.register([
      Inert,
      Vision,
      { plugin: HapiSwagger, options: hapiSwaggerOptions }
    ])
  }
}

export default swaggerPlugin
