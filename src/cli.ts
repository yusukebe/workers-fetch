import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendRequest } from './helpers.js'
import type { FetchOptions } from './helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

const program = new Command()

program
  .name('workers-fetch')
  .description('Send HTTP requests to Cloudflare Workers using curl-like interface')
  .version(packageJson.version)
  .argument('[path]', 'Request path (e.g., /api/users)', '/')
  .option('-X, --method <method>', 'HTTP method', 'GET')
  .option('-H, --header <headers...>', 'Custom headers (e.g., "Content-Type:application/json")')
  .option('-d, --data <data>', 'Request body data')
  .option('-c, --config <path>', 'Path to wrangler configuration file')
  .option('--timeout <seconds>', 'Maximum time allowed for the request in seconds', '3')
  .action(async (path: string, options: FetchOptions) => {
    let worker: any

    try {
      const result = await sendRequest(path, options, (w) => {
        worker = w
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      if (worker) {
        await worker.dispose()
      }
      if (error instanceof Error) {
        program.error(error.message, { exitCode: 1, code: 'custom.error' })
      } else {
        program.error(String(error), { exitCode: 1, code: 'custom.error' })
      }
    } finally {
      if (worker) {
        await worker.dispose()
      }
    }
  })

program.parse()
