import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Google OAuth Provider (for direct Google sign-in buttons)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '1046187979607-m17nch2aipj9eb2ep80n8ep273n35pqp.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret',
    }),
    
    // 2. Credentials Provider (for email/password or custom Google ID token verification)
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        googleToken: { label: 'Google Token', type: 'text' }
      },
      async authorize(credentials) {
        // Handle Google Token Authentication
        if (credentials?.googleToken) {
          try {
            const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credentials.googleToken}`);
            if (!googleRes.ok) {
              throw new Error('Invalid Google token');
            }
            
            const payload = await googleRes.json();
            const googleId = payload.sub;
            const email = payload.email;

            if (!googleId) {
              throw new Error('Google authentication failed');
            }

            // Find user by linked googleId or email
            let user = await prisma.user.findFirst({
              where: {
                OR: [
                  { googleId },
                  { email }
                ]
              }
            });

            if (!user) {
              throw new Error('NOT_REGISTERED');
            }

            // Link googleId if not already set
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId }
              });
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status
            };

          } catch (err: any) {
            console.error('Google auth error:', err);
            throw new Error(err.message || 'Google authentication failed');
          }
        }

        // Handle regular Email/Password authentication
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const googleId = profile?.sub;
        const email = profile?.email;

        if (!googleId || !email) return false;

        // Check if user exists by googleId
        let dbUser = await prisma.user.findUnique({
          where: { googleId }
        });

        // Auto-link by email if googleId is not linked yet
        if (!dbUser) {
          dbUser = await prisma.user.findUnique({
            where: { email }
          });

          if (dbUser) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { googleId }
            });
          } else {
            // Not registered yet
            return '/login?error=GoogleNotLinked';
          }
        }

        // We populate the user details for the JWT callback
        user.id = dbUser.id;
        user.role = dbUser.role;
        user.status = dbUser.status;
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.status = user.status;
      }
      if (trigger === 'update' && session) {
        token.status = session.status ?? token.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.status = token.status as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };