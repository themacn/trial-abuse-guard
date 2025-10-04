# Installation & Setup Guide

Complete guide for installing and setting up Trial Abuse Guard in your project.

## 📦 Installation

### Basic Installation

```bash
npm install trial-abuse-guard
```

### With Authentication Providers

If you're using NextAuth or Clerk:

```bash
# For NextAuth integration
npm install trial-abuse-guard next-auth

# For Clerk integration  
npm install trial-abuse-guard @clerk/nextjs

# For both (if needed)
npm install trial-abuse-guard next-auth @clerk/nextjs
```

### TypeScript Support

Trial Abuse Guard includes full TypeScript support out of the box. No additional packages needed.

## ⚡ Quick Setup

### 1. Basic Setup (Standalone)

```javascript
// Basic usage without authentication provider
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard();

// In your registration endpoint
app.post('/register', async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  // Check for trial abuse
  const riskAssessment = await guard.checkUser(email, ipAddress);
  
  if (riskAssessment.recommendation === 'block') {
    return res.status(403).json({
      error: 'Registration not available',
      code: 'TRIAL_ABUSE_DETECTED'
    });
  }
  
  if (riskAssessment.recommendation === 'flag') {
    // Flag for manual review
    await flagUserForReview(email, riskAssessment);
  }
  
  // Continue with normal registration
  const user = await createUser(req.body);
  res.json({ user });
});
```

### 2. NextAuth Setup

```javascript
// auth.ts (App Router) or pages/api/auth/[...nextauth].ts (Pages Router)
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
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
      })
    ]
  })
);
```

### 3. Clerk Setup

**Step 1: Create webhook handler**

```javascript
// app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

export async function POST(request) {
  const handler = clerkGuard.createWebhookHandler();
  return Response.json(await handler(request));
}
```

**Step 2: Configure Clerk webhook**
1. Go to your Clerk Dashboard
2. Navigate to Webhooks
3. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Select events: `user.created`, `session.created`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (recommended variables):

```bash
# Optional: Enhanced detection with API keys
IPQS_API_KEY=your-ipqualityscore-api-key
VPNAPI_KEY=your-vpnapi-key
PROXYCHECK_KEY=your-proxycheck-key

# Clerk integration (if using Clerk)
CLERK_SECRET_KEY=your-clerk-secret-key

# NextAuth (if using NextAuth)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Basic Configuration

```javascript
const guard = new TrialAbuseGuard({
  // Detection settings
  emailSimilarityCheck: true,
  emailSimilarityThreshold: 0.8,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  
  // Domain management
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24, // hours
  customDisposableDomains: ['your-suspicious-domains.com'],
  
  // API keys for enhanced detection
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY,
    proxyCheck: process.env.PROXYCHECK_KEY
  }
});
```

### Advanced Configuration

```javascript
const guard = new TrialAbuseGuard({
  // Risk thresholds
  emailSimilarityThreshold: 0.85, // More strict
  
  // Custom storage location
  tempEmailStoragePath: './data/temp-domains.json',
  
  // Custom storage adapter (for database integration)
  storageAdapter: new MongoStorageAdapter({
    connectionString: process.env.MONGODB_URI,
    databaseName: 'myapp'
  })
});
```

## 📊 Database Integration

### MongoDB Setup

```javascript
const { MongoStorageAdapter } = require('trial-abuse-guard');

const mongoAdapter = new MongoStorageAdapter({
  connectionString: process.env.MONGODB_URI,
  databaseName: 'myapp',
  collectionName: 'trial_abuse_data'
});

await mongoAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: mongoAdapter
});
```

### PostgreSQL Setup

```javascript
const { PostgreSQLStorageAdapter } = require('trial-abuse-guard');

const pgAdapter = new PostgreSQLStorageAdapter({
  connectionString: process.env.DATABASE_URL,
  tableName: 'trial_abuse_data'
});

await pgAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: pgAdapter
});
```

### Redis Setup

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
```

## 🧪 Testing Setup

### Test Configuration

```javascript
// test-config.js
const { TrialAbuseGuard } = require('trial-abuse-guard');

const testGuard = new TrialAbuseGuard({
  // Disable external API calls for testing
  ipCheck: false,
  vpnCheck: false,
  tempEmailAutoUpdate: false,
  
  // Use in-memory storage for tests
  tempEmailStoragePath: null
});

module.exports = { testGuard };
```

### Test Examples

```javascript
// test/trial-abuse.test.js
const { testGuard } = require('./test-config');

describe('Trial Abuse Guard', () => {
  test('should allow normal emails', async () => {
    const result = await testGuard.checkUser('user@gmail.com', '8.8.8.8');
    expect(result.recommendation).toBe('allow');
  });

  test('should block temp emails', async () => {
    const result = await testGuard.checkUser('test@10minutemail.com', '8.8.8.8');
    expect(result.recommendation).toBe('block');
  });

  test('should detect similar emails', async () => {
    // First user
    await testGuard.checkUser('john@gmail.com', '8.8.8.8');
    
    // Similar user
    const result = await testGuard.checkUser('john2@gmail.com', '8.8.8.8');
    expect(result.factors.emailSimilarity.detected).toBe(true);
  });
});
```

## 🔍 Verification

### Verify Installation

```javascript
// verify-setup.js
const { TrialAbuseGuard } = require('trial-abuse-guard');

async function verifySetup() {
  console.log('🧪 Verifying Trial Abuse Guard setup...');
  
  const guard = new TrialAbuseGuard();
  
  // Test basic functionality
  const result = await guard.checkUser('test@10minutemail.com', '8.8.8.8');
  console.log(`✅ Basic check: ${result.recommendation} (Risk: ${result.overall})`);
  
  // Test domain stats
  const stats = guard.getTempEmailStats();
  console.log(`✅ Domain tracking: ${stats.totalDomains} domains`);
  
  console.log('🎉 Setup verified successfully!');
}

verifySetup().catch(console.error);
```

Run verification:

```bash
node verify-setup.js
```

Expected output:
```
🧪 Verifying Trial Abuse Guard setup...
✅ Basic check: block (Risk: 90)
✅ Domain tracking: 30000+ domains
🎉 Setup verified successfully!
```

## 🚀 Production Deployment

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production

# Enhanced detection (recommended for production)
IPQS_API_KEY=your-production-api-key
VPNAPI_KEY=your-production-api-key

# Database connection
DATABASE_URL=your-production-database-url

# Auth provider secrets
CLERK_SECRET_KEY=your-production-clerk-key
NEXTAUTH_SECRET=your-production-nextauth-secret
```

### Production Configuration

```javascript
const guard = new TrialAbuseGuard({
  // Stricter settings for production
  emailSimilarityThreshold: 0.85,
  blockThreshold: 75,
  
  // Production database
  storageAdapter: productionStorageAdapter,
  
  // Enhanced detection
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY
  },
  
  // Monitoring callbacks
  onUserBlocked: async (email, riskData) => {
    await analytics.track('user_blocked', {
      risk_score: riskData.overall,
      factors: riskData.details
    });
    
    await alerting.send(`High-risk user blocked: ${email}`);
  }
});
```

## 📝 Next Steps

After installation, explore these guides:

1. **[Core Features](./CORE_FEATURES.md)** - Understand detection methods
2. **[Integration Guide](./INTEGRATIONS.md)** - Deep dive into auth provider integration  
3. **[Configuration](./CONFIGURATION.md)** - Customize for your needs
4. **[Examples](./EXAMPLES.md)** - Real-world implementation patterns
5. **[Best Practices](./BEST_PRACTICES.md)** - Production deployment tips

## ❓ Common Issues

### Installation Issues

**Issue: Module not found**
```bash
npm install --save trial-abuse-guard
# Ensure it's in dependencies, not devDependencies
```

**Issue: TypeScript errors**
```bash
npm install --save-dev @types/node
# Ensure TypeScript configuration includes node types
```

### Runtime Issues

**Issue: API timeouts**
```javascript
// Increase timeout in configuration
const guard = new TrialAbuseGuard({
  apiTimeout: 10000 // 10 seconds
});
```

**Issue: High memory usage**
```javascript
// Limit domain list size
const guard = new TrialAbuseGuard({
  tempEmailAutoUpdate: false, // Disable auto-updates
  customDisposableDomains: ['only', 'essential', 'domains.com']
});
```

For more troubleshooting help, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).