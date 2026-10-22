const postgresSchema = {
  postgres: {
    host: {
      doc: 'PostgreSQL host',
      format: String,
      default: '127.0.0.1',
      env: 'DB_HOST'
    },
    port: {
      doc: 'PostgreSQL database port',
      format: 'port',
      default: 5432,
      env: 'DB_PORT'
    },
    database: {
      doc: 'PostgreSQL database name',
      format: String,
      default: 'hmcts_database',
      env: 'DB_DATABASE'
    },
    username: {
      doc: 'PostgreSQL username',
      format: String,
      default: 'postgres',
      env: 'DB_USERNAME'
    },
    password: {
      doc: 'PostgreSQL password',
      format: String,
      default: '',
      sensitive: true,
      env: 'DB_PASSWORD'
    },
    migrateOnStart: {
      doc: 'Apply the SQL files in /changelog before the server starts (npm run dev and the VS Code launch configuration turn this on)',
      format: Boolean,
      default: false,
      env: 'DB_MIGRATE_ON_START'
    },
    pool: {
      max: {
        doc: 'Maximum connections in the pool',
        format: 'nat',
        default: 10,
        env: 'POSTGRES_POOL_MAX'
      },
      connectionTimeoutMs: {
        doc: 'Milliseconds before pg times out waiting for a pool slot',
        format: 'nat',
        default: 5000,
        env: 'POSTGRES_POOL_CONNECTION_TIMEOUT_MS'
      }
    }
  }
}

export { postgresSchema }
