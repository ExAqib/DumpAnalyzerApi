const TOKEN_KEY = 'dumpAnalyzer.token'
const PATH_KEY = 'dumpAnalyzer.dumpPath'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getLastDumpPath(): string {
  return localStorage.getItem(PATH_KEY) ?? ''
}

export function setLastDumpPath(path: string): void {
  localStorage.setItem(PATH_KEY, path)
}

