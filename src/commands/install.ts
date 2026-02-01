import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { fetchRepoContents, downloadFile, RepoContent, parseRepoUrl } from '../utils/git.js';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
  getLibraryDir,
} from '../utils/paths.js';
import { getAllInstalledSkillsWithLocations } from '../utils/installed.js';
import { getRepoUrl } from '../utils/config.js';

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
  options: { global: boolean, method?: string }
) {
  try {
    let selectedSkill = skillName;
    let selectedPlatform = platform;
    let selectedMethod = options.method || 'link';

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

      // 获取已安装技能及其位置
      const installedInfo = await getAllInstalledSkillsWithLocations();

      const { Select } = enquirer as any;
      const skillPrompt = new Select({
        name: 'skill',
        message: 'Select a skill to add:',
        choices: skills.map(name => {
          const locations = installedInfo[name];
          return {
            name,
            message: locations 
              ? `${name} ${chalk.dim(`(installed: ${locations.join(', ')})`)}` 
              : name
          };
        })
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

    // 3. 如果是 Cursor 或 Claude，且没有显式提供 method，进行交互式选择
    const isVscode = selectedPlatform!.toLowerCase() === 'vscode';
    if (!isVscode && !options.method) {
      const { Select } = enquirer as any;
      const methodPrompt = new Select({
        name: 'method',
        message: 'Select installation method:',
        choices: [
          { name: 'link', message: 'Symbolic Link (Recommended - stays updated with library)' },
          { name: 'copy', message: 'Copy (Static snapshot)' }
        ],
        default: 'link'
      });
      selectedMethod = await methodPrompt.run();
    }

    console.log(chalk.blue(`Adding skill "${selectedSkill}" to ${selectedPlatform} via ${selectedMethod}...`));
    
    // 获取该 skill 的内容
    const skillPath = `skills/${selectedSkill}`;
    const contents = await fetchRepoContents(skillPath);

    let targetDir = '';

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
        // VSCode doesn't support symlink/copy, it's always an append
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
      await fs.ensureDir(targetDir);

      if (selectedMethod === 'link') {
        const repoUrl = getRepoUrl();
        const { owner, repo } = parseRepoUrl(repoUrl);
        const librarySkillDir = path.join(getLibraryDir(), owner, repo, 'skills', selectedSkill!);
        
        // 1. 下载到 Library
        console.log(chalk.dim(`Updating skill library at ${librarySkillDir}...`));
        await fs.ensureDir(librarySkillDir);
        await downloadDirectory(contents, librarySkillDir, repoUrl);

        // 2. 创建真实目录并在内部创建 Symlink，以提高 IDE 识别率
        if (await fs.pathExists(targetSkillDir)) {
          await fs.remove(targetSkillDir); // Remove existing copy or link
        }
        await fs.ensureDir(targetSkillDir); // 创建真实目录

        const files = await fs.readdir(librarySkillDir);
        for (const file of files) {
          const srcPath = path.join(librarySkillDir, file);
          const destPath = path.join(targetSkillDir, file);
          const stats = await fs.stat(srcPath);
          await fs.ensureSymlink(srcPath, destPath, stats.isDirectory() ? 'dir' : 'file');
        }
        console.log(chalk.green(`Successfully linked skill "${selectedSkill}" to ${targetSkillDir}`));
      } else {
        // Copy method
        if (await fs.pathExists(targetSkillDir)) {
          await fs.remove(targetSkillDir);
        }
        await fs.ensureDir(targetSkillDir);
        await downloadDirectory(contents, targetSkillDir);
        console.log(chalk.green(`Successfully added skill "${selectedSkill}" to ${targetSkillDir}`));
      }
    }
  } catch (error: any) {
    if (error === '') return; // Handle Enquirer cancellation
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
