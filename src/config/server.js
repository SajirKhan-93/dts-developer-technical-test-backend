import { isProduction } from './environment.js'

const serverSchema = {
  serviceVersion: {
    doc: 'The service version',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'hmcts-dev-test-backend-own'
  },
  swagger: {
    enabled: {
      doc: 'Enable Swagger API documentation UI and JSON spec endpoint',
      format: Boolean,
      default: !isProduction,
      env: 'SWAGGER_ENABLED'
    }
  }
}

export { serverSchema }
