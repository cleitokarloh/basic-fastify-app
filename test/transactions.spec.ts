import { it, beforeAll, afterAll, describe, expect } from 'vitest'
import request from 'supertest'
import { execSync } from 'node:child_process'
import { app } from '../src/app'
import { beforeEach } from 'node:test'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    execSync('npx knex migrate:rollback --all')
    execSync('npx knex migrate:latest')
  })

  it('should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'Test transaction',
        amount: 100,
        type: 'credit',
      })
      .expect(201)
  })

  it('should be able to get all transactions', async () => {
    const transaction = {
      title: 'Test transaction',
      amount: 100,
    }
    const createTransactionRequest = await request(app.server)
      .post('/transactions')
      .send({
        title: transaction.title,
        amount: transaction.amount,
        type: 'credit',
      })

    const cookies = createTransactionRequest.get('Set-Cookie')

    if (!cookies) {
      throw new Error('Cookies not found in response')
    }

    const getTransactions = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactions.body.transactions).toEqual([
      expect.objectContaining({
        title: transaction.title,
        amount: transaction.amount,
      }),
    ])
  })

  it('should be able to get a specific transaction', async () => {
    const transaction = {
      title: 'Test transaction',
      amount: 100,
    }
    const createTransactionRequest = await request(app.server)
      .post('/transactions')
      .send({
        title: transaction.title,
        amount: transaction.amount,
        type: 'credit',
      })

    const cookies = createTransactionRequest.get('Set-Cookie')

    if (!cookies) {
      throw new Error('Cookies not found in response')
    }

    const listTransactions = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactions.body.transactions[0].id

    const getTransaction = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransaction.body).toEqual(
      expect.objectContaining({
        title: transaction.title,
        amount: transaction.amount,
      }),
    )
  })

  it('should be able to get summary', async () => {
    const createTransactionRequest = await request(app.server)
      .post('/transactions')
      .send({
        title: 'credit',
        amount: 100,
        type: 'credit',
      })

    const cookies = createTransactionRequest.get('Set-Cookie')

    if (!cookies) {
      throw new Error('Cookies not found in response')
    }

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'debit',
        amount: 50,
        type: 'debit',
      })

    const getTransactions = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactions.body).toEqual(
      expect.objectContaining({
        total: 50,
      }),
    )
  })
})
