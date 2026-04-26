const KEY = 'dyson_auth'

export const auth = {
  login(email: string) {
    localStorage.setItem(KEY, JSON.stringify({ email, loggedInAt: Date.now() }))
  },
  logout() {
    localStorage.removeItem(KEY)
  },
  isLoggedIn(): boolean {
    return !!localStorage.getItem(KEY)
  },
  getUser() {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as { email: string; loggedInAt: number }) : null
  },
}
