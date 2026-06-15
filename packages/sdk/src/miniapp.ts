import type { CapabilityId } from '@miniapps/protocol'
import type {
  MiniAppConfig,
  CommandDefinition,
  ArgDefinition,
  DescribeOutput,
  MiniAppRuntimeConfig,
} from './config.js'
import { CommandContext } from './context.js'
import { MiniAppInstance } from './instance.js'
import type { Transport } from './transport.js'

interface RegisteredCommand {
  name: string
  definition: CommandDefinition
}

export interface ListenOptions {
  transport?: Transport
}

const COMMAND_NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/

export class MiniApp {
  private config: MiniAppConfig
  private commands = new Map<string, RegisteredCommand>()
  private transport?: Transport

  constructor(config: MiniAppConfig) {
    this.config = { ...config }
  }

  command(name: string, definition: CommandDefinition): this {
    if (!name || name.trim() === '') {
      throw new Error('Command name cannot be empty')
    }
    if (!COMMAND_NAME_RE.test(name)) {
      throw new Error(
        `Invalid command name "${name}". Use lowercase alphanumeric with hyphens, optionally dotted (e.g. "naira.transfer").`,
      )
    }
    if (this.commands.has(name)) {
      throw new Error(`Command "${name}" is already registered`)
    }
    this.commands.set(name, { name, definition })
    return this
  }

  describe(): DescribeOutput {
    const commands: DescribeOutput['commands'] = []
    for (const [, cmd] of this.commands) {
      commands.push({
        name: cmd.name,
        description: cmd.definition.description,
        semantic: cmd.definition.semantic,
        args: cmd.definition.args ?? [],
      })
    }

    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      category: this.config.category,
      instruction: this.config.instruction,
      files: this.config.files,
      commands,
      capabilities: resolveCapabilities(this.config),
      runtime: normalizeRuntimeConfig(this.config),
    }
  }

  manifest(): Record<string, unknown> {
    const capabilities = resolveCapabilities(this.config)
    return {
      id: this.config.id,
      name: this.config.name,
      version: this.config.version,
      runtime: {
        engine: 'node',
        ...(normalizeRuntimeConfig(this.config) ?? {}),
        capabilities,
      },
      entry: this.config.entry ?? 'src/index.ts',
      description: this.config.description,
      category: this.config.category,
      instruction: this.config.instruction,
      files: this.config.files,
      commands: this.describe().commands,
      requiredCapabilities: capabilities,
      permissions: this.config.permissions ?? {},
      timeout: this.config.timeout,
    }
  }

  private buildContext(commandName: string, args: Record<string, string>, sessionId?: string): CommandContext {
    const sid = sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const miniapp = this.transport
      ? new MiniAppInstance(this.transport, {
          miniAppId: this.config.id,
          sessionId: sid,
          userId: process.env.USER_ID ?? 'user-1',
          deviceId: process.env.DEVICE_ID ?? 'device-1',
          timeoutMs: this.config.timeout ?? 30_000,
        })
      : this.createStubInstance(sid)

    return new CommandContext(args, miniapp, this.commands, (name, a, sid2) => this.buildContext(name, a, sid2), sid)
  }

  private createStubInstance(sessionId: string): MiniAppInstance {
    const stubTransport: Transport = {
      async sendRequest<T>(): Promise<T> {
        throw new Error('No adapter connected. Device capabilities unavailable.')
      },
      onDeviceEvent(): () => void {
        return () => {}
      },
    }
    return new MiniAppInstance(stubTransport, {
      miniAppId: this.config.id,
      sessionId,
      userId: process.env.USER_ID ?? 'user-1',
      deviceId: process.env.DEVICE_ID ?? 'device-1',
      timeoutMs: this.config.timeout ?? 30_000,
    })
  }

  async listen(options?: ListenOptions): Promise<void> {
    if (options?.transport) {
      this.transport = options.transport
    } else {
      await this.listenCli()
    }
  }

  private async listenCli(): Promise<void> {
    const argv = process.argv.slice(2)
    if (argv[0] === '--help' || argv[0] === '-h') {
      this.writeHelp()
      return
    }
    if (argv.length === 0) {
      process.stdout.write(JSON.stringify({ error: 'No command specified' }, null, 2) + '\n')
      process.exit(1)
    }

    let commandName = argv[0]
    const commandArgs = argv.slice(1)

    if (!this.commands.has(commandName) && argv.length >= 2) {
      const dottedName = `${argv[0]}.${argv[1]}`
      if (this.commands.has(dottedName)) {
        commandName = dottedName
        commandArgs.splice(0, 1)
      }
    }

    const entry = this.commands.get(commandName)
    if (!entry) {
      process.stderr.write(`Unknown command: ${commandName}\n`)
      process.stderr.write(`Available commands: ${Array.from(this.commands.keys()).join(', ')}\n`)
      process.exit(1)
    }

    const parsed = this.parseArgs(commandArgs, entry.definition.args ?? [])
    const missingRequired = (entry.definition.args ?? []).filter(
      (arg) => arg.required && !(arg.name in parsed),
    )
    if (missingRequired.length > 0) {
      process.stderr.write(
        `Missing required args: ${missingRequired.map((a) => a.name).join(', ')}\n`,
      )
      process.exit(1)
    }

    const ctx = this.buildContext(commandName, parsed)

    try {
      const result = await entry.definition.execute(ctx)
      if (result !== undefined) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(JSON.stringify({ error: message }, null, 2) + '\n')
      process.exit(1)
    }
  }

  private writeHelp(): void {
    const lines = [
      `${this.config.name} (${this.config.id})`,
      this.config.description ?? 'No description provided.',
      '',
      'Commands:',
      ...Array.from(this.commands.values()).map((command) => `  ${command.name} - ${command.definition.description}`),
    ]
    process.stdout.write(`${lines.join('\n')}\n`)
  }

  private parseArgs(argv: string[], argDefs: ArgDefinition[]): Record<string, string> {
    const args: Record<string, string> = {}
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i]
      if (arg.startsWith('--')) {
        const key = arg.slice(2)
        const val = argv[i + 1]
        if (val && !val.startsWith('--')) {
          args[key] = val
          i++
        } else {
          args[key] = 'true'
        }
      } else {
        const def = argDefs.find((d) => d.required && !(d.name in args))
        if (def) {
          args[def.name] = arg
        }
      }
    }
    return args
  }
}

function resolveCapabilities(config: MiniAppConfig): CapabilityId[] {
  return config.runtime?.capabilities?.length
    ? config.runtime.capabilities
    : (config.requiredCapabilities ?? [])
}

function normalizeRuntimeConfig(config: MiniAppConfig): MiniAppRuntimeConfig | undefined {
  if (!config.runtime) {
    return undefined
  }
  return {
    ...config.runtime,
    capabilities: resolveCapabilities(config),
  }
}
