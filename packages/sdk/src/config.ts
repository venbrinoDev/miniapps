import type { CapabilityId } from '@miniapps/protocol'
import type { CommandContext } from './context.js'

export interface ProviderProxyRequirement {
  providerId: string
  operationIds?: string[]
}

export interface MiniAppRuntimeConfig {
  engine?: 'node'
  capabilities?: CapabilityId[]
  providerProxy?: {
    providers: ProviderProxyRequirement[]
  }
  compatibility?: {
    minHostVersion?: string
  }
  execution?: Record<string, unknown>
}

export interface MiniAppConfig {
  id: string
  name: string
  version: string
  instruction?: string
  files?: string[]
  description?: string
  category?: string
  entry?: string
  runtime?: MiniAppRuntimeConfig
  requiredCapabilities?: CapabilityId[]
  permissions?: Record<string, { reason: string }>
  timeout?: number
}

export interface ArgDefinition {
  name: string
  description?: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
}

export interface CommandDefinition {
  description: string
  semantic: string
  args?: ArgDefinition[]
  execute: (ctx: CommandContext) => Promise<unknown>
}

export interface DescribeOutput {
  id: string
  name: string
  version: string
  description?: string
  category?: string
  instruction?: string
  files?: string[]
  commands: Array<{
    name: string
    description: string
    semantic: string
    args: ArgDefinition[]
  }>
  capabilities: CapabilityId[]
  runtime?: MiniAppRuntimeConfig
}
