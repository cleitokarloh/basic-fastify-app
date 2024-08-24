import 'dotenv/config'
import fastify from 'fastify'
import { transactionsRouter } from './routes/transactions'
import cookie from '@fastify/cookie'

export const app = fastify()

app.register(cookie)

app.register(transactionsRouter, {
  prefix: '/transactions',
})
