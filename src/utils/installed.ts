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
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

export async function getVscodeSkills(vscodePath: string): Promise<string[]> {
  if (!(await fs.pathExists(vscodePath))) return [];
  const content = await fs.readFile(vscodePath, 'utf8');
  const matches = content.matchAll(/^# Skill: (.+)$/gm);
  return Array.from(matches).map(m => m[1].trim());
}

export async function getAllInstalledSkills(): Promise<string[]> {
  const skills = new Set<string>();
  
  // Local
  (await getInstalledSkills(getLocalCursorSkillsDir())).forEach(s => skills.add(s));
  (await getInstalledSkills(getLocalClaudeSkillsDir())).forEach(s => skills.add(s));
  (await getVscodeSkills(getVscodeInstructionsPath())).forEach(s => skills.add(s));
  
  // Global
  (await getInstalledSkills(getGlobalCursorSkillsDir())).forEach(s => skills.add(s));
  (await getInstalledSkills(getGlobalClaudeSkillsDir())).forEach(s => skills.add(s));
  
  return Array.from(skills);
}
