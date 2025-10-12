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
          
          console.log('🔐 Login attempt:', { email: emailRaw, otp: otpRaw });
          
          if (!emailRaw || !otpRaw) {
            console.log('❌ Missing email or OTP');
            return null;
          }
          
          // Validate 6-digit OTP
          const otp = otpRaw.replace(/\s+/g, "");
          if (!/^\d{6}$/.test(otp)) {
            console.log('❌ Invalid OTP format');
            return null;
          }
          
          const record = otpStore[emailRaw];
          console.log('📝 OTP Store record:', record ? 'Found' : 'Not found');
          
          if (!record) {
            console.log('❌ No OTP record found for email');
            return null;
          }
          
          if (Date.now() > record.expires) {
            console.log('❌ OTP expired');
            delete otpStore[emailRaw];
            return null;
          }
          
          if (record.otp !== otp) {
            console.log('❌ OTP mismatch. Expected:', record.otp, 'Got:', otp);
            return null;
          }
          
          console.log('✅ OTP verified successfully');
          
          // Save the name before deleting the record
          const savedName = record.name;
          delete otpStore[emailRaw];

          // Fetch user from DB or create if doesn't exist
          try {
            const db = await getDb();
            const users = db.collection("users");
            const dbUser = await users.findOne({ email: emailRaw });
            
            // Use name from OTP record if available, otherwise from DB, otherwise email prefix
            let userName = savedName || emailRaw.split("@")[0];
            if (dbUser && !savedName) {
              // If we don't have name from OTP but have it in DB, use DB name
              userName = dbUser.name || userName;
            }

            // Update user in DB with latest info
            await users.updateOne(
              { email: emailRaw },
              { $set: { email: emailRaw, updatedAt: new Date() }, $setOnInsert: { name: userName, createdAt: new Date() } },
              { upsert: true }
            );

            console.log('✅ User authenticated successfully:', { email: emailRaw, name: userName });
            
            // Return user object for the session/jwt
            return { id: emailRaw, email: emailRaw, name: userName } as any;
          } catch (dbError) {
            console.error("❌ Database error during login", dbError);
            // Even if DB fails, we can still authenticate with basic info
            const userName = savedName || emailRaw.split("@")[0];
            console.log('⚠️ Authenticating without DB (using fallback):', { email: emailRaw, name: userName });
            return { id: emailRaw, email: emailRaw, name: userName } as any;
          }
        } catch (error) {
          console.error('❌ Authorization error:', error);
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
  pages: { 
    signIn: "/",
    signOut: "/" 
  },
  callbacks: {
    async redirect({ url, baseUrl }: any) {
      console.log('NextAuth redirect callback - url:', url, 'baseUrl:', baseUrl);
      
      // Redirect to home page with a flag to trigger reload
      // This ensures proper session initialization
      const homeUrl = `${baseUrl}/?auth_callback=1`;
      console.log('NextAuth - Redirecting to home for session check:', homeUrl);
      
      return homeUrl;
    },
    async jwt({ token, account, profile, user }: any) {
      // Persist user info on first sign in
      if (account) {
        // For Google login, fetch user data from database first
        if (account.provider === "google") {
          try {
            const db = await getDb();
            const users = db.collection("users");
            const dbUser = await users.findOne({ email: user.email });
            
            // Use database user data if exists, otherwise use Google data
            if (dbUser) {
              token.name = dbUser.name || user?.name || token.name || (profile as any)?.name;
              token.email = dbUser.email || user?.email || token.email || (profile as any)?.email;
              token.picture = dbUser.image || user?.image || token.picture || (profile as any)?.picture;
            } else {
              token.name = user?.name || token.name || (profile as any)?.name;
              token.email = user?.email || token.email || (profile as any)?.email;
              token.picture = user?.image || token.picture || (profile as any)?.picture;
            }
          } catch (e) {
            console.error("Error fetching user from DB", e);
            // Fallback to Google data if DB fetch fails
            token.name = user?.name || token.name || (profile as any)?.name;
            token.email = user?.email || token.email || (profile as any)?.email;
            token.picture = user?.image || token.picture || (profile as any)?.picture;
          }
        } else {
          // For other providers (credentials), use the provided user data
          token.name = user.name || token.name;
          token.email = user.email || token.email;
          token.picture = (user as any).image || token.picture;
        }
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
    async signIn({ user, account, isNewUser }: any) {
      console.log('🎯 NextAuth signIn event - Provider:', account?.provider, 'User:', user?.email);
      
      try {
        const db = await getDb();
        const users = db.collection("users");
        if (user?.email) {
          // For Google login, preserve existing user data
          if (account?.provider === "google") {
            const existingUser = await users.findOne({ email: user.email });
            if (existingUser) {
              // Update only the timestamp and image if they exist, preserve name
              await users.updateOne(
                { email: user.email },
                { 
                  $set: { 
                    image: (user as any).image || existingUser.image || "", 
                    updatedAt: new Date() 
                  }
                }
              );
            } else {
              // New user, insert with Google data
              await users.updateOne(
                { email: user.email },
                { $set: { name: user.name || "", email: user.email, image: (user as any).image || "", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
                { upsert: true }
              );
            }
          } else {
            // For credentials login, update user data
            await users.updateOne(
              { email: user.email },
              { $set: { name: user.name || "", email: user.email, image: (user as any).image || "", updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
              { upsert: true }
            );
          }
        }
        
        console.log('✅ SignIn event complete');
        
      } catch (e) {
        // Log and continue; do not block sign-in
        console.error("users upsert failed", e);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
