// ─── Storage keys ─────────────────────────────────────────────────────────
const ACCESS_KEY  = 'dyson_access_token'
const REFRESH_KEY = 'dyson_refresh_token'
const USER_KEY    = 'dyson_user'

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Token helpers ─────────────────────────────────────────────────────────
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

// ─── Core fetch wrapper ────────────────────────────────────────────────────

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
    throw new Error('Session expired — please log in again')
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

export async function apiFetch<T>(
  path:    string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
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

  // Auto-refresh on 401 — deduplicated so concurrent requests don't fire multiple refreshes
  if (res.status === 401 && !skipAuth && tokens.getRefresh()) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    }
    try {
      await refreshPromise
    } catch {
      throw new ApiError('SESSION_EXPIRED', 'Session expired — please log in again', 401)
    }
    // Retry with new token
    headers['Authorization'] = `Bearer ${tokens.getAccess()!}`
    res = await fetch(`/api/v1${path}`, { ...init, headers })
  }

  if (!res.ok) {
    let code    = 'UNKNOWN_ERROR'
    let message = `Request failed: ${res.status}`
    try {
      const body = await res.json() as { error?: { code?: string; message?: string } }
      code    = body.error?.code    ?? code
      message = body.error?.message ?? message
    } catch { /* json parse failed — keep defaults */ }
    throw new ApiError(code, message, res.status)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  const body = await res.json() as { data: T }
  return body.data
}

// ─── Auth API ──────────────────────────────────────────────────────────────

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

// ─── WHY Engine API ────────────────────────────────────────────────────────

export type Citation = {
  nodeId:      string
  title:       string
  source:      string
  externalUrl: string | null
  snippet:     string | null
}

export type WhyResult = {
  queryId:      string
  question:     string
  answer:       string | null
  citations:    Citation[]
  sourceNodes:  unknown[]
  confidence:   number
  cannotAnswer: boolean
  latencyMs:    number
}

export const whyApi = {
  async ask(question: string): Promise<WhyResult> {
    return apiFetch<WhyResult>('/why', {
      method: 'POST',
      body:   JSON.stringify({ question }),
    })
  },

  async feedback(queryId: string, helpful: boolean): Promise<void> {
    return apiFetch(`/why/${queryId}/feedback`, {
      method: 'POST',
      body:   JSON.stringify({ helpful }),
    })
  },
}

// ─── Decisions API ─────────────────────────────────────────────────────────

export type Decision = {
  id:            string
  title:         string
  summary:       string | null
  confidence:    number
  detectedAt:    string
  sourceSummary: { slack?: number; github?: number; notion?: number; meeting?: number }
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
    return apiFetch(`/decisions${qs}`)
  },
}

// ─── Users API ────────────────────────────────────────────────────────────

export const usersApi = {
  async updateMe(data: { name?: string; avatarUrl?: string | null }): Promise<AuthUser> {
    const user = await apiFetch<AuthUser>('/users/me', {
      method: 'PATCH',
      body:   JSON.stringify(data),
    })
    tokens.setUser(user)
    return user
  },
}

// ─── Sessions API ──────────────────────────────────────────────────────────

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

// ─── Search API ────────────────────────────────────────────────────────────

export type SearchResult = {
  nodeId:     string
  title:      string
  summary:    string | null
  source:     string
  confidence: number
  url:        string | null
}

export const searchApi = {
  async search(q: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q })
    return apiFetch<SearchResult[]>(`/search?${params}`)
  },
}
