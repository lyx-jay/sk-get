#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { installCommand } from './commands/install.js';
import { removeCommand } from './commands/remove.js';
import { statusCommand } from './commands/status.js';
import { 
  addRepo, 
  removeRepo, 
  getRepos, 
  getActiveRepoUrl, 
  setActiveRepoUrl 
} from './utils/config.js';
import chalk from 'chalk';
import enquirer from 'enquirer';

const program = new Command();

program
  .name('sk-get')
  .description(chalk.cyan('🚀 AI Agent Skills Manager - Quick install and manage skills via GitHub API'))
  .version('1.1.0')
  .helpOption('-h, --help', 'Display help for command');

// Help command (sg help)
program
  .command('help')
  .description('Display help for command')
  .action(() => {
    program.help();
  });

program
  .command('status')
  .description('Show current environment status (active repo and installed skills overview)')
  .action(statusCommand);

program
  .command('list')
  .alias('ls')
  .description('List all available skills from the active repository')
  .option('-r, --repo', 'Choose a repository first, then list its skills', false)
  .action((options) => {
    listCommand(options);
  });

program
  .command('add')
  .description('Add a skill to a specific platform (enters interactive mode if no arguments provided)')
  .argument('[skill-name]', 'Name of the skill to install')
  .argument('[platform]', 'Target platform (choices: cursor, claude, vscode)')
  .option('-g, --global', 'Install to global directory (supported for cursor and claude)', false)
  .option('-m, --method <method>', 'Installation method (choices: link, copy)', 'link')
  .addHelpText('after', `
Available Platforms:
  ${chalk.cyan('cursor')}  - Install to Cursor skills directory
  ${chalk.cyan('claude')}  - Install to Claude skills directory
  ${chalk.cyan('vscode')}  - Append to .github/copilot-instructions.md

Available Methods:
  ${chalk.cyan('link')}    - (Default) Create a symbolic link to a central library.
             Skills stay updated when you run 'add' again.
  ${chalk.cyan('copy')}    - Copy files directly to the project.
             Better for static snapshots or offline projects.

Note:
  The ${chalk.yellow('--global')} flag only applies to ${chalk.cyan('cursor')} and ${chalk.cyan('claude')}.

Examples:
  ${chalk.gray('$')} sg add                       ${chalk.dim('# Enter interactive installation')}
  ${chalk.gray('$')} sg add git-commit cursor      ${chalk.dim('# Install via link (default)')}
  ${chalk.gray('$')} sg add git-commit cursor -m copy ${chalk.dim('# Install via copy')}
  ${chalk.gray('$')} sg add hello-world vscode    ${chalk.dim('# Add to VSCode instructions file')}
  `)
  .action((skillName, platform, options) => {
    installCommand(skillName, platform, options);
  });

program
  .command('rm')
  .alias('remove')
  .description('Remove an installed skill from a specific platform (enters interactive mode if no arguments provided)')
  .argument('[skill-name]', 'Name of the skill to remove')
  .argument('[platform]', 'Target platform (choices: cursor, claude, vscode)')
  .option('-g, --global', 'Remove from global directory (supported for cursor and claude)', false)
  .addHelpText('after', `
Available Platforms:
  ${chalk.cyan('cursor')}  - Remove from Cursor skills directory
  ${chalk.cyan('claude')}  - Remove from Claude skills directory
  ${chalk.cyan('vscode')}  - Remove from .github/copilot-instructions.md

Note:
  The ${chalk.yellow('--global')} flag only applies to ${chalk.cyan('cursor')} and ${chalk.cyan('claude')}.

Examples:
  ${chalk.gray('$')} sg rm                         ${chalk.dim('# Enter interactive removal')}
  ${chalk.gray('$')} sg rm git-commit cursor       ${chalk.dim('# Remove skill from local Cursor')}
  `)
  .action((skillName, platform, options) => {
    removeCommand(skillName, platform, options);
  });

// Repo management commands
const repo = program.command('repo').description('Manage GitHub skill repository sources');

repo
  .command('add')
  .description('Add a new GitHub skill repository')
  .argument('<url>', 'GitHub repository URL (e.g., https://github.com/owner/repo)')
  .action((url) => {
    if (addRepo(url)) {
      console.log(chalk.green(`✔ Successfully added repository: ${url}`));
    } else {
      console.log(chalk.yellow(`! Repository already exists: ${url}`));
    }
  });

repo
  .command('rm')
  .alias('remove')
  .description('Remove a configured skill repository')
  .argument('[url]', 'Repository URL to remove (enters interactive selection if missing)')
  .action(async (url) => {
    const repos = getRepos();
    if (repos.length === 0) {
      console.log(chalk.yellow('No repositories configured.'));
      return;
    }

    let urlToRemove = url;
    if (!urlToRemove) {
      const { Select } = enquirer as any;
      const prompt = new Select({
        name: 'repo',
        message: 'Select a repository to remove:',
        choices: repos.map((r: any) => r.url)
      });
      try {
        urlToRemove = await prompt.run();
      } catch (e) { return; }
    }

    if (removeRepo(urlToRemove)) {
      console.log(chalk.green(`✔ Successfully removed repository: ${urlToRemove}`));
    } else {
      console.log(chalk.yellow(`! Repository not found: ${urlToRemove}`));
    }
  });

repo
  .command('list')
  .alias('ls')
  .description('List all configured skill repositories')
  .action(() => {
    const repos = getRepos();
    const activeUrl = getActiveRepoUrl();
    if (repos.length === 0) {
      console.log(chalk.yellow('No repositories configured. Use `sg repo add <url>` to add one.'));
      return;
    }
    console.log(chalk.bold('\nConfigured Repositories:'));
    repos.forEach((r: any) => {
      if (r.url === activeUrl) {
        console.log(chalk.green(`  * ${r.url} ${chalk.dim('(active)')}`));
      } else {
        console.log(`    ${r.url}`);
      }
    });
    console.log('');
  });

repo
  .command('use')
  .description('Switch the active repository')
  .argument('[url]', 'Repository URL (enters interactive selection if missing)')
  .action(async (url) => {
    const repos = getRepos();
    if (repos.length === 0) {
      console.log(chalk.yellow('No repositories configured. Use `sg repo add <url>` to add one.'));
      return;
    }

    let urlToUse = url;
    if (!urlToUse) {
      const activeUrl = getActiveRepoUrl();
      const { Select } = enquirer as any;
      const prompt = new Select({
        name: 'repo',
        message: 'Select a repository to activate:',
        choices: repos.map((r: any) => ({
          name: r.url,
          message: r.url + (r.url === activeUrl ? chalk.dim(' (already active)') : '')
        }))
      });
      try {
        urlToUse = await prompt.run();
      } catch (e) { return; }
    }

    if (repos.find((r: any) => r.url === urlToUse)) {
      setActiveRepoUrl(urlToUse);
      console.log(chalk.green(`✔ Active repository switched to: ${urlToUse}`));
    } else {
      console.log(chalk.red(`✘ Repository not found. Add it first using \`sg repo add ${urlToUse}\``));
    }
  });

// Main help page footer
program.addHelpText('after', `
${chalk.bold('Common Usage Examples:')}
  ${chalk.gray('$')} sg status                 ${chalk.dim('# Show environment overview')}
  ${chalk.gray('$')} sg repo add <url>        ${chalk.dim('# Add a new skill source')}
  ${chalk.gray('$')} sg ls -r                  ${chalk.dim('# Switch repo and list skills interactively')}
  ${chalk.gray('$')} sg add                    ${chalk.dim('# Interactive skill installation')}
  ${chalk.gray('$')} sg rm                     ${chalk.dim('# Interactive skill removal')}

${chalk.cyan('Note:')} Most commands enter ${chalk.bold('Interactive Mode')} when run without arguments, making it easier to use.
`);

program.parse(process.argv);
