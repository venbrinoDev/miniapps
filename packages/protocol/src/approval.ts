import type { ApprovalDecision, ApprovalScope } from './envelopes.js'

export interface ApprovalRecord {
  scope: ApprovalScope
  decision: ApprovalDecision
  timestamp: string
}
