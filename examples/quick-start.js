// Quick start examples for different authentication providers

// ===== NEXTAUTH QUICK START =====

// 1. Install
// npm install trial-abuse-guard next-auth

// 2. Update your auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80
});

export const { handlers, auth } = NextAuth(
  trialAbuseAdapter.getNextAuthConfig({
    providers: [GitHub],
    // Your existing config works as-is!
  })
);

// 3. That's it! High-risk users are now automatically blocked

// ===== CLERK QUICK START =====

// 1. Install  
// npm install trial-abuse-guard @clerk/nextjs

// 2. Create webhook handler: app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkAdapter = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

export async function POST(request) {
  const webhookHandler = clerkAdapter.createWebhookHandler();
  return Response.json(await webhookHandler(request));
}

// 3. Configure Clerk webhook in dashboard:
//    URL: https://yourdomain.com/api/webhooks/clerk
//    Events: user.created

// 4. High-risk users are automatically deleted!

// ===== STANDALONE USAGE =====

// Use without any auth provider
import { TrialAbuseGuard } from 'trial-abuse-guard';

const guard = new TrialAbuseGuard();

// In your registration endpoint
app.post('/register', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;
  
  const risk = await guard.checkUser(email, ip);
  
  if (risk.recommendation === 'block') {
    return res.status(403).json({ error: 'Registration blocked' });
  }
  
  // Continue with registration...
});

console.log('🛡️ Trial Abuse Guard - Quick Start Examples');
console.log('Choose the integration that matches your auth setup!');

module.exports = {
  NextAuthTrialAbuseAdapter,
  ClerkTrialAbuseAdapter,
  TrialAbuseGuard
};