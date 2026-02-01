import fs from 'fs-extra';
import path from 'path';
import {
  getLocalCursorSkillsDir,
  getGlobalCursorSkillsDir,
  getLocalClaudeSkillsDir,
  getGlobalClaudeSkillsDir,
  getVscodeInstructionsPath,
  getLibraryDir,
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
  repoUrl?: string;
}

export async function getAllInstalledSkillsDetailed(): Promise<DetailedInstalledInfo[]> {
  const result: DetailedInstalledInfo[] = [];

  const scanDir = async (dir: string, platform: string, global: boolean) => {
    if (!(await fs.pathExists(dir))) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        const fullPath = path.join(dir, entry.name);
        let method: 'link' | 'copy' = 'copy';
        let repoUrl: string | undefined = undefined;
        
        const files = await fs.readdir(fullPath);
        if (files.length > 0) {
          // 1. Try to read from .sk-get.json (for 'copy' method or explicit metadata)
          const metadataPath = path.join(fullPath, '.sk-get.json');
          if (await fs.pathExists(metadataPath)) {
            try {
              const metadata = await fs.readJson(metadataPath);
              if (metadata.repoUrl) {
                repoUrl = metadata.repoUrl;
              }
            } catch (e) {
              // Ignore metadata read errors
            }
          }

          // 2. If no repoUrl yet, try to resolve from symlink (for 'link' method)
          if (!repoUrl) {
            const firstFile = path.join(fullPath, files[0]);
            try {
              const lstat = await fs.lstat(firstFile);
              if (lstat.isSymbolicLink()) {
                method = 'link';
                const linkTarget = await fs.readlink(firstFile);
                // linkTarget example: /Users/yxl/.sk-get/library/owner/repo/skills/skillName/file
                const libraryDir = getLibraryDir();
                if (linkTarget.startsWith(libraryDir)) {
                  const relative = path.relative(libraryDir, linkTarget);
                  const parts = relative.split(path.sep);
                  if (parts.length >= 2) {
                    const owner = parts[0];
                    const repo = parts[1];
                    repoUrl = `https://github.com/${owner}/${repo}`;
                  }
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }
        
        result.push({ name: entry.name, platform, global, method, repoUrl });
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
