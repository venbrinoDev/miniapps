#!/usr/bin/env node
import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { validateCommand } from './commands/validate.js'
import { packCommand } from './commands/pack.js'
import { runCommand } from './commands/run.js'

const program = new Command()
  .name('miniapps')
  .description('CLI for building and running mini-apps')
  .version('0.1.0')

program
  .command('init')
  .description('Initialize a new mini-app project')
  .action(initCommand)

program
  .command('validate')
  .description('Validate the miniapp.json manifest')
  .action(validateCommand)

program
  .command('pack')
  .description('Bundle the mini-app for distribution')
  .action(packCommand)

program
  .command('run')
  .description('Run the mini-app, connecting to a backend adapter')
  .option('-u, --url <url>', 'Backend adapter URL')
  .option('--user-id <id>', 'User ID')
  .option('--session-id <id>', 'Session ID')
  .action(runCommand)

program.parse()
