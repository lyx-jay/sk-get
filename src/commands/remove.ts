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
import { getInstalledSkills, getVscodeSkills } from '../utils/installed.js';

export async function removeCommand(
  skillName: string | undefined,
  platform: string | undefined,
  options: { global: boolean }
) {
  try {
    let selectedPlatform = platform;

    // 1. 如果没有提供 platform，进行交互式选择
    if (!selectedPlatform) {
      const { Select } = enquirer as any;
      const platformPrompt = new Select({
        name: 'platform',
        message: 'Select platform to remove skill from:',
        choices: [
          { name: 'cursor', message: 'Cursor' },
          { name: 'claude', message: 'Claude' },
          { name: 'vscode', message: 'VSCode' }
        ]
      });
      selectedPlatform = await platformPrompt.run();
    }

    let targetDir = '';
    let isVscode = false;

    switch (selectedPlatform!.toLowerCase()) {
      case 'cursor':
        targetDir = options.global ? getGlobalCursorSkillsDir() : getLocalCursorSkillsDir();
        break;
      case 'claude':
        targetDir = options.global ? getGlobalClaudeSkillsDir() : getLocalClaudeSkillsDir();
        break;
      case 'vscode':
        isVscode = true;
        break;
      default:
        console.error(
          chalk.red(
            `Error: Unsupported platform "${selectedPlatform}". Use cursor, claude, or vscode.`
          )
        );
        return;
    }

    let selectedSkill = skillName;

    // 2. 如果没有提供 skillName，扫描已安装的 skill 并交互式选择
    if (!selectedSkill) {
      let installedSkills: string[] = [];
      if (isVscode) {
        installedSkills = await getVscodeSkills(getVscodeInstructionsPath());
      } else {
        installedSkills = await getInstalledSkills(targetDir);
      }

      if (installedSkills.length === 0) {
        console.log(chalk.yellow(`No skills found on ${selectedPlatform} (${options.global ? 'global' : 'local'}).`));
        return;
      }

      const { Select } = enquirer as any;
      const skillPrompt = new Select({
        name: 'skill',
        message: `Select a skill to remove from ${selectedPlatform}:`,
        choices: installedSkills
      });
      selectedSkill = await skillPrompt.run();
    }

    if (isVscode) {
      const vscodePath = getVscodeInstructionsPath();
      
      if (!(await fs.pathExists(vscodePath))) {
        console.log(chalk.yellow(`VSCode instructions file not found at ${vscodePath}`));
        return;
      }

      const content = await fs.readFile(vscodePath, 'utf8');
      const skillHeader = `# Skill: ${selectedSkill}`;
      
      if (!content.includes(skillHeader)) {
        console.log(chalk.yellow(`Skill "${selectedSkill}" not found in VSCode instructions.`));
        return;
      }

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
          console.log(chalk.green(`Successfully removed skill "${selectedSkill}" from ${vscodePath}`));
        }
      }
    } else {
      const targetSkillDir = path.join(targetDir, selectedSkill!);
      
      if (!(await fs.pathExists(targetSkillDir))) {
        console.log(chalk.yellow(`Skill "${selectedSkill}" is not installed at ${targetSkillDir}`));
        return;
      }

      await fs.remove(targetSkillDir);
      console.log(chalk.green(`Successfully removed skill "${selectedSkill}" from ${targetSkillDir}`));
      
      const remaining = await fs.readdir(targetDir);
      if (remaining.length === 0) {
        await fs.remove(targetDir);
      }
    }
  } catch (error: any) {
    if (error === '') return;
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
