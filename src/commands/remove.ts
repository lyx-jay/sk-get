import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import enquirer from 'enquirer';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from '../utils/paths.js';
import { getInstalledSkills, getVscodeSkills, getAllInstalledSkillsWithLocations } from '../utils/installed.js';

async function performRemoval(
  skillName: string,
  platform: string,
  isGlobal: boolean
) {
  let targetDir = '';
  let isVscode = false;

  switch (platform.toLowerCase()) {
    case 'cursor':
      targetDir = isGlobal ? getGlobalCursorSkillsDir() : getLocalCursorSkillsDir();
      break;
    case 'claude':
      targetDir = isGlobal ? getGlobalClaudeSkillsDir() : getLocalClaudeSkillsDir();
      break;
    case 'vscode':
      isVscode = true;
      break;
    default:
      console.error(chalk.red(`Error: Unsupported platform "${platform}".`));
      return;
  }

  if (isVscode) {
    const vscodePath = getVscodeInstructionsPath();
    if (!(await fs.pathExists(vscodePath))) return;

    const content = await fs.readFile(vscodePath, 'utf8');
    const skillHeader = `# Skill: ${skillName}`;
    if (!content.includes(skillHeader)) return;

    const lines = content.split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === skillHeader) {
        startIndex = i;
        if (i > 0 && lines[i - 1].trim() === '---') startIndex = i - 1;
        if (i > 1 && lines[i - 2].trim() === '') startIndex = i - 2;
        break;
      }
    }

    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# Skill: ') || lines[i].trim() === '---') {
          endIndex = i;
          break;
        }
      }
      if (endIndex === -1) endIndex = lines.length;

      lines.splice(startIndex, endIndex - startIndex);
      const newContent = lines.join('\n').trim();

      if (newContent === '') {
        await fs.remove(vscodePath);
        console.log(chalk.green(`Removed empty instructions file: ${vscodePath}`));
      } else {
        await fs.writeFile(vscodePath, newContent);
        console.log(chalk.green(`Successfully removed skill "${skillName}" from VSCode`));
      }
    }
  } else {
    const targetSkillDir = path.join(targetDir, skillName);
    if (!(await fs.pathExists(targetSkillDir))) {
      console.log(chalk.yellow(`Skill "${skillName}" is not installed at ${targetSkillDir}`));
      return;
    }

    await fs.remove(targetSkillDir);
    console.log(chalk.green(`Successfully removed skill "${skillName}" from ${platform} ${isGlobal ? '(Global)' : ''}`));

    const remaining = await fs.readdir(targetDir);
    if (remaining.length === 0) await fs.remove(targetDir);
  }
}

export async function removeCommand(
  skillName: string | undefined,
  platform: string | undefined,
  options: { global: boolean }
) {
  try {
    // 如果提供了参数，则执行单个删除
    if (skillName && platform) {
      await performRemoval(skillName, platform, options.global);
      return;
    }

    // 交互模式：支持多选
    const installedInfo = await getAllInstalledSkillsWithLocations();
    const choices: any[] = [];

    for (const [name, locations] of Object.entries(installedInfo)) {
      locations.forEach(loc => {
        choices.push({
          name: `${name}|${loc}`,
          message: `${name} ${chalk.dim(`(${loc})`)}`,
          value: { name, location: loc }
        });
      });
    }

    if (choices.length === 0) {
      console.log(chalk.yellow('No installed skills found.'));
      return;
    }

    const { MultiSelect } = enquirer as any;
    const prompt = new MultiSelect({
      name: 'selections',
      message: 'Select skills to remove (Space to select, Enter to confirm):',
      choices: choices,
      result(names: string[]) {
        return names; // 确保返回的是字符串数组
      }
    });

    const selections: string[] = await prompt.run();

    if (selections.length === 0) {
      console.log(chalk.gray('No skills selected.'));
      return;
    }

    for (const selection of selections) {
      const [name, loc] = selection.split('|');
      let p = '';
      let g = false;

      if (loc === 'Cursor') { p = 'cursor'; g = false; }
      else if (loc === 'Cursor (Global)') { p = 'cursor'; g = true; }
      else if (loc === 'Claude') { p = 'claude'; g = false; }
      else if (loc === 'Claude (Global)') { p = 'claude'; g = true; }
      else if (loc === 'VSCode') { p = 'vscode'; g = false; }

      await performRemoval(name, p, g);
    }
  } catch (error: any) {
    if (error === '') return;
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
