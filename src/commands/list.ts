import chalk from 'chalk';
import enquirer from 'enquirer';
import { fetchRepoContents } from '../utils/git.js';
import { 
  setCachedSkills, 
  getCachedSkills, 
  getLastUpdated, 
  getRepos, 
  getActiveRepoUrl, 
  setActiveRepoUrl 
} from '../utils/config.js';

export async function listCommand(options: { repo?: boolean }) {
  try {
    let repoUrl = getActiveRepoUrl();

    if (options.repo) {
      const repos = getRepos();
      if (repos.length === 0) {
        console.log(chalk.yellow('No repositories configured. Use `sg repo add <url>` to add one.'));
        return;
      }

      const { Select } = enquirer as any;
      const prompt = new Select({
        name: 'repo',
        message: 'Select a repository to list skills from:',
        choices: repos.map((r: any) => ({
          name: r.url,
          message: r.url + (r.url === repoUrl ? chalk.dim(' (current)') : '')
        }))
      });

      repoUrl = await prompt.run();
      setActiveRepoUrl(repoUrl);
      console.log(chalk.blue(`Switched to repository: ${repoUrl}`));
    }

    if (!repoUrl) {
      console.log(chalk.red('No active repository set. Use `sg repo use <url>` or `sg ls -r` to select one.'));
      return;
    }

    console.log(chalk.blue(`Fetching available skills from ${repoUrl}...`));
    
    // 1. 获取 API 内容
    const contents = await fetchRepoContents('skills', repoUrl);
    
    // 2. 提取目录名作为 skill
    const skills = contents
      .filter(item => item.type === 'dir')
      .map(item => item.name);

    if (skills.length === 0) {
      console.log(chalk.yellow('No skills found in the repository.'));
      return;
    }

    // 3. 更新本地记录
    setCachedSkills(skills);

    // 4. 显示结果
    console.log(chalk.green('Available skills (Updated):'));
    skills.forEach((skill) => {
      console.log(` - ${skill}`);
    });
  } catch (error: any) {
    if (error === '') return; // Handle Enquirer cancellation (Ctrl+C)
    console.error(chalk.red(`Error: ${error.message || error}`));
    
    // 如果失败了，尝试显示本地缓存
    const cached = getCachedSkills();
    if (cached && cached.length > 0) {
      console.log(chalk.yellow(`\nShowing locally cached skills (Last updated: ${getLastUpdated()}):`));
      cached.forEach((skill) => {
        console.log(` - ${skill}`);
      });
    }
  }
}
