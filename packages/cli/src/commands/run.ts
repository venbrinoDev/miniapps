import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest } from '@miniapps/manifest'
import { BridgeClient } from '@miniapps/runtime'
import { MiniAppClient } from '@miniapps/sdk'

export interface RunOptions {
  url?: string
  userId?: string
  sessionId?: string
}

export async function runCommand(options: RunOptions): Promise<void> {
  const projectDir = process.cwd()
  const manifestPath = join(projectDir, 'miniapp.json')

  if (!existsSync(manifestPath)) {
    console.error('miniapp.json not found. Run "miniapps init" first.')
    process.exit(1)
  }

  const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const result = validateManifest(raw)

  if (!result.valid) {
    console.error('manifest is invalid. Run "miniapps validate" for details.')
    process.exit(1)
  }

  const manifest = result.manifest!
  const url = options.url ?? process.env.ADAPTER_URL ?? 'ws://localhost:3000'
  const userId = options.userId ?? process.env.USER_ID ?? 'user-1'
  const sessionId = options.sessionId ?? `session-${Date.now()}`

  console.log(`Starting ${manifest.id}@${manifest.version}`)
  console.log(`  Adapter: ${url}`)
  console.log(`  User: ${userId}`)
  console.log(`  Session: ${sessionId}`)

  const bridge = new BridgeClient({
    url,
    miniAppId: manifest.id,
    sessionId,
    userId,
    manifest,
  })

  try {
    await bridge.connect()
    console.log('Connected to adapter')

    const client = new MiniAppClient(bridge, {
      miniAppId: manifest.id,
      sessionId,
      userId,
      deviceId: 'cli-device',
    })

    console.log('Mini-app ready. Use the SDK to make requests.')

    const entryPath = join(projectDir, manifest.entry)
    if (existsSync(entryPath)) {
      const mod = await import(entryPath)
      if (typeof mod.default === 'function') {
        await mod.default(client, bridge)
      } else if (typeof mod.main === 'function') {
        await mod.main(client, bridge)
      }
    }

    process.on('SIGINT', async () => {
      console.log('\nShutting down...')
      await bridge.disconnect()
      process.exit(0)
    })

    await new Promise(() => {})
  } catch (err) {
    console.error('Failed to connect:', err instanceof Error ? err.message : err)
    await bridge.disconnect()
    process.exit(1)
  }
}
