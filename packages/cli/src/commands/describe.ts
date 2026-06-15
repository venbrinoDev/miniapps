import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateManifest } from '@miniapps/manifest'

interface RuntimeInfo {
  engine: 'node'
  capabilities: string[]
  providerProxy?: {
    providers: Array<{ providerId: string; operationIds?: string[] }>
  }
}

export async function describeCommand(): Promise<void> {
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
  const runtime = resolveRuntimeConfig(manifest.runtime)

  const entryPath = join(projectDir, manifest.entry)
  let describeOutput: Record<string, unknown> | null = null

  if (existsSync(entryPath)) {
    try {
      const mod = await import(entryPath)
      if (typeof mod.default?.describe === 'function') {
        describeOutput = mod.default.describe()
      } else if (typeof mod.describe === 'function') {
        describeOutput = mod.describe()
      } else if (typeof mod.app?.describe === 'function') {
        describeOutput = mod.app.describe()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      process.stderr.write(`Warning: failed to load entry module: ${msg}\n`)
    }
  }

  if (!describeOutput) {
    describeOutput = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      category: manifest.category,
      instruction: manifest.instruction,
      files: manifest.files,
      commands: (manifest.commands ?? []).map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        semantic: cmd.semantic,
        args: cmd.args ?? [],
      })),
      capabilities: runtime.capabilities ?? manifest.requiredCapabilities,
      runtime,
    }
  }

  console.log(JSON.stringify(describeOutput, null, 2))
}

function resolveRuntimeConfig(runtime: NonNullable<ReturnType<typeof validateManifest>['manifest']>['runtime']): RuntimeInfo {
  if (!runtime || runtime === 'node') {
    return { engine: 'node', capabilities: [] }
  }
  return {
    engine: 'node',
    capabilities: [...(runtime.capabilities ?? [])],
    providerProxy: runtime.providerProxy
      ? {
          providers: runtime.providerProxy.providers.map((row) => ({
            providerId: row.providerId,
            operationIds: row.operationIds,
          })),
        }
      : undefined,
  }
}
