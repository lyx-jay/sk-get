import path from 'path';
import os from 'os';

export const getHomeDir = () => os.homedir();

export const getGlobalCursorSkillsDir = () => path.join(getHomeDir(), '.cursor', 'skills');

export const getLocalCursorSkillsDir = (cwd: string = process.cwd()) => path.join(cwd, '.cursor', 'skills');

export const getLocalClaudeSkillsDir = (cwd: string = process.cwd()) => path.join(cwd, '.claude', 'skills');

export const getGlobalClaudeSkillsDir = () => path.join(getHomeDir(), '.claude', 'skills');

export const getVscodeInstructionsPath = (cwd: string = process.cwd()) => path.join(cwd, '.github', 'copilot-instructions.md');

export const getCacheDir = () => path.join(getHomeDir(), '.cache', 'sk-get');

export const getLibraryDir = () => path.join(getHomeDir(), '.sk-get', 'library');
