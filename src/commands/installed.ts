import fs from 'fs-extra';
import chalk from 'chalk';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from '../utils/paths.js';
import { getInstalledSkills, getVscodeSkills } from '../utils/installed.js';

export async function installedCommand() {
  try {
    console.log(chalk.bold('\n--- Installed AI Agent Skills ---\n'));

    // Local
    console.log(chalk.cyan('📍 Local (Current Project):'));
    const cursorLocal = await getInstalledSkills(getLocalCursorSkillsDir());
    const vscodeLocal = await getVscodeSkills(getVscodeInstructionsPath());
    const claudeLocal = await getInstalledSkills(getLocalClaudeSkillsDir());

    if (cursorLocal.length === 0 && vscodeLocal.length === 0 && claudeLocal.length === 0) {
      console.log(chalk.dim('  (None)'));
    } else {
      cursorLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Cursor]')}`));
      vscodeLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[VSCode]')}`));
      claudeLocal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Claude]')}`));
    }

    // Global
    console.log(chalk.cyan('\n🌍 Global:'));
    const cursorGlobal = await getInstalledSkills(getGlobalCursorSkillsDir());
    const claudeGlobal = await getInstalledSkills(getGlobalClaudeSkillsDir());

    if (cursorGlobal.length === 0 && claudeGlobal.length === 0) {
      console.log(chalk.dim('  (None)'));
    } else {
      cursorGlobal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Cursor (Global)]')}`));
      claudeGlobal.forEach(s => console.log(`  - ${s} ${chalk.dim('[Claude (Global)]')}`));
    }

    console.log('\n----------------------------------\n');
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}
