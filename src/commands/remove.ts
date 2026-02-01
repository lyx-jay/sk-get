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

export async function removeCommand(
  skillName: string | undefined,
  platform: string | undefined,
  options: { global: boolean }
) {
  try {
    let selectedPlatform = platform;
    let selectedSkill = skillName;
    let isGlobal = options.global;

    // 1. 如果完全没有提供参数，列出所有已安装的技能及其位置，供用户直接选择
    if (!selectedSkill && !selectedPlatform) {
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

      const { Select } = enquirer as any;
      const prompt = new Select({
        name: 'selection',
        message: 'Select a skill to remove:',
        choices: choices
      });

      const selection = await prompt.run();
      const [name, loc] = selection.split('|');
      selectedSkill = name;
      
      // 解析位置
      if (loc === 'Cursor') { selectedPlatform = 'cursor'; isGlobal = false; }
      else if (loc === 'Cursor (Global)') { selectedPlatform = 'cursor'; isGlobal = true; }
      else if (loc === 'Claude') { selectedPlatform = 'claude'; isGlobal = false; }
      else if (loc === 'Claude (Global)') { selectedPlatform = 'claude'; isGlobal = true; }
      else if (loc === 'VSCode') { selectedPlatform = 'vscode'; isGlobal = false; }
    }

    // 后续逻辑保持不变，但使用确定的 selectedPlatform, selectedSkill, isGlobal
    let targetDir = '';
    let isVscode = false;

    switch (selectedPlatform!.toLowerCase()) {
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
        console.error(chalk.red(`Error: Unsupported platform "${selectedPlatform}".`));
        return;
    }

    if (isVscode) {
      const vscodePath = getVscodeInstructionsPath();
      if (!(await fs.pathExists(vscodePath))) return;

      const content = await fs.readFile(vscodePath, 'utf8');
      const skillHeader = `# Skill: ${selectedSkill}`;
      if (!content.includes(skillHeader)) return;

      const lines = content.split('\n');
      let startIndex = -1;
      let endIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === skillHeader) {
          startIndex = i;
          if (i > 0 && lines[i-1].trim() === '---') startIndex = i - 1;
          if (i > 1 && lines[i-2].trim() === '') startIndex = i - 2;
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
          console.log(chalk.green(`Successfully removed skill "${selectedSkill}" from VSCode`));
        }
      }
    } else {
      const targetSkillDir = path.join(targetDir, selectedSkill!);
      if (!(await fs.pathExists(targetSkillDir))) {
        console.log(chalk.yellow(`Skill "${selectedSkill}" is not installed at ${targetSkillDir}`));
        return;
      }

      await fs.remove(targetSkillDir);
      console.log(chalk.green(`Successfully removed skill "${selectedSkill}" from ${selectedPlatform} ${isGlobal ? '(Global)' : ''}`));
      
      const remaining = await fs.readdir(targetDir);
      if (remaining.length === 0) await fs.remove(targetDir);
    }
  } catch (error: any) {
    if (error === '') return;
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
