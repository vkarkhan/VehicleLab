import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromAddress = "VehicleLab <login@vehicellab.dev>";

async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  if (!resend) {
    console.warn("RESEND_API_KEY missing. Magic link URL:", url);
    return;
  }

  await resend.emails.send({
    from: fromAddress,
    to: identifier,
    subject: "Your VehicleLab login link",
    html: `
      <div>
        <h1 style="margin-bottom: 12px;">Sign in to VehicleLab</h1>
        <p style="margin-bottom: 16px;">Use the secure magic link below to finish signing in:</p>
        <p><a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:9999px;background:#4338ca;color:#fff;text-decoration:none;font-weight:600;">Continue to VehicleLab</a></p>
        <p style="margin-top:24px;font-size:12px;color:#475569;">If you did not request this email, you can safely ignore it.</p>
      </div>
    `,
    text: `Sign in to VehicleLab using this link: ${url}`
  });
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/account"
  },
  providers: [
    EmailProvider({
      from: fromAddress,
      maxAge: 60 * 60, // 1 hour
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLink({ identifier, url });
      }
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.email = user.email;
      }
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & { id: string };
  }
}
