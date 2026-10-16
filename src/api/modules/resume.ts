import { localResumeExport } from '../local-export'

export interface IResumeConfig {
  content: string
  style: string
  link: string
  name: string
  type?: number
}

export async function resumeExport(data: IResumeConfig) {
  return localResumeExport(data)
}

// Private deployments do not use the author's remote counters and tokens.
export function getExportCount() { return Promise.resolve(0) }
export function setExportCount() { return Promise.resolve() }
export function getTemplateCondition() { return Promise.resolve({ result: null }) }
export function setTemplateCondition(_params: { name: string }) { return Promise.resolve() }
export function queryGiteeRepoStars() { return Promise.resolve([]) }
