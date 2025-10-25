import { unstable_startWorker } from 'wrangler'
import { existsSync } from 'fs'

export interface FetchOptions {
  method: string
  header?: string[]
  data?: string
  config?: string
  timeout?: string
}

export interface FetchResult {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

export function getWorkerStartOptions(options: FetchOptions) {
  const baseOptions: any = {
    dev: {
      logLevel: 'none' as const,
    },
  }

  if (options.config) {
    return { ...baseOptions, config: options.config }
  }

  // Auto-detect wrangler config file
  const configFiles = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']
  for (const file of configFiles) {
    if (existsSync(file)) {
      return { ...baseOptions, config: file }
    }
  }

  return { ...baseOptions, config: 'wrangler.json' }
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

  // Validate config file exists before starting worker
  if ('config' in startOptions && startOptions.config && !existsSync(startOptions.config)) {
    throw new Error(`Config file not found: ${startOptions.config}`)
  }

  const worker = await unstable_startWorker(startOptions)
  onWorkerStarted(worker)

  const headers = parseHeaders(options.header)
  const requestOptions = buildRequestOptions(options, headers)
  const url = buildUrl(path)

  // Parse timeout value
  const timeoutMs = options.timeout ? parseFloat(options.timeout) * 1000 : 3000

  // Create timeout promise with cancellation
  let timeoutId: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs / 1000} seconds`))
    }, timeoutMs)
  })

  try {
    // Race between fetch and timeout
    const response = await Promise.race([worker.fetch(url, requestOptions), timeoutPromise])

    const body = await response.text()

    return formatResponse(response, body)
  } finally {
    // Clear timeout if request completed
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
