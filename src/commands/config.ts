import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { getRepos, getActiveRepoUrl, setActiveRepoUrl, addRepo } from '../utils/config.js';
import { getAllInstalledSkillsDetailed } from '../utils/installed.js';
import { performInstallation } from './install.js';

export async function exportConfig(outputPath: string | undefined) {
  try {
    const finalPath = outputPath || path.join(process.cwd(), 'sk-get-config.json');
    const configData = {
      repos: getRepos(),
      activeRepoUrl: getActiveRepoUrl(),
      installedSkills: await getAllInstalledSkillsDetailed()
    };

    await fs.writeJson(finalPath, configData, { spaces: 2 });
    console.log(chalk.green(`✔ Configuration exported to: ${finalPath}`));
  } catch (error: any) {
    console.error(chalk.red(`Error exporting config: ${error.message}`));
  }
}

export async function importConfig(inputPath: string | undefined) {
  try {
    const finalPath = inputPath || path.join(process.cwd(), 'sk-get-config.json');
    if (!(await fs.pathExists(finalPath))) {
      console.error(chalk.red(`Error: Config file not found at ${finalPath}`));
      return;
    }

    const configData = await fs.readJson(finalPath);
    
    // 1. Import repos
    if (configData.repos && Array.isArray(configData.repos)) {
      let addedCount = 0;
      for (const repo of configData.repos) {
        if (addRepo(repo.url)) addedCount++;
      }
      console.log(chalk.green(`✔ Imported ${addedCount} new repositories.`));
    }

    // 2. Set active repo
    if (configData.activeRepoUrl) {
      setActiveRepoUrl(configData.activeRepoUrl);
      console.log(chalk.green(`✔ Set active repository to: ${configData.activeRepoUrl}`));
    }

    // 3. Handle skills installation
    if (configData.installedSkills && Array.isArray(configData.installedSkills) && configData.installedSkills.length > 0) {
      const { Confirm } = enquirer as any;
      const confirmPrompt = new Confirm({
        name: 'install',
        message: `Found ${configData.installedSkills.length} skills in config. Do you want to install them now?`,
        initial: true
      });

      const shouldInstall = await confirmPrompt.run();
      if (shouldInstall) {
        for (const skill of configData.installedSkills) {
          try {
            // For 'append' (VSCode), we don't really have a method choice, it's just append.
            // But performInstallation handles it via platform check.
            const method = skill.method === 'append' ? 'link' : skill.method;
            
            // If skill has a repoUrl, we should ensure it's used for installation
            if (skill.repoUrl) {
              const originalActiveRepo = getActiveRepoUrl();
              try {
                setActiveRepoUrl(skill.repoUrl);
                await performInstallation(skill.name, skill.platform, skill.global, method);
              } finally {
                if (originalActiveRepo) {
                  setActiveRepoUrl(originalActiveRepo);
                }
              }
            } else {
              await performInstallation(skill.name, skill.platform, skill.global, method);
            }
          } catch (e: any) {
            console.error(chalk.yellow(`! Failed to install skill "${skill.name}": ${e.message}`));
          }
        }
        console.log(chalk.green(`\n✔ Installation tasks completed!`));
      }
    }

    console.log(chalk.green(`\n✔ Configuration imported successfully!`));
  } catch (error: any) {
    console.error(chalk.red(`Error importing config: ${error.message}`));
  }
}
