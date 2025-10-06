import NextAuth, { type AuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import { getDb } from "@/lib/mongodb";
import { otpStore } from "@/lib/otp-store";
import { sendMail } from "@/lib/mailer";
import { otpEmailHtml } from "@/lib/email-templates";

// Build providers safely. Only include Email provider if SMTP envs are configured.
const providers: any[] = [
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
  Credentials({
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          const emailRaw = String(credentials?.email || "").trim().toLowerCase();
          const otpRaw = String(credentials?.otp || "").trim();
          if (!emailRaw || !otpRaw) return null;
          // Validate 6-digit OTP
          const otp = otpRaw.replace(/\s+/g, "");
          if (!/^\d{6}$/.test(otp)) return null;
          const record = otpStore[emailRaw];
          if (!record) return null;
          if (Date.now() > record.expires) { delete otpStore[emailRaw]; return null; }
          if (record.otp !== otp) return null;
          delete otpStore[emailRaw];

          // Upsert user in DB
          try {
            const db = await getDb();
            const users = db.collection("users");
            await users.updateOne(
              { email: emailRaw },
              { $set: { email: emailRaw, updatedAt: new Date() }, $setOnInsert: { name: emailRaw.split("@")[0], createdAt: new Date() } },
              { upsert: true }
            );
          } catch {}

          // Return a basic user object for the session/jwt
          return { id: emailRaw, email: emailRaw, name: emailRaw.split("@")[0] } as any;
        } catch {
          return null;
        }
      },
  }),
];

// Only add Email provider if config is present (prevents server error when missing envs)
const hasEmailServer = !!(
  process.env.EMAIL_SERVER ||
  (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD)
);
if (hasEmailServer) {
  providers.splice(1, 0, Email({
    server: process.env.EMAIL_SERVER
      ? (process.env.EMAIL_SERVER as any)
      : {
          host: process.env.EMAIL_SERVER_HOST!,
          port: Number(process.env.EMAIL_SERVER_PORT || 587),
          auth: {
            user: process.env.EMAIL_SERVER_USER!,
            pass: process.env.EMAIL_SERVER_PASSWORD!,
          },
        },
    from: process.env.EMAIL_FROM || "no-reply@manchitra.local",
    async sendVerificationRequest({ identifier, url }) {
      try {
        await sendMail({
          to: identifier,
          subject: "Sign in to Manchitra",
          text: `Click to sign in: ${url}`,
          html: otpEmailHtml({ name: undefined, otp: "------", magicUrl: url }),
        });
      } catch (e) {
        // ignore, NextAuth will fallback to default sender if configured via EMAIL_SERVER
      }
    },
    maxAge: 60 * 30,
  }));
}

export const authOptions: AuthOptions = {
  providers,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile, user }: any) {
      // Persist user info on first sign in
      if (account) {
        token.name = user?.name || token.name || (profile as any)?.name;
        token.email = user?.email || token.email || (profile as any)?.email;
        token.picture = user?.image || token.picture || (profile as any)?.picture;
      }
      // Also ensure when logging in via credentials we pass through user fields
      if (user) {
        token.name = user.name || token.name;
        token.email = user.email || token.email;
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
