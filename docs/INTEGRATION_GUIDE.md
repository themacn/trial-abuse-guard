# Integration Guide

This guide shows how to integrate Trial Abuse Guard with popular authentication providers.

## NextAuth/Auth.js Integration

### Installation

```bash
npm install trial-abuse-guard next-auth
```

### Basic Setup

1. **Update your auth configuration** (`auth.ts` or `pages/api/auth/[...nextauth].ts`):

```typescript
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  flagThreshold: 50,
  
  // Optional: Enhanced detection with API keys
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY
  },
  
  // Callbacks
  onUserBlocked: async (email, riskData) => {
    console.log(`🚫 Blocked: ${email} (Risk: ${riskData.overall})`);
    // Send admin notification, log to analytics, etc.
  },
  
  onUserFlagged: async (email, riskData) => {
    console.log(`⚠️ Flagged: ${email} (Risk: ${riskData.overall})`);
    // Add to review queue, apply restrictions, etc.
  }
});

export const { handlers, auth, signIn, signOut } = NextAuth(
  trialAbuseAdapter.getNextAuthConfig({
    providers: [GitHub],
    // All your existing configuration is preserved
  })
);
```

2. **Access risk data in your components**:

```typescript
import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session } = useSession();
  
  return (
    <div>
      <h2>Welcome, {session?.user?.name}!</h2>
      
      {/* Risk information is automatically available */}
      {session?.user?.flagged && (
        <div className="warning">
          ⚠️ Account under security review
          <br />
          Risk Level: {session.user.riskLevel}
        </div>
      )}
    </div>
  );
}
```

### Advanced Features

**API Route Protection:**
```typescript
// middleware.ts
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const adapter = new NextAuthTrialAbuseAdapter();

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    const middleware = adapter.createMiddleware();
    const response = await middleware(request, NextResponse);
    if (response) return response; // Blocked
  }
  return NextResponse.next();
}
```

**Manual Risk Checking:**
```typescript
// pages/api/check-risk.ts
const riskAssessment = await trialAbuseAdapter.checkUser(
  email, 
  ipAddress, 
  userAgent
);

if (riskAssessment.recommendation === 'block') {
  return res.status(403).json({ error: 'Access denied' });
}
```

## Clerk Integration

### Installation

```bash
npm install trial-abuse-guard @clerk/nextjs
```

### Basic Setup

1. **Create webhook handler** (`app/api/webhooks/clerk/route.ts`):

```typescript
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkAdapter = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  
  onUserBlocked: async (email, riskData) => {
    // User is automatically deleted from Clerk
    await sendAdminAlert(`Blocked user: ${email}`);
  },
  
  onUserFlagged: async (userId, email, riskData) => {
    // User metadata is automatically updated
    await addToReviewQueue(userId, email, riskData);
  }
});

export async function POST(request: Request) {
  const webhookHandler = clerkAdapter.createWebhookHandler();
  const result = await webhookHandler(request);
  return Response.json(result);
}
```

2. **Configure Clerk webhook** in your Clerk dashboard:
   - URL: `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `session.created`

3. **Add pre-signup checking** (`app/api/check-signup-risk/route.ts`):

```typescript
export async function POST(request: Request) {
  const { email } = await request.json();
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const { allowed, risk } = await clerkAdapter.preSignUpCheck(email, ip);
  
  return Response.json({ allowed, risk: risk.overall });
}
```

### Advanced Features

**Protected Signup Component:**
```typescript
'use client';
import { SignUp } from '@clerk/nextjs';
import { useState } from 'react';

export function ProtectedSignUp() {
  const [isBlocked, setIsBlocked] = useState(false);

  const checkRisk = async (email: string) => {
    const response = await fetch('/api/check-signup-risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    if (!result.allowed) setIsBlocked(true);
  };

  if (isBlocked) {
    return <div>Sign-up not available</div>;
  }

  return <SignUp />;
}
```

**Route Protection Middleware:**
```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkAdapter = new ClerkTrialAbuseAdapter();

export default clerkMiddleware(async (auth, request) => {
  auth().protect(); // Clerk authentication
  
  // Add trial abuse protection
  const middleware = clerkAdapter.createMiddleware();
  const response = await middleware(request, null);
  if (response) return response; // High-risk user blocked
});
```

**Access Risk Data:**
```typescript
import { currentUser } from '@clerk/nextjs/server';

export default async function Dashboard() {
  const user = await currentUser();
  const riskScore = user?.unsafeMetadata?.riskScore as number;
  const flagged = riskScore >= 50;

  return (
    <div>
      <h1>Dashboard</h1>
      {flagged && (
        <div className="warning">
          ⚠️ Account under security review
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

### Common Options

```typescript
{
  // Risk thresholds
  blockHighRisk: true,
  blockThreshold: 80,    // Block users with risk >= 80
  flagThreshold: 50,     // Flag users with risk >= 50
  
  // Domain management
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24,
  customDisposableDomains: ['your-domains.com'],
  
  // API keys for enhanced detection
  apiKeys: {
    ipQualityScore: 'your-key',
    vpnapi: 'your-key',
    proxyCheck: 'your-key'
  },
  
  // Callbacks
  onUserBlocked: async (email, riskData) => {
    // Handle blocked users
  },
  onUserFlagged: async (email, riskData) => {
    // Handle flagged users
  }
}
```

### NextAuth-Specific Options

```typescript
{
  flagMediumRisk: true,  // Add risk data to session
  // All TrialAbuseConfig options available
}
```

### Clerk-Specific Options

```typescript
{
  clerkSecretKey: process.env.CLERK_SECRET_KEY, // Required for user management
  onUserFlagged: async (userId, email, riskData) => {
    // Clerk-specific: includes userId
  }
}
```

## Best Practices

### 1. Error Handling
```typescript
const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  onUserBlocked: async (email, riskData) => {
    try {
      await notifyAdmins(email, riskData);
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  }
});
```

### 2. Gradual Rollout
```typescript
// Start with flagging only
const adapter = new ClerkTrialAbuseAdapter({
  blockHighRisk: false,  // Don't block initially
  flagThreshold: 30,     // Lower threshold for learning
  onUserFlagged: async (userId, email, riskData) => {
    console.log(`Would block: ${email} (Risk: ${riskData.overall})`);
  }
});
```

### 3. Custom Risk Actions
```typescript
const adapter = new NextAuthTrialAbuseAdapter({
  onUserFlagged: async (email, riskData) => {
    if (riskData.overall >= 70) {
      // High-medium risk: immediate review
      await addToUrgentReview(email, riskData);
    } else {
      // Medium risk: delayed review
      await addToStandardReview(email, riskData);
    }
  }
});
```

### 4. Monitoring and Analytics
```typescript
const adapter = new ClerkTrialAbuseAdapter({
  onUserBlocked: async (email, riskData) => {
    // Analytics
    analytics.track('user_blocked', {
      email_hash: hashEmail(email),
      risk_score: riskData.overall,
      factors: riskData.factors
    });
    
    // Admin notification
    await slack.send(`🚫 Blocked user: ${email} (Risk: ${riskData.overall})`);
  }
});
```

## Testing

### Testing with Different Risk Levels

```typescript
// Test low-risk user
await adapter.checkUser('normal@gmail.com', '8.8.8.8');

// Test temp email (high risk)
await adapter.checkUser('test@10minutemail.com', '8.8.8.8');

// Test similar email (medium-high risk)  
await adapter.checkUser('normal2@gmail.com', '8.8.8.8');
```

### Environment Variables

```bash
# Required for enhanced detection (optional)
IPQS_API_KEY=your-ipqualityscore-key
VPNAPI_KEY=your-vpnapi-key
PROXYCHECK_KEY=your-proxycheck-key

# Clerk integration
CLERK_SECRET_KEY=your-clerk-secret-key

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
```

## Troubleshooting

### Common Issues

1. **Risk data not appearing in session:**
   - Ensure adapter is configured before NextAuth
   - Check that callbacks are properly enhanced

2. **Webhook not working:**
   - Verify webhook URL is correct
   - Check Clerk webhook configuration
   - Ensure endpoint is accessible

3. **Users not being blocked:**
   - Check risk thresholds
   - Verify API keys are working
   - Review error logs

### Debug Mode

```typescript
const adapter = new NextAuthTrialAbuseAdapter({
  // Enable detailed logging
  onUserBlocked: async (email, riskData) => {
    console.log('Blocked user:', { email, riskData });
  },
  onUserFlagged: async (email, riskData) => {
    console.log('Flagged user:', { email, riskData });
  }
});
```