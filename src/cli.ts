import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatErrorMessage, sendRequest } from './helpers.js'
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
    try {
      const result = await sendRequest(path, options)
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      program.error(formatErrorMessage(error), { exitCode: 1, code: 'custom.error' })
    }
  })

program.parse()
