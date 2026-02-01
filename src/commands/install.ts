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
import { detectPlatforms } from '../utils/platforms.js';

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

export async function performInstallation(
  skillName: string,
  platform: string,
  isGlobal: boolean,
  method: string
) {
  console.log(chalk.blue(`\nAdding skill "${skillName}" to ${platform} via ${method}...`));
  
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
      
      console.log(chalk.dim(`Updating skill library at ${librarySkillDir}...`));
      await fs.ensureDir(librarySkillDir);
      await downloadDirectory(contents, librarySkillDir, repoUrl);

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
      if (await fs.pathExists(targetSkillDir)) {
        await fs.remove(targetSkillDir);
      }
      await fs.ensureDir(targetSkillDir);
      await downloadDirectory(contents, targetSkillDir);

      // Save metadata for 'copy' method to allow source tracking
      try {
        const repoUrl = getRepoUrl();
        await fs.writeJson(path.join(targetSkillDir, '.sk-get.json'), {
          repoUrl,
          installedAt: new Date().toISOString()
        });
      } catch (e) {
        // Silently ignore metadata write errors
      }

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
    let selectedPlatforms: string[] = [];
    let selectedMethod = options.method || 'link';

    // 1. Detect and select platforms
    if (platform) {
      selectedPlatforms = platform.split(',').map(p => p.trim().toLowerCase());
    } else {
      const detected = await detectPlatforms();
      const installed = detected.filter(p => p.isInstalled);
      
      if (installed.length === 1) {
        const p = installed[0];
        const { Confirm } = enquirer as any;
        const confirmPrompt = new Confirm({
          name: 'confirm',
          message: `Only ${chalk.cyan(p.name)} detected. Install to ${p.name}?`,
          initial: true
        });
        const ok = await confirmPrompt.run();
        if (ok) {
          selectedPlatforms = [p.id];
        } else {
           const { MultiSelect } = enquirer as any;
           const prompt = new MultiSelect({
             name: 'platforms',
             message: 'Select target platform(s):',
             choices: detected.map(d => ({ name: d.id, message: d.name }))
           });
           selectedPlatforms = await prompt.run();
        }
      } else {
        const { MultiSelect } = enquirer as any;
        const prompt = new MultiSelect({
          name: 'platforms',
          message: 'Select target platform(s):',
          choices: detected
            .filter(d => d.isInstalled) // 仅显示已安装的平台
            .map(d => ({
              name: d.id,
              message: d.name
            })),
          footer: chalk.dim('(Space to select, Enter to confirm)')
        });
        
        // 如果一个已安装平台都没有检测到，则退回到显示所有选项，但标记未检测到
        if (prompt.options.choices.length === 0) {
          prompt.options.choices = detected.map(d => ({
            name: d.id,
            message: `${d.name} ${chalk.dim('(not detected)')}`
          }));
        }

        selectedPlatforms = await prompt.run();
      }
    }

    if (selectedPlatforms.length === 0) {
      console.log(chalk.yellow('No platforms selected.'));
      return;
    }

    // 2. 获取技能列表
    if (skillName) {
      selectedSkills = skillName.split(',').map(s => s.trim()).filter(s => s !== '');
    } else {
      console.log(chalk.blue('\nFetching available skills...'));
      const contents = await fetchRepoContents('skills');
      const skills = contents
        .filter(item => item.type === 'dir')
        .map(item => item.name);

      if (skills.length === 0) {
        console.log(chalk.yellow('No skills found in the repository.'));
        return;
      }

      // 获取所选平台的目标位置标识
      const targetLocations: string[] = [];
      for (const p of selectedPlatforms) {
        if (p === 'cursor') targetLocations.push(options.global ? 'Cursor (Global)' : 'Cursor');
        else if (p === 'claude') targetLocations.push(options.global ? 'Claude (Global)' : 'Claude');
        else if (p === 'vscode') targetLocations.push('VSCode');
      }

      const installedInfo = await getAllInstalledSkillsWithLocations();

      const { MultiSelect } = enquirer as any;
      const skillChoices = skills.map(name => {
        const locations = installedInfo[name] || [];
        // 如果在所有选中的平台上都已安装，则禁用
        const installedOnSelected = targetLocations.filter(loc => locations.includes(loc));
        const isFullyInstalled = installedOnSelected.length === targetLocations.length;
        
        let msg = name;
        if (isFullyInstalled) {
          msg += ` ${chalk.dim('(already installed on all selected platforms)')}`;
        } else if (installedOnSelected.length > 0) {
          msg += ` ${chalk.dim(`(installed on: ${installedOnSelected.join(', ')})`)}`;
        } else if (locations.length > 0) {
          msg += ` ${chalk.dim(`(installed elsewhere: ${locations.join(', ')})`)}`;
        }

        return {
          name,
          message: msg,
          disabled: isFullyInstalled ? chalk.yellow('Already installed') : false
        };
      });

      const skillPrompt = new MultiSelect({
        name: 'skills',
        message: `Select skills to add:`,
        choices: skillChoices,
        footer: chalk.dim('(Space to select, Enter to confirm)')
      });
      selectedSkills = await skillPrompt.run();
    }

    if (selectedSkills.length === 0) {
      console.log(chalk.yellow('No new skills selected.'));
      return;
    }

    // 3. 如果包含 Cursor 或 Claude，且没有显式提供 method，进行交互式选择
    const needsMethod = selectedPlatforms.some(p => p !== 'vscode');
    if (needsMethod && !options.method) {
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
    for (const p of selectedPlatforms) {
      for (const name of selectedSkills) {
        await performInstallation(name, p, options.global, selectedMethod);
      }
    }
    
    console.log(chalk.green(`\n✔ All tasks completed!`));

  } catch (error: any) {
    if (error === '') return; 
    console.error(chalk.red(`Error: ${error.message || error}`));
  }
}
