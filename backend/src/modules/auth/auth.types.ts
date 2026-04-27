export type JwtPayload = {
  sub:  string                          // userId
  tid:  string                          // tenantId
  role: 'admin' | 'member' | 'viewer'
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

export type TokenPair = {
  accessToken:  string
  refreshToken: string
  expiresIn:    number  // seconds
}

export type AuthUser = {
  id:        string
  tenantId:  string
  email:     string
  name:      string
  role:      'admin' | 'member' | 'viewer'
  avatarUrl: string | null
}
