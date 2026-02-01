import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface PlatformInfo {
  id: string;
  name: string;
  isInstalled: boolean;
}

export async function detectPlatforms(): Promise<PlatformInfo[]> {
  const home = os.homedir();
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  const platforms = [
    {
      id: 'cursor',
      name: 'Cursor',
      check: async () => {
        if (isMac) return fs.pathExists('/Applications/Cursor.app');
        if (isWin) return fs.pathExists(path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor'));
        return fs.pathExists(path.join(home, '.cursor'));
      }
    },
    {
      id: 'claude',
      name: 'Claude',
      check: async () => {
        if (isMac) return fs.pathExists('/Applications/Claude.app');
        return fs.pathExists(path.join(home, '.claude'));
      }
    },
    {
      id: 'vscode',
      name: 'VSCode',
      check: async () => {
        if (isMac) return fs.pathExists('/Applications/Visual Studio Code.app');
        // Simple proxy for VSCode: check for .vscode extensions or common paths
        return fs.pathExists(path.join(home, '.vscode'));
      }
    }
  ];

  const result: PlatformInfo[] = [];
  for (const p of platforms) {
    result.push({
      id: p.id,
      name: p.name,
      isInstalled: await p.check()
    });
  }

  return result;
}
