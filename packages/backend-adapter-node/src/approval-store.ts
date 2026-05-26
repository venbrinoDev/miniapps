import type { CapabilityId, ApprovalDecision, ApprovalScope, ApprovalRecord } from '@miniapps/protocol'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export class ApprovalStore {
  private records = new Map<string, ApprovalRecord>()
  private filePath: string
  private dirty = false
  private saveTimer?: ReturnType<typeof setTimeout>

  constructor(filePath: string = 'approvals.json') {
    this.filePath = filePath
  }

  async load(): Promise<void> {
    if (!existsSync(this.filePath)) {
      this.records = new Map()
      return
    }
    try {
      const data = await readFile(this.filePath, 'utf-8')
      const parsed = JSON.parse(data) as ApprovalRecord[]
      this.records = new Map(parsed.map((record) => [this.scopeKey(record.scope), record]))
    } catch {
      this.records = new Map()
    }
  }

  lookup(scope: ApprovalScope): ApprovalRecord | undefined {
    return this.records.get(this.scopeKey(scope))
  }

  record(scope: ApprovalScope, decision: ApprovalDecision): void {
    if (decision === 'allow-always') {
      this.records.set(this.scopeKey(scope), {
        scope,
        decision,
        timestamp: new Date().toISOString(),
      })
    } else {
      this.records.delete(this.scopeKey(scope))
    }
    this.scheduleSave()
  }

  remove(scope: ApprovalScope): void {
    if (this.records.delete(this.scopeKey(scope))) {
      this.scheduleSave()
    }
  }

  private scheduleSave(): void {
    this.dirty = true
    if (this.saveTimer) return
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = undefined
      if (this.dirty) {
        this.dirty = false
        try {
          await writeFile(this.filePath, JSON.stringify([...this.records.values()], null, 2), 'utf-8')
        } catch (err) {
          console.error('Failed to save approvals:', err)
          this.dirty = true
        }
      }
    }, 100)
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = undefined
    }
    if (this.dirty) {
      this.dirty = false
      await writeFile(this.filePath, JSON.stringify([...this.records.values()], null, 2), 'utf-8')
    }
  }

  private scopeKey(scope: ApprovalScope): string {
    return `${scope.miniAppId}:${scope.capability}:${scope.deviceId}:${scope.userId}`
  }
}
