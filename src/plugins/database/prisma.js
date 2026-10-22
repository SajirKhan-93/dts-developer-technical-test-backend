import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

function initialisePrismaPool(server, options) {
  const pgPool = new Pool({
    host: options.host,
    port: options.port,
    database: options.database,
    user: options.username,
    password: options.password,
    max: options.pool.max,
    connectionTimeoutMillis: options.pool.connectionTimeoutMs
  })

  pgPool.on('error', (err, client) => {
    server.logger.error(
      { err, clientId: client?.processID },
      'Unexpected error on idle Prisma PostgreSQL client'
    )
  })

  return pgPool
}

function createPrismaClient(pgPool) {
  const adapter = new PrismaPg(pgPool)

  return new PrismaClient({
    log: ['error'],
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    adapter
  })
}

async function testPrismaConnection(prismaClient, pgPool, server) {
  try {
    server.logger.info('Testing Prisma connection...')
    await prismaClient.$queryRaw`SELECT 1`
    server.logger.info('Prisma connection test successful')
  } catch (err) {
    server.logger.error({ err }, 'Failed to connect to database via Prisma')
    await prismaClient.$disconnect()
    await pgPool.end()
    throw err
  }
}

function registerPrismaShutdown(server, prismaClient, pgPool) {
  server.events.on('stop', async () => {
    server.logger.info('Disconnecting Prisma client and closing pool')
    try {
      await prismaClient.$disconnect()
      await pgPool.end()
    } catch (err) {
      server.logger.error({ err }, 'Error disconnecting Prisma')
    }
  })
}

export const prisma = {
  plugin: {
    name: 'prisma',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up Prisma ORM with PostgreSQL adapter')

      const pgPool = initialisePrismaPool(server, options)
      const prismaClient = createPrismaClient(pgPool)

      await testPrismaConnection(prismaClient, pgPool, server)

      // Handlers use request.prisma
      server.decorate('request', 'prisma', prismaClient)
      server.decorate('server', 'prisma', prismaClient)

      registerPrismaShutdown(server, prismaClient, pgPool)
    }
  }
}
