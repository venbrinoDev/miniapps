import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest } from '@miniapps/manifest'

export async function validateCommand(): Promise<void> {
  const projectDir = process.cwd()
  const manifestPath = join(projectDir, 'miniapp.json')

  let raw: unknown
  try {
    const content = readFileSync(manifestPath, 'utf-8')
    raw = JSON.parse(content)
  } catch (err) {
    console.error('Failed to read miniapp.json:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const result = validateManifest(raw)

  if (!result.valid) {
    console.error('manifest is invalid:')
    for (const error of result.errors) {
      console.error(`  - ${error}`)
    }
    process.exit(1)
  }

  const m = result.manifest!
  console.log('manifest is valid')
  console.log(`  id: ${m.id}`)
  console.log(`  name: ${m.name}`)
  console.log(`  version: ${m.version}`)
  console.log(`  capabilities: ${(m.runtime?.capabilities ?? m.requiredCapabilities).join(', ')}`)
  if (m.runtime?.providerProxy?.providers?.length) {
    console.log(`  provider proxy: ${m.runtime.providerProxy.providers.map((row) => row.providerId).join(', ')}`)
  }
  if (m.description) console.log(`  description: ${m.description}`)
  if (m.category) console.log(`  category: ${m.category}`)
  if (m.commands && m.commands.length > 0) {
    console.log(`  commands: ${m.commands.map((c) => c.name).join(', ')}`)
  }

  const fileErrors: string[] = []

  if (m.instruction) {
    const instructionPath = join(projectDir, m.instruction)
    if (existsSync(instructionPath)) {
      console.log(`  instruction: ${m.instruction}`)
    } else {
      fileErrors.push(`instruction "${m.instruction}" file not found`)
    }
  }

  if (m.files) {
    console.log(`  instruction files:`)
    for (const file of m.files) {
      if (existsSync(join(projectDir, file))) {
        console.log(`    ${file}`)
      } else {
        fileErrors.push(`instruction file "${file}" not found`)
      }
    }
  }

  if (fileErrors.length > 0) {
    console.error('\n  Warning: instruction files missing:')
    for (const err of fileErrors) {
      console.error(`    - ${err}`)
    }
    process.exit(1)
  }
}
