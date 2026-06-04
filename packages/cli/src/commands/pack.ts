#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { validateManifest } from '@miniapps/manifest'

const require = createRequire(import.meta.url)

const CLI_TEMPLATE = `#!/usr/bin/env node
import app from './miniapp.bundle.js'
await app.listen()
`

export async function packCommand(): Promise<void> {
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
  const entryPath = resolve(projectDir, manifest.entry)

  if (!existsSync(entryPath)) {
    console.error(`Entry file not found: ${entryPath}`)
    process.exit(1)
  }

  try {
    const esbuildPath = require.resolve('esbuild', { paths: [projectDir] })
    const esbuild = await import(esbuildPath)

    const outdir = join(projectDir, 'dist')

    // Bundle the app entry
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(outdir, 'miniapp.bundle.js'),
      external: [],
      minify: false,
      sourcemap: true,
    })

    // Write CLI wrapper
    const cliPath = join(outdir, 'cli.js')
    writeFileSync(cliPath, CLI_TEMPLATE)
    chmodSync(cliPath, 0o755)

    // Derive command name from app ID (naira-payments → naira)
    const commandName = manifest.id.split('-')[0]

    // Write dist package.json with bin field
    const distPackage = {
      name: manifest.id,
      version: manifest.version,
      type: 'module',
      bin: {
        [commandName]: './cli.js',
      },
    }

    writeFileSync(
      join(outdir, 'package.json'),
      JSON.stringify(distPackage, null, 2) + '\n',
    )

    // Copy manifest
    const bundleManifest = {
      ...manifest,
      entry: 'miniapp.bundle.js',
    }

    writeFileSync(
      join(outdir, 'miniapp.json'),
      JSON.stringify(bundleManifest, null, 2) + '\n',
    )

    console.log(`Packed ${manifest.id}@${manifest.version}`)
    console.log(`  Output: dist/miniapp.bundle.js`)
    console.log(`  CLI: dist/cli.js → ${commandName}`)
    console.log(`  Manifest: dist/miniapp.json`)
    console.log()
    console.log(`To install globally:`)
    console.log(`  cd dist && npm install -g .`)
    console.log(`  ${commandName} <command>`)
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as any).code === 'ERR_MODULE_NOT_FOUND') {
      console.error('esbuild is required for packing. Install it: pnpm add -D esbuild')
      process.exit(1)
    }
    throw err
  }
}
