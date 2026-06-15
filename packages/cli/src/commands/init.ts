import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as readline from 'node:readline'
import { CAPABILITY_IDS } from '@miniapps/manifest'

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

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export async function initCommand(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  try {
    const id = await prompt(rl, 'Mini-app ID', 'my-miniapp')
    const name = await prompt(rl, 'Mini-app name', 'My Mini App')
    const version = await prompt(rl, 'Version', '1.0.0')
    const description = await prompt(rl, 'Description', '')
    const category = await prompt(rl, 'Category', '')
    const entry = await prompt(rl, 'Entry file', 'src/index.ts')
    const capabilities = await promptMultiSelect(rl, 'Required capabilities:', CAPABILITY_IDS)

    const permissions: Record<string, { reason: string }> = {}
    for (const cap of capabilities) {
      const reason = await prompt(rl, `Reason for "${cap}"`, `Need ${cap} to perform operations`)
      permissions[cap] = { reason }
    }

    const manifest = {
      id,
      name,
      version,
      entry,
      description: description || undefined,
      category: category || undefined,
      instruction: './SKILL.md',
      files: ['./references/transfer-flow.md', './references/providers.md'],
      runtime: {
        engine: 'node',
        capabilities,
      },
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

    if (!existsSync(join(projectDir, 'SKILL.md'))) {
      writeFileSync(join(projectDir, 'SKILL.md'), `---
name: ${escapeString(id)}
description: ${escapeString(description || name)}
---

# ${name}

You are a ${escapeString(name)} assistant. Describe how this mini-app works for the AI agent here.

## Commands

- explain what each command does
- when to use each command
- error handling behavior

## Rules

- add safety rules here
- add edge cases here

## References

- \`references/transfer-flow.md\` — detailed transfer flow
- \`references/providers.md\` — provider integration details
`)
      console.log('Created SKILL.md')
    }

    const refsDir = join(projectDir, 'references')
    if (!existsSync(refsDir)) {
      mkdirSync(refsDir, { recursive: true })
    }

    if (!existsSync(join(refsDir, 'transfer-flow.md'))) {
      writeFileSync(join(refsDir, 'transfer-flow.md'), `# Transfer Flow\n\n## Flow\n\n1. Resolve recipient identity (account name, bank)\n2. Verify sufficient balance\n3. Require biometric authentication for amounts over ₦10,000\n4. Execute transfer\n5. Return transaction reference\n\n## Errors\n\n- \`INSUFFICIENT_FUNDS\`: suggest a smaller amount\n- \`RECIPIENT_NOT_FOUND\`: ask user to verify the recipient\n`)
      console.log('Created references/transfer-flow.md')
    }

    if (!existsSync(join(refsDir, 'providers.md'))) {
      writeFileSync(join(refsDir, 'providers.md'), `# Provider Integration\n\n## Supported Providers\n\n- Provider A: instant transfers, 1.5% fee\n- Provider B: 1-hour transfers, 0.5% fee\n\n## Failover\n\nIf primary provider fails, fall back to the secondary provider automatically.\n`)
      console.log('Created references/providers.md')
    }

    const srcDir = join(projectDir, 'src')
    if (!existsSync(srcDir)) {
      mkdirSync(srcDir, { recursive: true })
    }

    if (!existsSync(join(srcDir, 'index.ts'))) {
      const entryContent = `import { defineMiniApp } from '@miniapps/sdk'

const app = defineMiniApp({
  id: '${escapeString(id)}',
  name: '${escapeString(name)}',
  version: '${escapeString(version)}',
  instruction: './SKILL.md',
  files: ['./references/transfer-flow.md', './references/providers.md'],
  description: ${description ? `'${escapeString(description)}'` : 'undefined'},
  category: ${category ? `'${escapeString(category)}'` : 'undefined'},
  runtime: {
    capabilities: ${JSON.stringify(capabilities)},
  },
  permissions: ${JSON.stringify(permissions, null, 2)},
})
  .command('help', {
  description: 'Show available commands',
  semantic: 'Showing help',
  async execute(ctx) {
    return { commands: ['help'] }
  },
  })
  .build()

export default app
`
      writeFileSync(join(srcDir, 'index.ts'), entryContent)
      console.log('Created src/index.ts')
    }

    console.log('\nDone! Next steps:')
    console.log('  1. Edit SKILL.md with your AI behavior rules')
    console.log('  2. Edit references/ for detailed flows')
    console.log('  3. Add commands in src/index.ts')
    console.log('  4. miniapps validate')
    console.log('  5. miniapps describe')
  } finally {
    rl.close()
  }
}
