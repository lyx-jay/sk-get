import fs from 'fs-extra';
import path from 'path';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
} from './paths.js';

export async function getInstalledSkills(targetDir: string): Promise<string[]> {
  if (!(await fs.pathExists(targetDir))) return [];
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries.filter(e => e.isDirectory() || e.isSymbolicLink()).map(e => e.name);
}

export async function getVscodeSkills(vscodePath: string): Promise<string[]> {
  if (!(await fs.pathExists(vscodePath))) return [];
  const content = await fs.readFile(vscodePath, 'utf8');
  const matches = content.matchAll(/^# Skill: (.+)$/gm);
  return Array.from(matches).map(m => m[1].trim());
}

export interface InstalledInfo {
  [skillName: string]: string[]; // e.g., "git-commit": ["Cursor", "Claude (Global)"]
}

export async function getAllInstalledSkillsWithLocations(): Promise<InstalledInfo> {
  const result: InstalledInfo = {};

  const add = (skill: string, location: string) => {
    if (!result[skill]) result[skill] = [];
    if (!result[skill].includes(location)) result[skill].push(location);
  };

  // Local
  (await getInstalledSkills(getLocalCursorSkillsDir())).forEach(s => add(s, 'Cursor'));
  (await getInstalledSkills(getLocalClaudeSkillsDir())).forEach(s => add(s, 'Claude'));
  (await getVscodeSkills(getVscodeInstructionsPath())).forEach(s => add(s, 'VSCode'));

  // Global
  (await getInstalledSkills(getGlobalCursorSkillsDir())).forEach(s => add(s, 'Cursor (Global)'));
  (await getInstalledSkills(getGlobalClaudeSkillsDir())).forEach(s => add(s, 'Claude (Global)'));

  return result;
}

export interface DetailedInstalledInfo {
  name: string;
  platform: string;
  global: boolean;
  method: 'link' | 'copy' | 'append';
}

export async function getAllInstalledSkillsDetailed(): Promise<DetailedInstalledInfo[]> {
  const result: DetailedInstalledInfo[] = [];

  const scanDir = async (dir: string, platform: string, global: boolean) => {
    if (!(await fs.pathExists(dir))) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const fullPath = path.join(dir, entry.name);
        // 检查目录内部是否存在软链接。目前的实现是：真实目录 + 内部文件软链接。
        // 或者如果是旧版本可能是整个目录软链接。
        let method: 'link' | 'copy' = 'copy';
        
        const files = await fs.readdir(fullPath);
        if (files.length > 0) {
          const firstFile = path.join(fullPath, files[0]);
          const lstat = await fs.lstat(firstFile);
          if (lstat.isSymbolicLink()) {
            method = 'link';
          }
        }
        
        result.push({ name: entry.name, platform, global, method });
      }
    }
  };

  await scanDir(getLocalCursorSkillsDir(), 'cursor', false);
  await scanDir(getGlobalCursorSkillsDir(), 'cursor', true);
  await scanDir(getLocalClaudeSkillsDir(), 'claude', false);
  await scanDir(getGlobalClaudeSkillsDir(), 'claude', true);

  const vscodePath = getVscodeInstructionsPath();
  const vscodeSkills = await getVscodeSkills(vscodePath);
  vscodeSkills.forEach(name => {
    result.push({ name, platform: 'vscode', global: false, method: 'append' });
  });

  return result;
}

export async function getAllInstalledSkills(): Promise<string[]> {
  const info = await getAllInstalledSkillsWithLocations();
  return Object.keys(info);
}
