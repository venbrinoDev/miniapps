import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as readline from 'node:readline'

const CAPABILITIES = [
  'biometric.authenticate',
  'camera.scanQr',
  'camera.capture',
  'gps.getCurrentPosition',
  'storage.pickFile',
] as const

async function prompt(rl: readline.Interface, question: string, defaultValue: string = ''): Promise<string> {
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` (${defaultValue})` : ''
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue)
    })
  })
}

async function promptMultiSelect(rl: readline.Interface, question: string, options: readonly string[]): Promise<string[]> {
  console.log(`\n${question}`)
  options.forEach((opt, i) => console.log(`  ${i + 1}) ${opt}`))

  const answer = await prompt(rl, 'Select numbers (comma-separated)', '1,2,3,4,5')
  const indices = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1)
  return indices.filter((i) => i >= 0 && i < options.length).map((i) => options[i])
}

export async function initCommand(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  try {
    const id = await prompt(rl, 'Mini-app ID', 'my-miniapp')
    const name = await prompt(rl, 'Mini-app name', 'My Mini App')
    const version = await prompt(rl, 'Version', '1.0.0')
    const entry = await prompt(rl, 'Entry file', 'src/index.ts')
    const capabilities = await promptMultiSelect(rl, 'Required capabilities:', CAPABILITIES)

    const permissions: Record<string, { reason: string }> = {}
    for (const cap of capabilities) {
      const reason = await prompt(rl, `Reason for "${cap}"`, `Need ${cap} to perform operations`)
      permissions[cap] = { reason }
    }

    const manifest = {
      id,
      name,
      version,
      runtime: 'node',
      entry,
      requiredCapabilities: capabilities,
      permissions,
    }

    const projectDir = process.cwd()

    if (!existsSync(join(projectDir, 'miniapp.json'))) {
      writeFileSync(join(projectDir, 'miniapp.json'), JSON.stringify(manifest, null, 2) + '\n')
      console.log('\nCreated miniapp.json')
    } else {
      console.log('\nminiapp.json already exists, skipping')
    }

    const srcDir = join(projectDir, 'src')
    if (!existsSync(srcDir)) {
      mkdirSync(srcDir, { recursive: true })
    }

    if (!existsSync(join(srcDir, 'index.ts'))) {
      const entryContent = `import { BridgeClient } from '@miniapps/runtime'
import { MiniAppClient } from '@miniapps/sdk'
import manifest from '../miniapp.json' with { type: 'json' }

async function main() {
  const bridge = new BridgeClient({
    url: process.env.ADAPTER_URL ?? 'ws://localhost:3000',
    miniAppId: manifest.id,
    sessionId: 'session-' + Date.now(),
    userId: process.env.USER_ID ?? 'user-1',
    manifest,
  })

  await bridge.connect()
  console.log('Connected to adapter')

  const client = new MiniAppClient(bridge, {
    miniAppId: manifest.id,
    sessionId: 'session-' + Date.now(),
    userId: process.env.USER_ID ?? 'user-1',
    deviceId: 'device-1',
  })

  // Example: request biometric authentication
  // const result = await client.biometric.authenticate({ reason: 'Verify identity' })
  // console.log('Biometric result:', result)
}

main().catch(console.error)
`
      writeFileSync(join(srcDir, 'index.ts'), entryContent)
      console.log('Created src/index.ts')
    }

    console.log('\nDone! Next steps:')
    console.log('  1. miniapps validate')
    console.log('  2. miniapps run')
  } finally {
    rl.close()
  }
}
