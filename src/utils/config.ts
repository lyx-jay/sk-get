import Conf from 'conf';

interface Repo {
  url: string;
}

const config = new Conf<any>({
  projectName: 'sk-get',
  defaults: {
    repos: [],
    activeRepoUrl: '',
    cachedSkills: [],
    lastUpdated: ''
  }
});

export const getRepos = () => config.get('repos') as Repo[] || [];
export const setRepos = (repos: Repo[]) => config.set('repos', repos);

export const getActiveRepoUrl = () => config.get('activeRepoUrl') as string;
export const setActiveRepoUrl = (url: string) => config.set('activeRepoUrl', url);

export const getRepoUrl = () => getActiveRepoUrl();
export const setRepoUrl = (url: string) => {
  const repos = getRepos();
  if (!repos.find(r => r.url === url)) {
    repos.push({ url });
    setRepos(repos);
  }
  setActiveRepoUrl(url);
};

export const addRepo = (url: string) => {
  const repos = getRepos();
  if (!repos.find(r => r.url === url)) {
    repos.push({ url });
    setRepos(repos);
    if (!getActiveRepoUrl()) {
      setActiveRepoUrl(url);
    }
    return true;
  }
  return false;
};

export const removeRepo = (url: string) => {
  const repos = getRepos();
  const newRepos = repos.filter(r => r.url !== url);
  if (newRepos.length !== repos.length) {
    setRepos(newRepos);
    if (getActiveRepoUrl() === url) {
      setActiveRepoUrl(newRepos.length > 0 ? newRepos[0].url : '');
    }
    return true;
  }
  return false;
};

export const getCachedSkills = () => config.get('cachedSkills') as string[] || [];
export const setCachedSkills = (skills: string[]) => {
  config.set('cachedSkills', skills);
  config.set('lastUpdated', new Date().toISOString());
};
export const getLastUpdated = () => config.get('lastUpdated') as string || '';

export default config;
