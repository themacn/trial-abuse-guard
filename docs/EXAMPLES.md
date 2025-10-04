# Examples & Recipes

Real-world implementation examples and common usage patterns.

## 🚀 Quick Start Examples

### Basic Setup (30 seconds)

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard();

// Check any user
const checkUser = async (email, ip) => {
  const result = await guard.checkUser(email, ip);
  
  console.log(`${email}: ${result.recommendation} (${result.overall}% risk)`);
  
  return result.recommendation !== 'block';
};

// Usage
await checkUser('user@gmail.com', '8.8.8.8');        // ✅ allow
await checkUser('test@10minutemail.com', '8.8.8.8');  // 🚫 block
```

### Express.js Integration

```javascript
const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

const app = express();
const guard = new TrialAbuseGuard();

app.use(express.json());

// Registration endpoint with protection
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  const ipAddress = req.ip;
  
  try {
    // Check for trial abuse
    const risk = await guard.checkUser(email, ipAddress);
    
    if (risk.recommendation === 'block') {
      return res.status(403).json({
        error: 'Registration not available',
        code: 'TRIAL_ABUSE_DETECTED'
      });
    }
    
    // Create user
    const user = await createUser({ email, password, name });
    
    // Flag suspicious users
    if (risk.recommendation === 'flag') {
      await flagUserForReview(user.id, risk);
    }
    
    res.json({ 
      user,
      riskLevel: guard.getRiskLevel(risk.overall)
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.listen(3000, () => {
  console.log('🛡️ Server running with trial abuse protection');
});
```

## 🔌 Authentication Provider Examples

### NextAuth.js Complete Example

```javascript
// auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialGuard = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  flagThreshold: 50,
  
  onUserBlocked: async (email, riskData) => {
    console.log(`🚫 Blocked: ${email} (Risk: ${riskData.overall})`);
    
    // Analytics
    analytics.track('user_blocked', {
      email_hash: hashEmail(email),
      risk_score: riskData.overall,
      factors: riskData.details
    });
    
    // Admin alert
    await slack.send(`High-risk signup blocked: ${email}`);
  },
  
  onUserFlagged: async (email, riskData) => {
    console.log(`⚠️ Flagged: ${email} (Risk: ${riskData.overall})`);
    await addToReviewQueue(email, riskData);
  }
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
    pages: {
      error: '/auth/error'
    }
  })
);

// components/UserDashboard.tsx
import { useSession } from 'next-auth/react';

export function UserDashboard() {
  const { data: session } = useSession();
  
  if (!session?.user) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      
      {session.user.flagged && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <h3 className="text-yellow-800 font-medium">Account Review</h3>
          <p className="text-yellow-700 text-sm">
            Your account is under security review. Some features may be limited.
          </p>
          <p className="text-yellow-600 text-xs mt-1">
            Risk Level: {session.user.riskLevel}
          </p>
        </div>
      )}
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Clerk Complete Example

```javascript
// app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  
  onUserBlocked: async (email, riskData) => {
    console.log(`🗑️ Deleted high-risk user: ${email}`);
    await sendAdminAlert(`Blocked user: ${email} (Risk: ${riskData.overall})`);
  },
  
  onUserFlagged: async (userId, email, riskData) => {
    console.log(`🏷️ Flagged user: ${email}`);
    await addToReviewQueue(userId, email, riskData);
  }
});

export async function POST(request) {
  const handler = clerkGuard.createWebhookHandler();
  return Response.json(await handler(request));
}

// app/api/check-signup-risk/route.ts
export async function POST(request) {
  const { email } = await request.json();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  
  const { allowed, risk } = await clerkGuard.preSignUpCheck(email, ip);
  
  return Response.json({ allowed, risk: risk.overall });
}

// components/ProtectedSignUp.tsx
'use client';
import { SignUp } from '@clerk/nextjs';
import { useState } from 'react';

export function ProtectedSignUp() {
  const [blocked, setBlocked] = useState(false);

  const checkRisk = async (email) => {
    const response = await fetch('/api/check-signup-risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    if (!result.allowed) setBlocked(true);
  };

  if (blocked) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg">
        <h2 className="text-red-800 text-xl mb-2">Sign-up Not Available</h2>
        <p className="text-red-600">Please contact support for assistance.</p>
      </div>
    );
  }

  return <SignUp />;
}
```

## 💾 Database Integration Examples

### MongoDB Integration

```javascript
const { TrialAbuseGuard, MongoStorageAdapter } = require('trial-abuse-guard');
const { MongoClient } = require('mongodb');

// Setup MongoDB adapter
const mongoAdapter = new MongoStorageAdapter({
  connectionString: process.env.MONGODB_URI,
  databaseName: 'myapp',
  collectionName: 'trial_abuse_users'
});

await mongoAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: mongoAdapter,
  emailSimilarityCheck: true,
  tempEmailCheck: true
});

// Usage with persistent storage
const analyzeUser = async (email, ip) => {
  const result = await guard.checkUser(email, ip);
  
  // Data is automatically stored in MongoDB
  console.log(`Risk assessment stored for ${email}`);
  
  return result;
};

// Get user history
const getUserHistory = async (email) => {
  return await mongoAdapter.getUserHistory(email, 10);
};

// Cleanup old data
const cleanup = async () => {
  const deleted = await mongoAdapter.cleanup(90); // Remove data older than 90 days
  console.log(`Cleaned up ${deleted} old records`);
};
```

### PostgreSQL Integration

```javascript
const { PostgreSQLStorageAdapter } = require('trial-abuse-guard');

const pgAdapter = new PostgreSQLStorageAdapter({
  connectionString: process.env.DATABASE_URL,
  tableName: 'user_risk_assessments'
});

await pgAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: pgAdapter
});

// Advanced analytics with SQL
const getAnalytics = async () => {
  const client = pgAdapter.client;
  
  const results = await client.query(`
    SELECT 
      DATE_TRUNC('day', timestamp) as date,
      COUNT(*) as total_checks,
      AVG(CASE WHEN risk_score >= 80 THEN 1 ELSE 0 END) as block_rate,
      AVG(CASE WHEN risk_score >= 50 THEN 1 ELSE 0 END) as flag_rate
    FROM user_risk_assessments 
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', timestamp)
    ORDER BY date DESC
  `);
  
  return results.rows;
};
```

### Redis Integration

```javascript
const { RedisStorageAdapter } = require('trial-abuse-guard');

const redisAdapter = new RedisStorageAdapter({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'trial_abuse:'
});

await redisAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: redisAdapter
});

// High-performance checking with Redis
const fastCheck = async (email, ip) => {
  // Redis provides sub-millisecond lookups
  const result = await guard.checkUser(email, ip);
  
  // Cache results for repeated checks
  await redisAdapter.cacheResult(email, result, 300); // 5 minutes
  
  return result;
};
```

## 🎯 Advanced Use Cases

### SaaS Trial Protection

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

class SaaSTrialManager {
  constructor() {
    this.guard = new TrialAbuseGuard({
      blockThreshold: 80,
      flagThreshold: 50,
      apiKeys: {
        ipQualityScore: process.env.IPQS_API_KEY
      }
    });
  }

  async startTrial(email, ip, planType) {
    const risk = await this.guard.checkUser(email, ip);
    
    // Block high-risk users
    if (risk.recommendation === 'block') {
      throw new Error('Trial not available');
    }
    
    // Customize trial based on risk
    const trialConfig = this.getTrialConfig(risk.overall, planType);
    
    const trial = await this.createTrial(email, trialConfig);
    
    // Apply monitoring for flagged users
    if (risk.recommendation === 'flag') {
      await this.enableEnhancedMonitoring(trial.id);
    }
    
    return {
      trial,
      riskLevel: this.guard.getRiskLevel(risk.overall),
      restrictions: trialConfig.restrictions
    };
  }
  
  getTrialConfig(riskScore, planType) {
    const baseConfig = {
      duration: 14,
      features: 'full',
      apiLimit: 1000,
      restrictions: []
    };
    
    if (riskScore >= 60) {
      // High-medium risk: restricted trial
      return {
        ...baseConfig,
        duration: 7,
        features: 'limited',
        apiLimit: 100,
        restrictions: ['manual_approval_required', 'limited_api_access']
      };
    } else if (riskScore >= 30) {
      // Medium risk: slightly restricted
      return {
        ...baseConfig,
        duration: 10,
        apiLimit: 500,
        restrictions: ['enhanced_monitoring']
      };
    }
    
    return baseConfig;
  }
  
  async createTrial(email, config) {
    // Your trial creation logic
    return {
      id: generateTrialId(),
      email,
      startDate: new Date(),
      endDate: new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000),
      features: config.features,
      apiLimit: config.apiLimit
    };
  }
  
  async enableEnhancedMonitoring(trialId) {
    // Add to monitoring queue
    await monitoringQueue.add('enhanced_monitoring', { trialId });
  }
}

// Usage
const trialManager = new SaaSTrialManager();

app.post('/start-trial', async (req, res) => {
  try {
    const { email, planType } = req.body;
    const ip = req.ip;
    
    const result = await trialManager.startTrial(email, ip, planType);
    
    res.json({
      success: true,
      trial: result.trial,
      riskLevel: result.riskLevel,
      message: result.restrictions.length > 0 ? 
        'Trial started with security restrictions' : 
        'Trial started successfully'
    });
    
  } catch (error) {
    if (error.message === 'Trial not available') {
      res.status(403).json({
        error: 'Trial registration is not available at this time',
        code: 'TRIAL_BLOCKED'
      });
    } else {
      res.status(500).json({ error: 'Failed to start trial' });
    }
  }
});
```

### Multi-tier Security

```javascript
class SecurityTierManager {
  constructor() {
    this.guard = new TrialAbuseGuard();
  }
  
  async assessUserSecurity(email, ip, userAgent) {
    const risk = await this.guard.checkUser(email, ip, userAgent);
    
    return {
      tier: this.getSecurityTier(risk.overall),
      verificationRequired: this.getRequiredVerification(risk),
      accountLimits: this.getAccountLimits(risk.overall),
      riskFactors: this.extractRiskFactors(risk)
    };
  }
  
  getSecurityTier(riskScore) {
    if (riskScore >= 80) return 'high_risk';
    if (riskScore >= 60) return 'medium_risk';
    if (riskScore >= 30) return 'low_risk';
    return 'trusted';
  }
  
  getRequiredVerification(risk) {
    const verification = {
      email: true,
      phone: false,
      id: false,
      manual: false
    };
    
    if (risk.overall >= 70) {
      verification.phone = true;
      verification.id = true;
      verification.manual = true;
    } else if (risk.overall >= 50) {
      verification.phone = true;
    }
    
    return verification;
  }
  
  getAccountLimits(riskScore) {
    if (riskScore >= 60) {
      return {
        dailyApiCalls: 100,
        maxProjects: 1,
        featureAccess: 'basic',
        withdrawalDelay: 72 // hours
      };
    } else if (riskScore >= 30) {
      return {
        dailyApiCalls: 1000,
        maxProjects: 5,
        featureAccess: 'standard',
        withdrawalDelay: 24
      };
    }
    
    return {
      dailyApiCalls: 10000,
      maxProjects: 50,
      featureAccess: 'full',
      withdrawalDelay: 0
    };
  }
  
  extractRiskFactors(risk) {
    return Object.entries(risk.factors)
      .filter(([_, factor]) => factor.detected)
      .map(([name, factor]) => ({
        type: name,
        severity: factor.score,
        confidence: factor.confidence,
        description: factor.details
      }));
  }
}

// Usage in registration flow
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');
  
  const securityManager = new SecurityTierManager();
  const security = await securityManager.assessUserSecurity(email, ip, userAgent);
  
  if (security.tier === 'high_risk') {
    return res.status(403).json({
      error: 'Registration blocked',
      code: 'HIGH_RISK_USER'
    });
  }
  
  // Create user with security profile
  const user = await createUser({
    email,
    password,
    securityTier: security.tier,
    verificationRequired: security.verificationRequired,
    accountLimits: security.accountLimits,
    riskFactors: security.riskFactors
  });
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      securityTier: security.tier
    },
    nextSteps: getNextSteps(security.verificationRequired)
  });
});
```

For more examples and advanced patterns, see the [Best Practices Guide](./BEST_PRACTICES.md).