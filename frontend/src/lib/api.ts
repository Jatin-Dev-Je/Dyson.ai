// â”€â”€â”€ Storage keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACCESS_KEY  = 'dyson_access_token'
const REFRESH_KEY = 'dyson_refresh_token'
const USER_KEY    = 'dyson_user'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type AuthUser = {
  id:        string
  tenantId:  string
  email:     string
  name:      string
  role:      'admin' | 'member' | 'viewer'
  avatarUrl: string | null
}

export type TokenPair = {
  accessToken:  string
  refreshToken: string
  expiresIn:    number
}

// â”€â”€â”€ Token helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const tokens = {
  getAccess:      ()  => localStorage.getItem(ACCESS_KEY),
  getRefresh:     ()  => localStorage.getItem(REFRESH_KEY),
  setTokens:      (pair: TokenPair) => {
    localStorage.setItem(ACCESS_KEY,  pair.accessToken)
    localStorage.setItem(REFRESH_KEY, pair.refreshToken)
  },
  clearAll:       () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  },
  getUser:        (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  },
  setUser:        (user: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
}

// â”€â”€â”€ Core fetch wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let refreshPromise: Promise<void> | null = null

async function doRefresh(): Promise<void> {
  const raw = tokens.getRefresh()
  if (!raw) throw new Error('No refresh token')

  const res = await fetch('/api/v1/auth/refresh', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: raw }),
  })

  if (!res.ok) {
    tokens.clearAll()
    throw new Error('Session expired â€” please log in again')
  }

  const body = await res.json() as { data: TokenPair }
  tokens.setTokens(body.data)
}

export class ApiError extends Error {
  constructor(
    public code:       string,
    message:           string,
    public status:     number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiEnvelope<T> = {
  data: T
  meta?: {
    cursor?: string | null
    hasMore?: boolean
    confidence?: number
    citations?: number
    cannotAnswer?: boolean
  }
}

async function request<T>(
  path:    string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiEnvelope<T>> {
  const { skipAuth, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }

  if (!skipAuth) {
    const token = tokens.getAccess()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`/api/v1${path}`, { ...init, headers })

  // Auto-refresh on 401 â€” deduplicated so concurrent requests don't fire multiple refreshes
  if (res.status === 401 && !skipAuth && tokens.getRefresh()) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    }
    try {
      await refreshPromise
    } catch {
      throw new ApiError('SESSION_EXPIRED', 'Session expired â€” please log in again', 401)
    }
    // Retry with new token
    const refreshedToken = tokens.getAccess()
    if (refreshedToken) headers['Authorization'] = `Bearer ${refreshedToken}`
    res = await fetch(`/api/v1${path}`, { ...init, headers })
  }

  if (!res.ok) {
    let code    = 'UNKNOWN_ERROR'
    let message = `Request failed: ${res.status}`
    try {
      const body = await res.json() as { error?: { code?: string; message?: string } }
      code    = body.error?.code    ?? code
      message = body.error?.message ?? message
    } catch { /* json parse failed â€” keep defaults */ }
    throw new ApiError(code, message, res.status)
  }

  // 204 No Content
  if (res.status === 204) return { data: undefined as T }

  return await res.json() as ApiEnvelope<T>
}

export async function apiFetch<T>(
  path:    string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const body = await request<T>(path, options)
  return body.data
}

export async function apiFetchEnvelope<T>(
  path:    string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<ApiEnvelope<T>> {
  return request<T>(path, options)
}

// â”€â”€â”€ Auth API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const authApi = {
  async signup(input: {
    name:          string
    email:         string
    password:      string
    workspaceName: string
    workspaceSlug: string
  }): Promise<AuthUser> {
    const data = await apiFetch<TokenPair & { user: AuthUser }>('/auth/signup', {
      method:   'POST',
      body:     JSON.stringify(input),
      skipAuth: true,
    })
    tokens.setTokens(data)
    tokens.setUser(data.user)
    return data.user
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const data = await apiFetch<TokenPair & { user: AuthUser }>('/auth/login', {
      method:   'POST',
      body:     JSON.stringify({ email, password }),
      skipAuth: true,
    })
    tokens.setTokens(data)
    tokens.setUser(data.user)
    return data.user
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } finally {
      tokens.clearAll()
    }
  },

  async me(): Promise<AuthUser> {
    const user = await apiFetch<AuthUser>('/auth/me')
    tokens.setUser(user)
    return user
  },

  async getInviteInfo(token: string): Promise<{ email: string; role: string; tenantId: string }> {
    return apiFetch(`/auth/invite/${token}`, { skipAuth: true })
  },

  async acceptInvite(input: { token: string; name: string; password: string }): Promise<AuthUser> {
    const data = await apiFetch<TokenPair & { user: AuthUser }>('/auth/accept-invite', {
      method:   'POST',
      body:     JSON.stringify(input),
      skipAuth: true,
    })
    tokens.setTokens(data)
    tokens.setUser(data.user)
    return data.user
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiFetch('/auth/change-password', {
      method: 'POST',
      body:   JSON.stringify({ currentPassword, newPassword }),
    })
  },

  isLoggedIn(): boolean {
    return !!tokens.getAccess()
  },

  getUser(): AuthUser | null {
    return tokens.getUser()
  },
}

// â”€â”€â”€ WHY Engine API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type Citation = {
  claim:        string
  sourceNodeId: string
  sourceUrl:    string | null
  confidence:   number
}

export type SourceNodeSummary = {
  id:         string
  entityType: string
  source:     string
  title:      string
  summary:    string
  sourceUrl:  string | null
  occurredAt: string
  similarity: number
  isDecision: boolean
  retrieval?: 'vector' | 'lexical' | 'graph' | 'hybrid'
}

export type RecallResult = {
  queryId:      string
  question:     string
  answer:       string | null
  citations:    Citation[]
  sourceNodes:  SourceNodeSummary[]
  confidence:   number
  cannotAnswer: boolean
  latencyMs:    number
}

export const recallApi = {
  async ask(question: string): Promise<RecallResult> {
    return apiFetch<RecallResult>('/recall', {
      method: 'POST',
      body:   JSON.stringify({ question }),
    })
  },

  async feedback(queryId: string, helpful: boolean): Promise<void> {
    return apiFetch(`/recall/${queryId}/feedback`, {
      method: 'PATCH',
      body:   JSON.stringify({ score: helpful ? 1 : -1 }),
    })
  },

  async history(limit = 5): Promise<RecallResult[]> {
    return apiFetch<RecallResult[]>(`/recall/history?limit=${limit}`)
  },
}

// â”€â”€â”€ Decisions API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type Decision = {
  id:                 string
  title:              string
  summary:            string | null
  source:             string
  sourceUrl:          string | null
  occurredAt:         string
  decisionConfidence: number | null
}

export const decisionsApi = {
  async list(opts: { cursor?: string; limit?: number } = {}): Promise<{
    items: Decision[]
    cursor: string | null
    hasMore: boolean
  }> {
    const params = new URLSearchParams()
    if (opts.cursor) params.set('cursor', opts.cursor)
    if (opts.limit)  params.set('limit', String(opts.limit))
    const qs = params.size ? `?${params}` : ''
    const body = await apiFetchEnvelope<Decision[]>(`/decisions${qs}`)
    return {
      items: body.data,
      cursor: body.meta?.cursor ?? null,
      hasMore: body.meta?.hasMore ?? false,
    }
  },
}

export type Connector = {
  id:           string
  source:       string
  isActive:     boolean
  lastSyncedAt: string | null
  syncError:    string | null
  createdAt:    string
}

export const connectorsApi = {
  list(): Promise<Connector[]> {
    return apiFetch<Connector[]>('/connectors')
  },

  async connect(source: 'slack' | 'github'): Promise<void> {
    const data = await apiFetch<{ url: string }>(`/connectors/${source}/connect`, { method: 'POST' })
    window.location.assign(data.url)
  },

  sync(id: string): Promise<{ message: string; source: string }> {
    return apiFetch(`/connectors/${id}/sync`, { method: 'POST' })
  },

  disconnect(id: string): Promise<void> {
    return apiFetch(`/connectors/${id}`, { method: 'DELETE' })
  },
}

// â”€â”€â”€ Users API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const usersApi = {
  async updateMe(data: { name?: string; avatarUrl?: string | null }): Promise<AuthUser> {
    const user = await apiFetch<AuthUser>('/users/me', {
      method: 'PATCH',
      body:   JSON.stringify(data),
    })
    tokens.setUser(user)
    return user
  },

  async list(opts: { cursor?: string; limit?: number } = {}): Promise<{ users: AuthUser[]; cursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams()
    if (opts.cursor) params.set('cursor', opts.cursor)
    if (opts.limit) params.set('limit', String(opts.limit))
    const qs = params.size ? `?${params}` : ''
    const body = await apiFetchEnvelope<AuthUser[]>(`/users${qs}`)
    return {
      users: body.data,
      cursor: body.meta?.cursor ?? null,
      hasMore: body.meta?.hasMore ?? false,
    }
  },

  invite(input: { email: string; role: 'admin' | 'member' | 'viewer'; workspaceName?: string }) {
    return apiFetch('/users/invite', {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  },

  remove(id: string): Promise<void> {
    return apiFetch(`/users/${id}`, { method: 'DELETE' })
  },
}

export type Workspace = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt?: string
}

export const workspaceApi = {
  get(): Promise<Workspace> {
    return apiFetch<Workspace>('/workspaces/me')
  },

  update(input: { name?: string; slug?: string }): Promise<Workspace> {
    return apiFetch<Workspace>('/workspaces/me', {
      method: 'PATCH',
      body:   JSON.stringify(input),
    })
  },
}

// â”€â”€â”€ Sessions API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type Session = {
  id:        string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
}

export const sessionsApi = {
  async list(): Promise<Session[]> {
    return apiFetch<Session[]>('/auth/sessions')
  },

  async revoke(sessionId: string): Promise<void> {
    return apiFetch(`/auth/sessions/${sessionId}`, { method: 'DELETE' })
  },

  async revokeAll(): Promise<void> {
    return apiFetch('/auth/logout', { method: 'POST' })
  },
}

// â”€â”€â”€ Search API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type SearchResult = {
  id:         string
  type:       'decision' | 'event' | 'query'
  title:      string
  summary:    string
  source?:    string
  sourceUrl?: string | null
  confidence?: number
  occurredAt?: string
  createdAt:  string
}

export const searchApi = {
  async search(q: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q })
    return apiFetch<SearchResult[]>(`/search?${params}`)
  },
}

export type ApiKey = {
  id:         string
  name:       string
  keyPrefix:  string
  scopes:     string[]
  lastUsedAt: string | null
  revokedAt?: string | null
  createdAt:  string
  rawKey?:    string
}

export const apiKeysApi = {
  list(): Promise<ApiKey[]> {
    return apiFetch<ApiKey[]>('/api-keys')
  },

  create(input: { name: string; scopes: string[] }): Promise<ApiKey> {
    return apiFetch<ApiKey>('/api-keys', {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  },

  revoke(id: string): Promise<void> {
    return apiFetch(`/api-keys/${id}`, { method: 'DELETE' })
  },
}

export type NotificationPrefs = {
  recallReplies: boolean
  weeklyDigest: boolean
  sourceErrors: boolean
  securityAlerts: boolean
}

export const notificationsApi = {
  get(): Promise<NotificationPrefs> {
    return apiFetch<NotificationPrefs>('/notifications')
  },

  update(input: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    return apiFetch<NotificationPrefs>('/notifications', {
      method: 'PATCH',
      body:   JSON.stringify(input),
    })
  },
}

export type OnboardingPack = {
  id: string
  memberName: string
  team: string
  status: 'generating' | 'ready' | 'failed'
  sections: Array<{ title: string; content: string; nodes: string[] }> | null
  generatedAt: string | null
  createdAt: string
}

export const onboardingPacksApi = {
  list(): Promise<OnboardingPack[]> {
    return apiFetch<OnboardingPack[]>('/onboarding-packs')
  },

  create(input: { memberName: string; team: string }): Promise<OnboardingPack> {
    return apiFetch<OnboardingPack>('/onboarding-packs', {
      method: 'POST',
      body:   JSON.stringify(input),
    })
  },

  get(id: string): Promise<OnboardingPack> {
    return apiFetch<OnboardingPack>(`/onboarding-packs/${id}`)
  },

  delete(id: string): Promise<void> {
    return apiFetch(`/onboarding-packs/${id}`, { method: 'DELETE' })
  },
}



