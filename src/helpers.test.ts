import { describe, it, expect } from 'vitest'
import {
  parseHeaders,
  buildRequestOptions,
  buildUrl,
  formatResponse,
  getWorkerStartOptions,
} from './helpers'
import type { FetchOptions } from './helpers'

describe('parseHeaders', () => {
  it('should parse headers correctly', () => {
    const headers = parseHeaders(['Content-Type:application/json', 'Authorization:Bearer token'])
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    })
  })

  it('should handle headers with colons in values', () => {
    const headers = parseHeaders(['X-Custom:value:with:colons'])
    expect(headers).toEqual({
      'X-Custom': 'value:with:colons',
    })
  })

  it('should trim whitespace', () => {
    const headers = parseHeaders([
      'Content-Type: application/json ',
      ' Authorization : Bearer token',
    ])
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    })
  })

  it('should return empty object for undefined input', () => {
    const headers = parseHeaders(undefined)
    expect(headers).toEqual({})
  })

  it('should skip invalid headers', () => {
    const headers = parseHeaders(['Valid:value', 'Invalid', 'NoValue:'])
    expect(headers).toEqual({
      Valid: 'value',
      NoValue: '',
    })
  })
})

describe('buildRequestOptions', () => {
  it('should build request options with headers', () => {
    const options: FetchOptions = {
      method: 'GET',
    }
    const headers = { 'Content-Type': 'application/json' }
    const result = buildRequestOptions(options, headers)

    expect(result).toEqual({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('should include body when data is provided', () => {
    const options: FetchOptions = {
      method: 'POST',
      data: '{"name":"test"}',
    }
    const headers = {}
    const result = buildRequestOptions(options, headers)

    expect(result).toEqual({
      method: 'POST',
      headers: {},
      body: '{"name":"test"}',
    })
  })

  it('should not include body when data is not provided', () => {
    const options: FetchOptions = {
      method: 'GET',
    }
    const headers = {}
    const result = buildRequestOptions(options, headers)

    expect(result).toEqual({
      method: 'GET',
      headers: {},
    })
  })
})

describe('buildUrl', () => {
  it('should build URL with leading slash', () => {
    const url = buildUrl('/api/users')
    expect(url).toBe('http://example.com/api/users')
  })

  it('should build URL without leading slash', () => {
    const url = buildUrl('api/users')
    expect(url).toBe('http://example.com/api/users')
  })

  it('should handle root path', () => {
    const url = buildUrl('/')
    expect(url).toBe('http://example.com/')
  })
})

describe('formatResponse', () => {
  it('should format response correctly', () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Map([
        ['content-type', 'application/json'],
        ['x-custom', 'value'],
      ]),
    }

    const result = formatResponse(mockResponse, '{"message":"success"}')

    expect(result).toEqual({
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'x-custom': 'value',
      },
      body: '{"message":"success"}',
    })
  })

  it('should handle empty headers', () => {
    const mockResponse = {
      status: 404,
      statusText: 'Not Found',
      headers: new Map(),
    }

    const result = formatResponse(mockResponse, 'Not found')

    expect(result).toEqual({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      body: 'Not found',
    })
  })
})

describe('getWorkerStartOptions', () => {
  it('should return config option when config is provided', () => {
    const options: FetchOptions = {
      method: 'GET',
      config: 'wrangler.toml',
    }
    const result = getWorkerStartOptions(options)

    expect(result).toEqual({
      dev: {
        logLevel: 'none',
      },
      config: 'wrangler.toml',
    })
  })

  it('should return default config when config is not provided', () => {
    const options: FetchOptions = {
      method: 'GET',
    }
    const result = getWorkerStartOptions(options)

    expect(result).toEqual({
      dev: {
        logLevel: 'none',
      },
      config: 'wrangler.json',
    })
  })
})
