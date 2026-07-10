import { describe, it, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendRequest } from './helpers'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../test/fixtures')

describe('sendRequest', () => {
  it('should return the response from a worker', async () => {
    const result = await sendRequest('/', {
      method: 'GET',
      config: join(fixturesDir, 'valid/wrangler.json'),
      timeout: '10',
    })

    expect(result.status).toBe(200)
    expect(result.body).toBe('ok')
  }, 60000)

  it('should surface the root startup error instead of ERR_SERVER_NOT_RUNNING', async () => {
    const error = await sendRequest('/', {
      method: 'GET',
      config: join(fixturesDir, 'future-compat/wrangler.json'),
      timeout: '2',
    }).then(
      () => null,
      (e: unknown) => e as Error
    )

    expect(error).toBeInstanceOf(Error)
    expect(error!.message).toMatch(/compatibility date/i)
    expect(error!.message).not.toMatch(/Server is not running/)
  }, 60000)
})
