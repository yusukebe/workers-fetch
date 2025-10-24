import { Command } from 'commander'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
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
  .option('-e, --entry <path>', 'Path to Worker entry file (if config not provided)')
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
        console.error('Error:', error.message)
      } else {
        console.error('Error:', String(error))
      }
      throw error
    } finally {
      if (worker) {
        await worker.dispose()
      }
    }
  })

program.parse()
