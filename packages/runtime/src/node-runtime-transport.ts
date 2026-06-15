import { MiniAppError, type DeviceRequest, type ProviderProxyCallResult } from '@miniapps/protocol'
import type { ProviderProxyCallParams } from '@miniapps/protocol'
import type { Transport, EventCallback } from '@miniapps/sdk'

const DEFAULT_BASE_URL = 'http://127.0.0.1:18789'
const DEFAULT_TIMEOUT_MS = 30_000

export interface NodeRuntimeTransportConfig {
  baseUrl?: string
  timeoutMs?: number
}

export class NodeRuntimeTransport implements Transport {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(config: NodeRuntimeTransportConfig = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl)
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async sendRequest<T = unknown>(request: DeviceRequest): Promise<T> {
    if (request.capability !== 'providerProxy.call') {
      throw new MiniAppError(
        'CAPABILITY_UNAVAILABLE',
        `Capability "${request.capability}" requires a paired host transport`,
        request.requestId,
      )
    }

    const params = request.params as ProviderProxyCallParams
    const providerId = String(params.providerId ?? '').trim()
    const operationId = String(params.operationId ?? '').trim()
    if (!providerId || !operationId) {
      throw new MiniAppError('HOST_ERROR', 'providerId and operationId are required', request.requestId)
    }

    const endpoint = new URL(
      `/runtime/provider-proxy/${encodeURIComponent(providerId)}/${encodeURIComponent(operationId)}`,
      this.baseUrl,
    )
    const response = await fetchWithTimeout(
      endpoint.toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: request.miniAppId,
          body: params.body,
          query: params.query,
          path: params.path,
          headers: params.headers,
        }),
      },
      request.timeoutMs || this.timeoutMs,
    )
    const raw = await response.text()
    const parsed = tryParseJson(raw)
    if (!response.ok) {
      const message = isRecord(parsed) && typeof parsed.message === 'string'
        ? parsed.message
        : `Provider proxy request failed (${response.status})`
      throw new MiniAppError('HOST_ERROR', message, request.requestId)
    }

    const result: ProviderProxyCallResult = {
      status: response.status,
      headers: extractHeaders(response),
      data: parsed,
    }
    return result as T
  }

  onDeviceEvent(_listener: EventCallback): () => void {
    return () => {}
  }
}

export function createNodeRuntimeTransport(config: NodeRuntimeTransportConfig = {}): NodeRuntimeTransport {
  return new NodeRuntimeTransport(config)
}

function normalizeBaseUrl(value?: string): string {
  const explicit = value?.trim() || process.env.JOVITA_PROVIDER_PROXY_BASE_URL?.trim()
  if (explicit) {
    return explicit
  }
  const port = Number(process.env.JOVITA_GATEWAY_PORT ?? 18789)
  const safePort = Number.isInteger(port) && port > 0 && port <= 65_535 ? port : 18789
  return process.env.JOVITA_RUNTIME_MODE === 'container'
    ? `http://127.0.0.1:${safePort}`
    : DEFAULT_BASE_URL.replace('18789', String(safePort))
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new MiniAppError('TIMEOUT', `Runtime request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function extractHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
