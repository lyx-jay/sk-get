import fs from 'fs-extra';
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

export async function getAllInstalledSkills(): Promise<string[]> {
  const info = await getAllInstalledSkillsWithLocations();
  return Object.keys(info);
}
