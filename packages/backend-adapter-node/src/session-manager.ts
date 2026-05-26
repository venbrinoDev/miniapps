export interface SessionEntry {
  socketId: string
  sessionId: string
  miniAppId: string
  userId: string
  desiredDeviceId?: string
  connectedAt: Date
}

export class SessionManager {
  private sessions = new Map<string, SessionEntry>()
  private sessionToSocket = new Map<string, string>()

  register(entry: SessionEntry): void {
    const previousSocketId = this.sessionToSocket.get(entry.sessionId)
    if (previousSocketId && previousSocketId !== entry.socketId) {
      this.sessions.delete(previousSocketId)
    }
    this.sessions.set(entry.socketId, entry)
    this.sessionToSocket.set(entry.sessionId, entry.socketId)
  }

  unregister(socketId: string): void {
    const session = this.sessions.get(socketId)
    if (session) {
      this.sessionToSocket.delete(session.sessionId)
    }
    this.sessions.delete(socketId)
  }

  getBySocketId(socketId: string): SessionEntry | undefined {
    return this.sessions.get(socketId)
  }

  getBySessionId(sessionId: string): SessionEntry | undefined {
    const socketId = this.sessionToSocket.get(sessionId)
    return socketId ? this.sessions.get(socketId) : undefined
  }

  getAll(): SessionEntry[] {
    return [...this.sessions.values()]
  }

  getAllByUserId(userId: string): SessionEntry[] {
    return this.getAll()
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime())
  }
}
