import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { fetchRepoContents, downloadFile, RepoContent } from '../utils/git.js';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from '../utils/paths.js';

async function downloadDirectory(contents: RepoContent[], targetDir: string, repoUrlOverride?: string) {
  for (const item of contents) {
    const targetPath = path.join(targetDir, item.name);
    if (item.type === 'file' && item.downloadUrl) {
      const content = await downloadFile(item.downloadUrl);
      await fs.outputFile(targetPath, content);
    } else if (item.type === 'dir') {
      const subContents = await fetchRepoContents(item.path, repoUrlOverride);
      await downloadDirectory(subContents, targetPath, repoUrlOverride);
    }
  }
}

export async function installCommand(
  skillName: string | undefined,
  platform: string | undefined,
  options: { global: boolean }
) {
  try {
    let selectedSkill = skillName;
    let selectedPlatform = platform;

    // 1. 如果没有提供 skillName，进行交互式选择
    if (!selectedSkill) {
      console.log(chalk.blue('Fetching available skills...'));
      const contents = await fetchRepoContents('skills');
      const skills = contents
        .filter(item => item.type === 'dir')
        .map(item => item.name);

      if (skills.length === 0) {
        console.log(chalk.yellow('No skills found in the repository.'));
        return;
      }

      const { Select } = enquirer as any;
      const skillPrompt = new Select({
        name: 'skill',
        message: 'Select a skill to add:',
        choices: skills
      });
      selectedSkill = await skillPrompt.run();
    }

    // 2. 如果没有提供 platform，进行交互式选择
    if (!selectedPlatform) {
      const { Select } = enquirer as any;
      const platformPrompt = new Select({
        name: 'platform',
        message: 'Select a target platform:',
        choices: [
          { name: 'cursor', message: 'Cursor' },
          { name: 'claude', message: 'Claude' },
          { name: 'vscode', message: 'VSCode' }
        ]
      });
      selectedPlatform = await platformPrompt.run();
    }

    console.log(chalk.blue(`Adding skill "${selectedSkill}" to ${selectedPlatform}...`));
    
    // 获取该 skill 的内容
    const skillPath = `skills/${selectedSkill}`;
    const contents = await fetchRepoContents(skillPath);

    let targetDir = '';
    let isVscode = false;

    switch (selectedPlatform!.toLowerCase()) {
      case 'cursor':
        targetDir = options.global
          ? getGlobalCursorSkillsDir()
          : getLocalCursorSkillsDir();
        break;
      case 'claude':
        targetDir = options.global
          ? getGlobalClaudeSkillsDir()
          : getLocalClaudeSkillsDir();
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

    if (isVscode) {
      const vscodePath = getVscodeInstructionsPath();
      const skillMdFile = contents.find(f => f.name === 'SKILL.md');
      
      if (!skillMdFile || !skillMdFile.downloadUrl) {
        console.error(chalk.red(`Error: SKILL.md not found in skill "${selectedSkill}".`));
        return;
      }

      const skillContent = await downloadFile(skillMdFile.downloadUrl);
      await fs.ensureDir(path.dirname(vscodePath));
      
      let existingContent = '';
      if (await fs.pathExists(vscodePath)) {
        existingContent = await fs.readFile(vscodePath, 'utf8');
      }

      if (existingContent.includes(skillContent)) {
        console.log(chalk.yellow(`Skill "${selectedSkill}" is already added to VSCode instructions.`));
      } else {
        const newContent = existingContent 
          ? `${existingContent}\n\n--- \n\n# Skill: ${selectedSkill}\n${skillContent}`
          : `# Skill: ${selectedSkill}\n${skillContent}`;
        await fs.writeFile(vscodePath, newContent);
        console.log(chalk.green(`Successfully added skill "${selectedSkill}" to ${vscodePath}`));
      }
    } else {
      const targetSkillDir = path.join(targetDir, selectedSkill!);
      await fs.ensureDir(targetSkillDir);
      await downloadDirectory(contents, targetSkillDir);
      console.log(chalk.green(`Successfully added skill "${selectedSkill}" to ${targetSkillDir}`));
    }
  } catch (error: any) {
    if (error === '') return; // Handle Enquirer cancellation
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
