import { getInstallationToken, ghApiGet, ghApiPost } from '@/infra/github-app.js'

export type PrFile = { filename: string; status: string }

export async function getPrFiles(installationId: string | number, repoFullName: string, prNumber: number): Promise<PrFile[]> {
  const token = await getInstallationToken(installationId)
  return ghApiGet<PrFile[]>(token, `/repos/${repoFullName}/pulls/${prNumber}/files?per_page=50`)
}

export async function postPrComment(installationId: string | number, repoFullName: string, prNumber: number, body: string): Promise<void> {
  const token = await getInstallationToken(installationId)
  await ghApiPost(token, `/repos/${repoFullName}/issues/${prNumber}/comments`, { body })
}
