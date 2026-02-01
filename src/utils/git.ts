import { getRepoUrl } from './config.js';

export interface RepoContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  downloadUrl?: string; // For GitHub, constructed for GitLab
}

export type RepoProvider = 'github' | 'gitlab';

export interface RepoInfo {
  provider: RepoProvider;
  owner: string;
  repo: string;
  host: string;
}

export function parseRepoUrl(url: string): RepoInfo {
  if (!url) {
    throw new Error('Repository URL is not set. Please use `sg repo add <url>` to configure it.');
  }

  try {
    const cleanUrl = url.replace(/\.git$/, '');
    const urlObj = new URL(cleanUrl);
    const host = urlObj.hostname;
    const parts = urlObj.pathname.split('/').filter(Boolean);

    if (host === 'github.com') {
      if (parts.length < 2) throw new Error('Invalid GitHub URL');
      return {
        provider: 'github',
        host,
        owner: parts[0],
        repo: parts[1]
      };
    } else if (host === 'gitlab.com' || url.includes('gitlab')) {
      // Basic GitLab detection - can be improved for self-hosted
      if (parts.length < 2) throw new Error('Invalid GitLab URL');
      return {
        provider: 'gitlab',
        host,
        owner: parts.slice(0, -1).join('/'), // GitLab can have nested groups
        repo: parts[parts.length - 1]
      };
    } else {
      throw new Error(`Unsupported provider for host: ${host}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to parse repository URL: ${error.message}`);
  }
}

export async function fetchRepoContents(path: string = '', repoUrlOverride?: string): Promise<RepoContent[]> {
  const repoUrl = repoUrlOverride || getRepoUrl();
  const info = parseRepoUrl(repoUrl);

  if (info.provider === 'github') {
    const apiUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'sk-get-cli'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json() as any[];
    return data.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type === 'dir' ? 'dir' : 'file',
      downloadUrl: item.download_url
    }));
  } else {
    // GitLab API
    const projectId = encodeURIComponent(`${info.owner}/${info.repo}`);
    const apiUrl = `https://${info.host}/api/v4/projects/${projectId}/repository/tree?path=${path}&ref=main`;
    
    let response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'sk-get-cli' }
    });

    // Try 'master' if 'main' fails
    if (!response.ok && response.status === 404) {
      const altUrl = apiUrl.replace('ref=main', 'ref=master');
      response = await fetch(altUrl);
    }

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json() as any[];
    return data.map(item => {
      const isDir = item.type === 'tree';
      const encodedFilePath = encodeURIComponent(item.path);
      // For GitLab files, we construct the raw URL
      const downloadUrl = isDir ? undefined : `https://${info.host}/api/v4/projects/${projectId}/repository/files/${encodedFilePath}/raw?ref=${apiUrl.includes('ref=main') ? 'main' : 'master'}`;
      
      return {
        name: item.name,
        path: item.path,
        type: isDir ? 'dir' : 'file',
        downloadUrl
      };
    });
  }
}

export async function downloadFile(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return response.text();
}
