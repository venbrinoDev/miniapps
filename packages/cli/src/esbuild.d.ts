declare module 'esbuild' {
  export interface BuildOptions {
    entryPoints: string[]
    bundle?: boolean
    platform?: string
    format?: string
    outfile?: string
    external?: string[]
    minify?: boolean
    sourcemap?: boolean
  }
  export function build(options: BuildOptions): Promise<void>
}
