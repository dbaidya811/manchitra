import NextAuth, { type AuthOptions } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { getDb } from "@/lib/mongodb";

export const authOptions: AuthOptions = {
  providers: [
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      httpOptions: { timeout: 10000 },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: { timeout: 10000 },
      authorization: {
        params: {
          // Force Google to show the account picker instead of silent SSO
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  callbacks: {
    async jwt({ token, account, profile, user }: any) {
      // Persist user info on first sign in
      if (account) {
        token.name = user?.name || token.name || (profile as any)?.name;
        token.email = user?.email || token.email || (profile as any)?.email;
        token.picture = user?.image || token.picture || (profile as any)?.picture;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.name = (token.name as string) || session.user.name || "";
        session.user.email = (token.email as string) || session.user.email || "";
        (session.user as any).image = (token.picture as string) || (session.user as any).image || "";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }: any) {
      try {
        const db = await getDb();
        const users = db.collection("users");
        if (user?.email) {
          await users.updateOne(
            { email: user.email },
            { $set: { name: user.name || "", email: user.email, image: (user as any).image || "", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );
        }
      } catch (e) {
        // Log and continue; do not block sign-in
        console.error("users upsert failed", e);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
