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
    console.log(chalk.bold('\n--- sk-get Status ---\n'));

    // Repository Info
    const repos = getRepos();
    const activeRepo = getActiveRepoUrl();
    console.log(chalk.cyan('Repository Configuration:'));
    console.log(`  Active Repo: ${activeRepo ? chalk.green(activeRepo) : chalk.yellow('None')}`);
    console.log(`  Total Configured: ${repos.length}\n`);

    // Local Project Skills
    console.log(chalk.cyan('Local Project Skills:'));
    const cursorLocal = await getInstalledSkills(getLocalCursorSkillsDir());
    const vscodeLocal = await getVscodeSkills(getVscodeInstructionsPath());
    const claudeLocal = await getInstalledSkills(getLocalClaudeSkillsDir());

    if (cursorLocal.length === 0 && vscodeLocal.length === 0 && claudeLocal.length === 0) {
      console.log(chalk.dim('  No local skills detected.'));
    } else {
      if (cursorLocal.length > 0) console.log(`  Cursor: ${cursorLocal.join(', ')}`);
      if (vscodeLocal.length > 0) console.log(`  VSCode: ${vscodeLocal.join(', ')}`);
      if (claudeLocal.length > 0) console.log(`  Claude: ${claudeLocal.join(', ')}`);
    }
    console.log('');

    // Global Skills
    console.log(chalk.cyan('Global Skills:'));
    const cursorGlobal = await getInstalledSkills(getGlobalCursorSkillsDir());
    const claudeGlobal = await getInstalledSkills(getGlobalClaudeSkillsDir());

    if (cursorGlobal.length === 0 && claudeGlobal.length === 0) {
      console.log(chalk.dim('  No global skills detected.'));
    } else {
      if (cursorGlobal.length > 0) console.log(`  Cursor (Global): ${cursorGlobal.join(', ')}`);
      if (claudeGlobal.length > 0) console.log(`  Claude (Global): ${claudeGlobal.join(', ')}`);
    }
    console.log('\n---------------------\n');
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}
