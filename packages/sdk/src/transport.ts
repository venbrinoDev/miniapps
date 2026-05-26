import type {
  DeviceEvent,
  DeviceRequest,
} from '@miniapps/protocol'

export type EventCallback<T = unknown> = (event: DeviceEvent<T>) => void

export interface Transport {
  sendRequest<T = unknown>(request: DeviceRequest): Promise<T>
  onDeviceEvent(listener: EventCallback): () => void
}
