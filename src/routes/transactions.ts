import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import crypto from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRouter(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const sessionId = request.cookies.sessionId

      const transactions = await knex('transactions')
        .select('*')
        .where({ session_id: sessionId })

      return { transactions }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const getTransactionSchema = z.object({ id: z.string().uuid() })

      const { id } = getTransactionSchema.parse(request.params)

      const sessionId = request.cookies.sessionId

      const transaction = await knex('transactions')
        .where('id', id)
        .where('session_id', sessionId)
        .first()

      if (!transaction) {
        return reply.status(404).send({
          message: 'Transaction not found',
        })
      }

      return transaction
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const sessionId = request.cookies.sessionId

      const [summary] = await knex('transactions')
        .select(knex.raw('SUM(amount) as total'))
        .where({ session_id: sessionId })
        .groupBy('session_id')

      return summary
    },
  )

  app.post('/', async (request, reply) => {
    const createTransactionSchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = crypto.randomUUID()
      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
    }

    const { title, amount, type } = createTransactionSchema.parse(request.body)

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'debit' ? -amount : amount,
      session_id: sessionId,
    })

    return reply.code(201).send()
  })
}
