import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.FROM_EMAIL ?? 'noreply@outreach.app',
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: { ...session.user, id: user.id },
    }),
  },
})
