import { Server } from 'socket.io'
import { RequestRouter, type AdapterConfig } from './request-router.js'

export interface MiniAppsServerConfig extends AdapterConfig {
  port?: number
  cors?: {
    origin: string | string[]
    credentials?: boolean
  }
}

export class MiniAppsServer {
  private io: Server
  private router: RequestRouter

  constructor(private config: MiniAppsServerConfig = {}) {
    this.io = new Server(config.port ?? 3000, {
      cors: config.cors ?? { origin: '*' },
      transports: ['websocket'],
    })

    this.router = new RequestRouter(this.io, config)
  }

  async start(): Promise<void> {
    await this.router.initialize()
    this.router.setup()
    console.log(`miniapps adapter listening on port ${this.config.port ?? 3000}`)
  }

  async stop(): Promise<void> {
    await this.router.shutdown()
    return new Promise((resolve) => {
      this.io.close(() => resolve())
    })
  }

  getIO(): Server {
    return this.io
  }
}
