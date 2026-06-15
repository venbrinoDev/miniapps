import { describe, it, expect } from 'vitest'
import { MiniApp } from '../miniapp.js'
import { defineMiniApp } from '../builder.js'

describe('MiniApp', () => {
  function createApp() {
    return new MiniApp({
      id: 'test-app',
      name: 'Test App',
      version: '1.0.0',
      instruction: './SKILL.md',
      files: ['./references/transfer-flow.md'],
      description: 'A test mini-app',
      category: 'testing',
      requiredCapabilities: ['biometric.authenticate'],
      permissions: { 'biometric.authenticate': { reason: 'Verify identity' } },
    })
  }

  it('registers and executes commands', async () => {
    const app = createApp()
    app.command('hello', {
      description: 'Say hello',
      semantic: 'Saying hello',
      async execute(ctx) {
        return { message: 'hello' }
      },
    })

    const ctx = (app as any).buildContext('hello', {})
    const result = await (app as any).commands.get('hello').definition.execute(ctx)
    expect(result).toEqual({ message: 'hello' })
  })

  it('describe returns metadata only — no inline content', () => {
    const app = createApp()
    app.command('transfer', {
      description: 'Transfer money',
      semantic: 'Transferring funds',
      args: [{ name: 'recipient', required: true, description: 'Who to pay' }],
      async execute() { return {} },
    })

    const output = app.describe()
    expect(output.id).toBe('test-app')
    expect(output.name).toBe('Test App')
    expect(output.version).toBe('1.0.0')
    expect(output.description).toBe('A test mini-app')
    expect(output.category).toBe('testing')
    expect(output.instruction).toBe('./SKILL.md')
    expect(output.files).toEqual(['./references/transfer-flow.md'])
    expect(output.commands).toHaveLength(1)
    expect(output.commands[0].name).toBe('transfer')
    expect(output.commands[0].semantic).toBe('Transferring funds')
    expect(output.commands[0].args).toEqual([
      { name: 'recipient', required: true, description: 'Who to pay' },
    ])
    expect(output.capabilities).toEqual(['biometric.authenticate'])
  })

  it('command returns this for chaining', () => {
    const app = createApp()
    const result = app
      .command('a', { description: 'A', semantic: 'A', async execute() {} })
      .command('b', { description: 'B', semantic: 'B', async execute() {} })
    expect(result).toBe(app)
    expect(app.describe().commands).toHaveLength(2)
  })

  it('describe returns empty commands when none registered', () => {
    const app = createApp()
    expect(app.describe().commands).toEqual([])
  })

  it('rejects empty command name', () => {
    const app = createApp()
    expect(() =>
      app.command('', { description: 'X', semantic: 'X', async execute() {} }),
    ).toThrow('Command name cannot be empty')
  })

  it('rejects invalid command names', () => {
    const app = createApp()
    expect(() =>
      app.command('Hello World', { description: 'X', semantic: 'X', async execute() {} }),
    ).toThrow('Invalid command name')
    expect(() =>
      app.command('foo bar', { description: 'X', semantic: 'X', async execute() {} }),
    ).toThrow('Invalid command name')
    expect(() =>
      app.command('123', { description: 'X', semantic: 'X', async execute() {} }),
    ).toThrow('Invalid command name')
  })

  it('accepts valid dotted command names', () => {
    const app = createApp()
    expect(() =>
      app.command('naira.transfer', { description: 'X', semantic: 'X', async execute() {} }),
    ).not.toThrow()
    expect(() =>
      app.command('biometric.verify', { description: 'X', semantic: 'X', async execute() {} }),
    ).not.toThrow()
  })

  it('rejects duplicate command names', () => {
    const app = createApp()
    app.command('hello', { description: 'A', semantic: 'A', async execute() {} })
    expect(() =>
      app.command('hello', { description: 'B', semantic: 'B', async execute() {} }),
    ).toThrow('Command "hello" is already registered')
  })

  it('parseArgs handles --key value pairs', () => {
    const app = createApp()
    const parsed = (app as any).parseArgs(['--name', 'test', '--count', '5'], [])
    expect(parsed).toEqual({ name: 'test', count: '5' })
  })

  it('parseArgs handles boolean flags', () => {
    const app = createApp()
    const parsed = (app as any).parseArgs(['--verbose', '--count'], [])
    expect(parsed).toEqual({ verbose: 'true', count: 'true' })
  })

  it('parseArgs handles positional args', () => {
    const app = createApp()
    const parsed = (app as any).parseArgs(['hello', 'world'], [
      { name: 'greeting', required: true },
      { name: 'target', required: true },
    ])
    expect(parsed).toEqual({ greeting: 'hello', target: 'world' })
  })

  it('CommandContext.run calls child command with same sessionId', async () => {
    const app = createApp()
    let parentSessionId = ''
    let childSessionId = ''

    app.command('parent', {
      description: 'Parent',
      semantic: 'Parent',
      async execute(ctx) {
        parentSessionId = (ctx.miniapp as any).context.sessionId
        return ctx.run('child', { x: '1' })
      },
    })
    app.command('child', {
      description: 'Child',
      semantic: 'Child',
      async execute(ctx) {
        childSessionId = (ctx.miniapp as any).context.sessionId
        return { x: ctx.args.x }
      },
    })

    const ctx = (app as any).buildContext('parent', {})
    await (app as any).commands.get('parent').definition.execute(ctx)
    expect(parentSessionId).toBe(childSessionId)
    expect(parentSessionId).toBeTruthy()
  })

  it('CommandContext.run throws for unknown command', async () => {
    const app = createApp()
    app.command('exists', {
      description: 'Exists',
      semantic: 'Exists',
      async execute(ctx) {
        return ctx.run('nonexistent')
      },
    })

    const ctx = (app as any).buildContext('exists', {})
    await expect(
      (app as any).commands.get('exists').definition.execute(ctx),
    ).rejects.toThrow('Command "nonexistent" not found')
  })

  it('stub transport throws when no adapter connected', async () => {
    const app = createApp()
    app.command('test', {
      description: 'Test',
      semantic: 'Testing',
      async execute(ctx) {
        return ctx.miniapp.verifyBiometric({ reason: 'test' })
      },
    })

    const ctx = (app as any).buildContext('test', {})
    await expect(
      (app as any).commands.get('test').definition.execute(ctx),
    ).rejects.toThrow('No adapter connected')
  })

  it('listen() with transport sets it', async () => {
    const app = createApp()
    const mockTransport = {
      async sendRequest<T>() { return {} as T },
      onDeviceEvent() { return () => {} },
    }
    await app.listen({ transport: mockTransport })
    app.command('check', {
      description: 'Check',
      semantic: 'Checking',
      async execute(ctx) {
        try {
          await ctx.miniapp.verifyBiometric({ reason: 'test' })
          return { connected: true }
        } catch {
          return { connected: false }
        }
      },
    })
    const ctx = (app as any).buildContext('check', {})
    const result = await (app as any).commands.get('check').definition.execute(ctx)
    expect(result).toEqual({ connected: true })
  })

  it('describe returns undefined instruction when not set', () => {
    const app = new MiniApp({ id: 'x', name: 'X', version: '1.0.0' })
    expect(app.describe().instruction).toBeUndefined()
  })

  it('describe returns empty capabilities when not set', () => {
    const app = new MiniApp({ id: 'x', name: 'X', version: '1.0.0' })
    expect(app.describe().capabilities).toEqual([])
  })

  it('describe includes files when configured', () => {
    const app = new MiniApp({
      id: 'x',
      name: 'X',
      version: '1.0.0',
      files: ['./references/a.md', './references/b.md'],
    })
    expect(app.describe().files).toEqual(['./references/a.md', './references/b.md'])
  })

  it('builder registers commands, runtime requirements, and manifest output', () => {
    const app = defineMiniApp({
      id: 'builder-app',
      name: 'Builder App',
      version: '1.0.0',
      runtime: {
        capabilities: ['providerProxy.call'],
        providerProxy: {
          providers: [{ providerId: 'serper', operationIds: ['maps'] }],
        },
      },
      permissions: {
        'providerProxy.call': { reason: 'Call backend providers' },
      },
    })
      .command('search', {
        description: 'Search leads',
        semantic: 'Searching leads',
        async execute(ctx) {
          return ctx.providers.call({ providerId: 'serper', operationId: 'maps' })
        },
      })
      .build()

    expect(app.describe().runtime).toEqual({
      capabilities: ['providerProxy.call'],
      providerProxy: {
        providers: [{ providerId: 'serper', operationIds: ['maps'] }],
      },
    })
    expect(app.manifest()).toMatchObject({
      runtime: {
        engine: 'node',
        capabilities: ['providerProxy.call'],
        providerProxy: {
          providers: [{ providerId: 'serper', operationIds: ['maps'] }],
        },
      },
      requiredCapabilities: ['providerProxy.call'],
    })
  })
})
