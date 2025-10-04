# Authentication Integration Guide

Complete guide for integrating Trial Abuse Guard with popular authentication providers.

## 🔌 Supported Integrations

- **NextAuth/Auth.js** - Drop-in enhancement for NextAuth configurations
- **Clerk** - Webhook-based integration with automatic user management
- **Custom Auth** - Manual integration for any authentication system

## 🚀 NextAuth/Auth.js Integration

### Overview

The NextAuth adapter seamlessly enhances your existing NextAuth configuration with trial abuse protection, without breaking any existing functionality.

### Features

- ✅ **Zero Breaking Changes** - Preserves all existing configuration
- ✅ **Automatic Risk Assessment** - Checks every sign-up and sign-in
- ✅ **Session Enhancement** - Adds risk data to user sessions
- ✅ **Flexible Blocking** - Configure blocking and flagging thresholds
- ✅ **Custom Callbacks** - Handle blocked/flagged users your way

### Basic Setup

```javascript
// auth.ts (App Router) or pages/api/auth/[...nextauth].ts (Pages Router)
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialGuard = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  flagThreshold: 50
});

export const { handlers, auth, signIn, signOut } = NextAuth(
  trialGuard.getNextAuthConfig({
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ],
    
    // Your existing callbacks work unchanged
    callbacks: {
      session: async ({ session, token }) => {
        // Risk data is automatically added by the adapter
        console.log('User risk level:', session.user.riskLevel);
        return session;
      }
    }
  })
);
```

### Advanced Configuration

```javascript
const trialGuard = new NextAuthTrialAbuseAdapter({
  // Risk thresholds
  blockHighRisk: true,
  flagMediumRisk: true,
  blockThreshold: 80,
  flagThreshold: 50,
  
  // Enhanced detection
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY
  },
  
  // Custom handlers
  onUserBlocked: async (email, riskData) => {
    console.log(`🚫 Blocked: ${email} (Risk: ${riskData.overall})`);
    
    // Send to analytics
    analytics.track('user_blocked', {
      email_hash: hashEmail(email),
      risk_score: riskData.overall,
      factors: riskData.details
    });
    
    // Alert admins
    await slack.send(`High-risk signup blocked: ${email}`);
  },
  
  onUserFlagged: async (email, riskData) => {
    console.log(`⚠️ Flagged: ${email} (Risk: ${riskData.overall})`);
    
    // Add to review queue
    await addToReviewQueue(email, riskData);
    
    // Apply account restrictions
    await applyAccountRestrictions(email, riskData.overall);
  }
});
```

### Session Enhancement

Risk data is automatically added to NextAuth sessions:

```typescript
// The session type is automatically extended
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      riskScore?: number;    // 0-100 risk score
      riskLevel?: string;    // 'low', 'medium', 'high', 'critical'
      flagged?: boolean;     // true if user is flagged
    } & DefaultSession['user'];
  }
}
```

### Using Risk Data in Components

```typescript
// components/UserProfile.tsx
import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session } = useSession();
  
  if (!session?.user) return <div>Please sign in</div>;

  return (
    <div>
      <h2>Welcome, {session.user.name}!</h2>
      
      {/* Show security status */}
      <div className="security-status">
        <span>Security Level: {session.user.riskLevel || 'verified'}</span>
        
        {session.user.flagged && (
          <div className="warning">
            ⚠️ Account under security review
          </div>
        )}
      </div>
    </div>
  );
}
```

### Middleware Integration

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialGuard = new NextAuthTrialAbuseAdapter();

export async function middleware(request: NextRequest) {
  // Apply to specific routes
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    const middleware = trialGuard.createMiddleware();
    const response = await middleware(request, NextResponse);
    
    if (response) {
      return response; // User blocked
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/protected/:path*', '/dashboard/:path*']
};
```

## 🏢 Clerk Integration

### Overview

The Clerk adapter integrates via webhooks to automatically manage high-risk users and enrich user profiles with risk metadata.

### Features

- ✅ **Automatic User Deletion** - High-risk users are automatically removed
- ✅ **Risk Metadata** - User profiles enriched with risk scores
- ✅ **Pre-signup Checking** - Validate users before they reach Clerk
- ✅ **Route Protection** - Middleware for protecting sensitive routes
- ✅ **Admin Dashboard Ready** - Access risk data in admin interfaces

### Basic Setup

**Step 1: Create Webhook Handler**

```javascript
// app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';
import { headers } from 'next/headers';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

export async function POST(request: Request) {
  try {
    const webhookHandler = clerkGuard.createWebhookHandler();
    const result = await webhookHandler(request);
    
    return Response.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

**Step 2: Configure Clerk Webhook**

1. Go to your Clerk Dashboard
2. Navigate to **Webhooks**
3. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Select events: `user.created`, `session.created`
5. Save and copy the signing secret

**Step 3: Environment Variables**

```bash
# .env.local
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Pre-signup Risk Checking

Create an API endpoint to check users before they reach Clerk:

```javascript
// app/api/check-signup-risk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkGuard = new ClerkTrialAbuseAdapter();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    
    // Check risk
    const { allowed, risk, action } = await clerkGuard.preSignUpCheck(
      email, 
      ip, 
      request.headers.get('user-agent')
    );

    if (!allowed) {
      return Response.json({
        allowed: false,
        message: 'Sign-up not available at this time'
      }, { status: 403 });
    }

    return Response.json({
      allowed: true,
      risk: risk.overall,
      action
    });

  } catch (error) {
    console.error('Risk check failed:', error);
    return Response.json({ 
      allowed: true, // Fail open
      error: 'Risk check failed' 
    });
  }
}
```

### Protected Signup Component

```typescript
// components/ProtectedSignUp.tsx
'use client';

import { SignUp } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function ProtectedSignUp() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailRisk = async (email: string) => {
    if (!email || !email.includes('@')) return;

    setIsChecking(true);
    
    try {
      const response = await fetch('/api/check-signup-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!result.allowed) {
        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Risk check failed:', error);
      // Fail open - don't block on error
    } finally {
      setIsChecking(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Sign-up Not Available
          </h2>
          <p className="text-red-600 text-sm">
            We're unable to process your registration at this time. 
            Please contact support if you believe this is an error.
          </p>
          <button 
            onClick={() => setIsBlocked(false)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      {isChecking && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Validating email...</span>
          </div>
        </div>
      )}
      
      <SignUp 
        appearance={{
          elements: {
            formFieldInput: 'focus:ring-2 focus:ring-blue-500'
          }
        }}
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
```

### Route Protection Middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockThreshold: 75,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/user(.*)',
  '/admin(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  // Apply Clerk authentication
  if (isProtectedRoute(request)) {
    auth().protect();
  }

  // Apply trial abuse protection
  const middleware = clerkGuard.createMiddleware();
  const response = await middleware(request, null);
  
  if (response) {
    return response; // High-risk user blocked
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Accessing Risk Data

Risk data is automatically stored in Clerk user metadata:

```typescript
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server';

export default async function Dashboard() {
  const user = await currentUser();
  
  if (!user) return <div>Please sign in</div>;

  const riskScore = user.unsafeMetadata?.riskScore as number;
  const riskLevel = user.unsafeMetadata?.riskLevel as string;
  const flagged = riskScore >= 50;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Welcome, {user.firstName}!
        </h2>
        
        {/* Security Status */}
        <div className="mt-4 p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="font-medium">Account Security Status</span>
            <span className={`px-2 py-1 rounded text-sm ${
              riskLevel === 'low' ? 'bg-green-100 text-green-800' :
              riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {riskLevel || 'verified'}
            </span>
          </div>
          
          {flagged && (
            <div className="mt-2 text-sm text-yellow-700">
              ⚠️ Account under security review. Some features may be limited.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 🛠️ Custom Integration

### Manual Integration

For custom authentication systems or other providers:

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard({
  // Your configuration
});

// In your registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    // Check for trial abuse
    const riskAssessment = await guard.checkUser(email, ipAddress, userAgent);
    
    // Handle based on risk level
    switch (riskAssessment.recommendation) {
      case 'block':
        return res.status(403).json({
          error: 'Registration blocked due to security concerns',
          code: 'TRIAL_ABUSE_DETECTED'
        });
        
      case 'flag':
        // Create user but flag for review
        const user = await createUser({ email, password });
        await flagUserForReview(user.id, riskAssessment);
        
        return res.json({
          user,
          warning: 'Account flagged for security review'
        });
        
      case 'allow':
      default:
        // Normal registration
        const normalUser = await createUser({ email, password });
        return res.json({ user: normalUser });
    }
    
  } catch (error) {
    console.error('Risk assessment failed:', error);
    // Fail open - continue with registration
    const user = await createUser({ email, password });
    return res.json({ user });
  }
});
```

### Express.js Middleware

```javascript
const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

const app = express();
const guard = new TrialAbuseGuard();

// Trial abuse protection middleware
const trialAbuseProtection = async (req, res, next) => {
  const { email } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  if (!email) {
    return next(); // Skip if no email
  }

  try {
    const riskAssessment = await guard.checkUser(email, ipAddress, userAgent);
    
    // Add risk data to request
    req.riskAssessment = riskAssessment;
    
    // Block high-risk users
    if (riskAssessment.recommendation === 'block') {
      return res.status(403).json({
        error: 'Access denied for security reasons',
        code: 'HIGH_RISK_USER'
      });
    }
    
    next();
  } catch (error) {
    console.error('Risk assessment failed:', error);
    req.riskAssessment = null;
    next(); // Fail open
  }
};

// Apply to registration routes
app.post('/register', trialAbuseProtection, (req, res) => {
  const risk = req.riskAssessment;
  
  // Your registration logic here
  if (risk && risk.recommendation === 'flag') {
    console.log(`Flagged user: ${req.body.email} (Risk: ${risk.overall})`);
  }
  
  res.json({ success: true });
});
```

For more integration examples and advanced patterns, see the [Examples Guide](./EXAMPLES.md).