import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { validateManifest } from '@miniapps/manifest'

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
    const esbuild = await import('esbuild')

    const outfile = join(projectDir, 'dist', 'miniapp.bundle.js')

    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile,
      external: [],
      minify: false,
      sourcemap: true,
    })

    const bundleManifest = {
      ...manifest,
      entry: 'miniapp.bundle.js',
    }

    writeFileSync(
      join(projectDir, 'dist', 'miniapp.json'),
      JSON.stringify(bundleManifest, null, 2) + '\n',
    )

    console.log(`Packed ${manifest.id}@${manifest.version}`)
    console.log(`  Output: dist/miniapp.bundle.js`)
    console.log(`  Manifest: dist/miniapp.json`)
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as any).code === 'ERR_MODULE_NOT_FOUND') {
      console.error('esbuild is required for packing. Install it: pnpm add -D esbuild')
      process.exit(1)
    }
    throw err
  }
}
