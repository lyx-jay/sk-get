import fs from 'fs-extra';
import chalk from 'chalk';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from '../utils/paths.js';

async function getInstalledSkills(targetDir: string): Promise<string[]> {
  if (!(await fs.pathExists(targetDir))) return [];
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function getVscodeSkills(vscodePath: string): Promise<string[]> {
  if (!(await fs.pathExists(vscodePath))) return [];
  const content = await fs.readFile(vscodePath, 'utf8');
  const matches = content.matchAll(/^# Skill: (.+)$/gm);
  return Array.from(matches).map(m => m[1].trim());
}

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
