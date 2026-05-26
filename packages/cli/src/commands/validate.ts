import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest } from '@miniapps/manifest'

export async function validateCommand(): Promise<void> {
  const manifestPath = join(process.cwd(), 'miniapp.json')

  let raw: unknown
  try {
    const content = readFileSync(manifestPath, 'utf-8')
    raw = JSON.parse(content)
  } catch (err) {
    console.error('Failed to read miniapp.json:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const result = validateManifest(raw)

  if (result.valid) {
    console.log('manifest is valid')
    console.log(`  id: ${result.manifest!.id}`)
    console.log(`  name: ${result.manifest!.name}`)
    console.log(`  version: ${result.manifest!.version}`)
    console.log(`  capabilities: ${result.manifest!.requiredCapabilities.join(', ')}`)
  } else {
    console.error('manifest is invalid:')
    for (const error of result.errors) {
      console.error(`  - ${error}`)
    }
    process.exit(1)
  }
}
