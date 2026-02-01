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

async function performInstallation(
  skillName: string,
  platform: string,
  isGlobal: boolean,
  method: string
) {
  console.log(chalk.blue(`\nAdding skill "${skillName}" to ${platform} via ${method}...`));
  
  // 获取该 skill 的内容
  const skillPath = `skills/${skillName}`;
  const contents = await fetchRepoContents(skillPath);

  let targetDir = '';
  const isVscode = platform.toLowerCase() === 'vscode';

  switch (platform.toLowerCase()) {
    case 'cursor':
      targetDir = isGlobal ? getGlobalCursorSkillsDir() : getLocalCursorSkillsDir();
      break;
    case 'claude':
      targetDir = isGlobal ? getGlobalClaudeSkillsDir() : getLocalClaudeSkillsDir();
      break;
    case 'vscode':
      break;
    default:
      console.error(chalk.red(`Error: Unsupported platform "${platform}".`));
      return;
  }

  if (isVscode) {
    const vscodePath = getVscodeInstructionsPath();
    const skillMdFile = contents.find(f => f.name === 'SKILL.md');
    
    if (!skillMdFile || !skillMdFile.downloadUrl) {
      console.error(chalk.red(`Error: SKILL.md not found in skill "${skillName}".`));
      return;
    }

    const skillContent = await downloadFile(skillMdFile.downloadUrl);
    await fs.ensureDir(path.dirname(vscodePath));
    
    let existingContent = '';
    if (await fs.pathExists(vscodePath)) {
      existingContent = await fs.readFile(vscodePath, 'utf8');
    }

    if (existingContent.includes(skillContent)) {
      console.log(chalk.yellow(`Skill "${skillName}" is already added to VSCode instructions.`));
    } else {
      const newContent = existingContent 
        ? `${existingContent}\n\n--- \n\n# Skill: ${skillName}\n${skillContent}`
        : `# Skill: ${skillName}\n${skillContent}`;
      await fs.writeFile(vscodePath, newContent);
      console.log(chalk.green(`Successfully added skill "${skillName}" to ${vscodePath}`));
    }
  } else {
    const targetSkillDir = path.join(targetDir, skillName);
    await fs.ensureDir(targetDir);

    if (method === 'link') {
      const repoUrl = getRepoUrl();
      const { owner, repo } = parseRepoUrl(repoUrl);
      const librarySkillDir = path.join(getLibraryDir(), owner, repo, 'skills', skillName);
      
      // 1. 下载到 Library
      console.log(chalk.dim(`Updating skill library at ${librarySkillDir}...`));
      await fs.ensureDir(librarySkillDir);
      await downloadDirectory(contents, librarySkillDir, repoUrl);

      // 2. 创建真实目录并在内部创建 Symlink
      if (await fs.pathExists(targetSkillDir)) {
        await fs.remove(targetSkillDir); 
      }
      await fs.ensureDir(targetSkillDir);

      const files = await fs.readdir(librarySkillDir);
      for (const file of files) {
        const srcPath = path.join(librarySkillDir, file);
        const destPath = path.join(targetSkillDir, file);
        const stats = await fs.stat(srcPath);
        await fs.ensureSymlink(srcPath, destPath, stats.isDirectory() ? 'dir' : 'file');
      }
      console.log(chalk.green(`Successfully linked skill "${skillName}" to ${targetSkillDir}`));
    } else {
      // Copy method
      if (await fs.pathExists(targetSkillDir)) {
        await fs.remove(targetSkillDir);
      }
      await fs.ensureDir(targetSkillDir);
      await downloadDirectory(contents, targetSkillDir);
      console.log(chalk.green(`Successfully added skill "${skillName}" to ${targetSkillDir}`));
    }
  }
}

export async function installCommand(
  skillName: string | undefined,
  platform: string | undefined,
  options: { global: boolean, method?: string }
) {
  try {
    let selectedSkills: string[] = [];
    let selectedPlatform = platform;
    let selectedMethod = options.method || 'link';

    // 1. 获取技能列表
    if (skillName) {
      selectedSkills = skillName.split(',').map(s => s.trim()).filter(s => s !== '');
    } else {
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

      const { MultiSelect } = enquirer as any;
      const skillPrompt = new MultiSelect({
        name: 'skills',
        message: 'Select skills to add (Space to select, Enter to confirm):',
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
      selectedSkills = await skillPrompt.run();
    }

    if (selectedSkills.length === 0) {
      console.log(chalk.yellow('No skills selected.'));
      return;
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

    // 4. 执行所有安装
    for (const name of selectedSkills) {
      await performInstallation(name, selectedPlatform!, options.global, selectedMethod);
    }
    
    console.log(chalk.green(`\n✔ All tasks completed!`));

  } catch (error: any) {
    if (error === '') return; // Handle Enquirer cancellation
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
