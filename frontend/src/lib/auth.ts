import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const devBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

export const authOptions: NextAuthOptions = {
  providers: devBypass
    ? [
        CredentialsProvider({
          name: "Dev Bypass",
          credentials: {},
          async authorize() {
            return { id: "dev-admin", name: "Dev Admin", email: "dev@localhost" };
          },
        }),
      ]
    : [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token) {
        token.idToken = account.id_token;
      }
      if (!token.idToken) {
        token.idToken = "dev-bypass-token";
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).idToken = token.idToken;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
