import type { CapabilityId } from '@miniapps/protocol'
import { MiniApp } from './miniapp.js'
import type {
  CommandDefinition,
  MiniAppConfig,
  MiniAppRuntimeConfig,
  ProviderProxyRequirement,
} from './config.js'

export interface DefineMiniAppInput extends Omit<MiniAppConfig, 'runtime'> {
  runtime?: MiniAppRuntimeConfig
}

export class MiniAppBuilder {
  private readonly config: MiniAppConfig
  private readonly commands: Array<{ name: string; definition: CommandDefinition }> = []

  constructor(input: DefineMiniAppInput) {
    this.config = {
      ...input,
      runtime: input.runtime ? { ...input.runtime } : undefined,
      requiredCapabilities: input.runtime?.capabilities ?? input.requiredCapabilities ?? [],
      permissions: { ...(input.permissions ?? {}) },
    }
  }

  command(name: string, definition: CommandDefinition): this {
    this.commands.push({ name, definition })
    return this
  }

  capability(capability: CapabilityId, permission: { reason: string }): this {
    const capabilities = new Set(this.config.runtime?.capabilities ?? this.config.requiredCapabilities ?? [])
    capabilities.add(capability)
    this.config.requiredCapabilities = Array.from(capabilities)
    this.config.runtime = {
      ...(this.config.runtime ?? {}),
      capabilities: Array.from(capabilities),
    }
    this.config.permissions = {
      ...(this.config.permissions ?? {}),
      [capability]: permission,
    }
    return this
  }

  runtime(config: Partial<MiniAppRuntimeConfig> & {
    providerProxy?: {
      providers: ProviderProxyRequirement[]
    }
  }): this {
    const mergedCapabilities = config.capabilities
      ? Array.from(new Set([...(this.config.runtime?.capabilities ?? this.config.requiredCapabilities ?? []), ...config.capabilities]))
      : (this.config.runtime?.capabilities ?? this.config.requiredCapabilities ?? [])

    this.config.requiredCapabilities = mergedCapabilities
    this.config.runtime = {
      ...(this.config.runtime ?? {}),
      ...config,
      capabilities: mergedCapabilities,
      providerProxy: config.providerProxy ?? this.config.runtime?.providerProxy,
    }
    return this
  }

  build(): MiniApp {
    const app = new MiniApp(this.config)
    for (const entry of this.commands) {
      app.command(entry.name, entry.definition)
    }
    return app
  }
}

export function defineMiniApp(input: DefineMiniAppInput): MiniAppBuilder {
  return new MiniAppBuilder(input)
}
