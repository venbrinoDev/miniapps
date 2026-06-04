import type { Transport } from './transport.js'

export class MiniAppInstance {
  constructor(
    private transport: Transport,
    private context: {
      miniAppId: string
      sessionId: string
      userId: string
      deviceId: string
      timeoutMs: number
    },
  ) {}

  async verifyBiometric(params: { reason: string; semantic?: string }): Promise<boolean> {
    const result = await this.transport.sendRequest<{ authenticated: boolean }>({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: 'biometric.authenticate' as const,
      params: { reason: params.reason },
      reason: params.reason,
      timeoutMs: this.context.timeoutMs,
      semantic: params.semantic,
    } as any)
    return result.authenticated
  }

  async scanQr(params: { reason: string; semantic?: string }): Promise<{ content: string; format: string }> {
    return this.transport.sendRequest({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: 'camera.scanQr' as const,
      params: { reason: params.reason },
      reason: params.reason,
      timeoutMs: this.context.timeoutMs,
      semantic: params.semantic,
    } as any) as Promise<{ content: string; format: string }>
  }

  async capturePhoto(params: { reason: string; semantic?: string }): Promise<{ uri: string; mimeType: string }> {
    return this.transport.sendRequest({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: 'camera.capture' as const,
      params: { reason: params.reason },
      reason: params.reason,
      timeoutMs: this.context.timeoutMs,
      semantic: params.semantic,
    } as any) as Promise<{ uri: string; mimeType: string }>
  }

  async getCurrentLocation(params: { reason: string; semantic?: string; accuracy?: 'high' | 'medium' | 'low' }): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return this.transport.sendRequest({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: 'gps.getCurrentPosition' as const,
      params: { reason: params.reason, accuracy: params.accuracy },
      reason: params.reason,
      timeoutMs: this.context.timeoutMs,
      semantic: params.semantic,
    } as any) as Promise<{ latitude: number; longitude: number; accuracy: number }>
  }

  async pickFile(params: { reason: string; semantic?: string; types?: string[] }): Promise<{ uri: string; name: string; size: number; mimeType: string }> {
    return this.transport.sendRequest({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: 'storage.pickFile' as const,
      params: { reason: params.reason, types: params.types },
      reason: params.reason,
      timeoutMs: this.context.timeoutMs,
      semantic: params.semantic,
    } as any) as Promise<{ uri: string; name: string; size: number; mimeType: string }>
  }

  async request<T = unknown>(capability: string, params: Record<string, unknown>): Promise<T> {
    return this.transport.sendRequest<T>({
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      miniAppId: this.context.miniAppId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      deviceId: this.context.deviceId,
      capability: capability as any,
      params,
      reason: (params.reason as string) || 'Device capability request',
      timeoutMs: this.context.timeoutMs,
    } as any)
  }
}
