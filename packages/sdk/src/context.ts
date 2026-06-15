import type { MiniAppInstance } from './instance.js'

export class CommandContext {
  public args: Record<string, string>
  public miniapp: MiniAppInstance
  private commandRegistry: Map<string, { definition: { execute: (ctx: CommandContext) => Promise<unknown> } }>
  private buildContext: (commandName: string, args: Record<string, string>, sessionId: string) => CommandContext
  private sessionId: string

  constructor(
    args: Record<string, string>,
    miniapp: MiniAppInstance,
    commandRegistry: Map<string, { definition: { execute: (ctx: CommandContext) => Promise<unknown> } }>,
    buildContext: (commandName: string, args: Record<string, string>, sessionId: string) => CommandContext,
    sessionId: string,
  ) {
    this.args = args
    this.miniapp = miniapp
    this.commandRegistry = commandRegistry
    this.buildContext = buildContext
    this.sessionId = sessionId
  }

  async run(command: string, args?: Record<string, string>): Promise<unknown> {
    const entry = this.commandRegistry.get(command)
    if (!entry) {
      throw new Error(`Command "${command}" not found`)
    }
    const childCtx = this.buildContext(command, args ?? {}, this.sessionId)
    return entry.definition.execute(childCtx)
  }

  get providers(): MiniAppInstance['providers'] {
    return this.miniapp.providers
  }
}
