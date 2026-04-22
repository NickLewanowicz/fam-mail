export interface User {
  id: string
  oidcSub: string
  oidcIssuer: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthContextType extends AuthState {
  login: () => Promise<void>
  logout: () => Promise<void>
  handleCallbackToken: (token: string, refreshToken?: string) => void
}
