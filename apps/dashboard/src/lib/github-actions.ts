/**
 * Клиент GitHub Actions API — статус последних workflow-запусков репозитория letar.
 * Публичный репозиторий, поэтому `GITHUB_TOKEN` опционален — нужен только чтобы поднять
 * лимит запросов с 60/час (анонимно) до 5000/час.
 */

const GITHUB_REPO = 'kamiletar/letar'
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/actions/runs`

export type WorkflowRunStatus = 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending'
export type WorkflowRunConclusion =
  'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'stale' | null

export interface WorkflowRun {
  id: number
  name: string
  displayTitle: string
  status: WorkflowRunStatus
  conclusion: WorkflowRunConclusion
  headBranch: string
  event: string
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

interface GitHubWorkflowRunResponse {
  id: number
  name: string | null
  display_title: string
  status: string | null
  conclusion: string | null
  head_branch: string | null
  event: string
  html_url: string
  created_at: string
  updated_at: string
}

interface GitHubWorkflowRunsListResponse {
  workflow_runs: GitHubWorkflowRunResponse[]
}

/** Последние `perPage` запусков CI для letar, самые свежие первыми. */
export async function fetchWorkflowRuns(perPage = 10): Promise<WorkflowRun[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(`${GITHUB_API_URL}?per_page=${perPage}`, {
    headers,
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`GitHub Actions API вернул ${response.status}: ${response.statusText}`)
  }

  const data = (await response.json()) as GitHubWorkflowRunsListResponse

  return data.workflow_runs.map((run) => ({
    id: run.id,
    name: run.name ?? 'workflow',
    displayTitle: run.display_title,
    status: (run.status ?? 'completed') as WorkflowRunStatus,
    conclusion: run.conclusion as WorkflowRunConclusion,
    headBranch: run.head_branch ?? '?',
    event: run.event,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
  }))
}
