import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const ALLOWED_EMAILS = ['heini.ahven@gmail.com', 'timetuned@gmail.com']

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email ?? '')
    },
  },
  pages: {
    signIn: '/login',
  },
})
