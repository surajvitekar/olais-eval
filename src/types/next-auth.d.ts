import { UserRole, UserStatus } from "./index"

declare module "@auth/core/types" {
  interface User {
    role?: UserRole
    status?: UserStatus
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: UserRole
      status?: UserStatus
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole
    status?: UserStatus
    id?: string
  }
}
