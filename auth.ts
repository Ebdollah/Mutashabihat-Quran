import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { getRepo } from '@/lib/repo';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

const credentials = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Compared against when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = '$2b$12$oxBVQUi5M0JKLGgcVDH83us7r0CFiYWTKi2w7LyNcMuVAcpTLpyEy';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials login needs JWT sessions (Auth.js does not write DB sessions for it).
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(raw) {
        const parsed = credentials.safeParse(raw);
        if (!parsed.success) return null;
        const user = await getRepo().getUserByEmail(parsed.data.email);
        const ok = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === 'string') session.user.id = token.uid;
      return session;
    },
  },
});
