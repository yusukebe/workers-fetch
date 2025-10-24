import { unstable_startWorker } from 'wrangler'
import { existsSync } from 'fs'

export interface FetchOptions {
  method: string
  header?: string[]
  data?: string
  config?: string
  entry?: string
}

export interface FetchResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

export function getWorkerStartOptions(options: FetchOptions) {
  if (options.entry) {
    return { script: options.entry }
  }

  if (options.config) {
    return { config: options.config }
  }

  // Auto-detect wrangler config file
  const configFiles = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']
  for (const file of configFiles) {
    if (existsSync(file)) {
      return { config: file }
    }
  }

  return { config: 'wrangler.json' }
}

export function parseHeaders(headerArray?: string[]): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!headerArray) return headers

  for (const header of headerArray) {
    const [key, ...valueParts] = header.split(':')
    if (key && valueParts.length > 0) {
      headers[key.trim()] = valueParts.join(':').trim()
    }
  }
  return headers
}

export function buildRequestOptions(options: FetchOptions, headers: Record<string, string>) {
  const requestOptions: {
    method: string
    headers: Record<string, string>
    body?: string
  } = {
    method: options.method,
    headers,
  }

  if (options.data) {
    requestOptions.body = options.data
  }

  return requestOptions
}

export function buildUrl(path: string): string {
  return `http://example.com${path.startsWith('/') ? path : '/' + path}`
}

export function formatResponse(response: any, body: string): FetchResult {
  const headers: Record<string, string> = {}
  response.headers.forEach((value: string, key: string) => {
    headers[key] = value
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body,
  }
}

export async function sendRequest(
  path: string,
  options: FetchOptions,
  onWorkerStarted: (worker: any) => void
): Promise<FetchResult> {
  const startOptions = getWorkerStartOptions(options)

  let worker
  try {
    worker = await unstable_startWorker(startOptions)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to start worker: ${error.message}. Make sure your wrangler config file exists and is valid.`)
    }
    throw error
  }

  onWorkerStarted(worker)

  const headers = parseHeaders(options.header)
  const requestOptions = buildRequestOptions(options, headers)
  const url = buildUrl(path)

  const response = await worker.fetch(url, requestOptions)
  const body = await response.text()

  return formatResponse(response, body)
}
