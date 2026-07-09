import { unstable_startWorker } from 'wrangler'
import { existsSync } from 'node:fs'

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
      // 'error' keeps normal runs quiet but lets startup failures reach stderr,
      // e.g. workerd rejecting the project's compatibility_date
      logLevel: 'error' as const,
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

export function formatErrorMessage(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; current !== undefined && current !== null && depth < 5; depth++) {
    parts.push(current instanceof Error ? current.message : String(current))
    current = current instanceof Error ? current.cause : undefined
  }
  return parts.join('\nCaused by: ')
}

export async function sendRequest(path: string, options: FetchOptions): Promise<FetchResult> {
  const startOptions = getWorkerStartOptions(options)

  // Validate config file exists before starting worker
  if ('config' in startOptions && startOptions.config && !existsSync(startOptions.config)) {
    throw new Error(`Config file not found: ${startOptions.config}`)
  }

  const worker = await unstable_startWorker(startOptions)

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
    const result = formatResponse(response, body)

    // The response is already in hand, so a dispose failure doesn't matter
    await worker.dispose().catch(() => {})

    return result
  } catch (error) {
    // When the runtime fails to start, unstable_startWorker() still resolves,
    // worker.fetch() hangs until the timeout, and dispose() rejects with the
    // root cause (e.g. MiniflareCoreError for an unsupported compatibility_date).
    // Prefer that root cause over the secondary timeout error. dispose() must be
    // called only once: a second call rejects with ERR_SERVER_NOT_RUNNING.
    const disposeError = await worker.dispose().then(
      () => undefined,
      (e: unknown) => e
    )
    throw disposeError ?? error
  } finally {
    // Clear timeout if request completed
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}
