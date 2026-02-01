import fs from 'fs-extra';
import chalk from 'chalk';
import { getRepos, getActiveRepoUrl } from '../utils/config.js';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from '../utils/paths.js';
import { getInstalledSkills, getVscodeSkills } from '../utils/installed.js';

export async function statusCommand() {
  try {
    console.log(chalk.bold('\n--- SKILLS Status ---\n'));

    // 1. Repositories
    const repos = getRepos();
    const activeRepo = getActiveRepoUrl();
    console.log(chalk.cyan('📦 Repositories:'));
    if (repos.length === 0) {
      console.log(chalk.dim('  No repositories configured. Use `sg repo add <url>` to add one.'));
    } else {
      repos.forEach((r: any) => {
        if (r.url === activeRepo) {
          console.log(chalk.green(`  * ${r.url} ${chalk.dim('(active)')}`));
        } else {
          console.log(`    ${r.url}`);
        }
      });
    }
    console.log('');

    // 2. Local Project Skills
    console.log(chalk.cyan('📍 Local (Current Project):'));
    const cursorLocal = await getInstalledSkills(getLocalCursorSkillsDir());
    const vscodeLocal = await getVscodeSkills(getVscodeInstructionsPath());
    const claudeLocal = await getInstalledSkills(getLocalClaudeSkillsDir());

    const hasLocal = cursorLocal.length > 0 || vscodeLocal.length > 0 || claudeLocal.length > 0;
    if (!hasLocal) {
      console.log(chalk.dim('  No local skills detected.'));
    } else {
      cursorLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Cursor]')}`));
      vscodeLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[VSCode]')}`));
      claudeLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Claude]')}`));
    }
    console.log('');

    // 3. Global Skills
    console.log(chalk.cyan('🌍 Global:'));
    const cursorGlobal = await getInstalledSkills(getGlobalCursorSkillsDir());
    const claudeGlobal = await getInstalledSkills(getGlobalClaudeSkillsDir());

    const hasGlobal = cursorGlobal.length > 0 || claudeGlobal.length > 0;
    if (!hasGlobal) {
      console.log(chalk.dim('  No global skills detected.'));
    } else {
      cursorGlobal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Cursor (Global)]')}`));
      claudeGlobal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Claude (Global)]')}`));
    }

    console.log('\n---------------------\n');
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}
