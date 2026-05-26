import type { CapabilityId, DeviceRequest } from '@miniapps/protocol'

export interface RequestRecord {
  requestId: string
  sessionId: string
  deviceId: string
  clientSocketId: string
  hostSocketId: string
  capability: CapabilityId
  request: DeviceRequest
}

export class RequestRegistry {
  private requests = new Map<string, RequestRecord>()

  set(record: RequestRecord): void {
    this.requests.set(record.requestId, record)
  }

  get(requestId: string): RequestRecord | undefined {
    return this.requests.get(requestId)
  }

  delete(requestId: string): RequestRecord | undefined {
    const record = this.requests.get(requestId)
    if (record) {
      this.requests.delete(requestId)
    }
    return record
  }

  deleteByClientSocketId(clientSocketId: string): RequestRecord[] {
    return this.deleteWhere((record) => record.clientSocketId === clientSocketId)
  }

  deleteByHostSocketId(hostSocketId: string): RequestRecord[] {
    return this.deleteWhere((record) => record.hostSocketId === hostSocketId)
  }

  private deleteWhere(predicate: (record: RequestRecord) => boolean): RequestRecord[] {
    const removed: RequestRecord[] = []
    for (const [requestId, record] of this.requests.entries()) {
      if (!predicate(record)) {
        continue
      }
      this.requests.delete(requestId)
      removed.push(record)
    }
    return removed
  }
}
