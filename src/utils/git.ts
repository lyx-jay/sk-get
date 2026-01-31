import { getRepoUrl } from './config.js';

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
}

export function parseGitHubUrl(url: string) {
  if (!url) {
    throw new Error('Repository URL is not set. Please use `sg config set-repo <url>` to configure it.');
  }
  try {
    const cleanUrl = url.replace(/\.git$/, '');
    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Only GitHub repositories are supported currently via API.');
    }
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repo');
    }
    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch (error: any) {
    throw new Error(`Failed to parse repository URL: ${error.message}`);
  }
}

export async function fetchRepoContents(path: string = '', repoUrlOverride?: string): Promise<GitHubContent[]> {
  const repoUrl = repoUrlOverride || getRepoUrl();
  const { owner, repo } = parseGitHubUrl(repoUrl);
  
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'sk-get-cli'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Path "${path}" not found in repository.`);
    }
    throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
  }

  return response.json() as Promise<GitHubContent[]>;
}

export async function downloadFile(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return response.text();
}
