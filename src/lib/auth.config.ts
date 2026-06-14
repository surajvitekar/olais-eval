import type { NextAuthConfig } from "next-auth"
import type { UserRole, UserStatus } from "@/types"

// Edge-compatible auth config — no Prisma, no bcrypt.
// Used by middleware (Edge Runtime). Full auth is in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.status = token.status as UserStatus
      }
      return session
    },
  },
  providers: [],
  session: {
    strategy: "jwt" as const,
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig
