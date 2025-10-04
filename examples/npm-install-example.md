# NPM Installation and Usage Examples

Complete examples showing how to install and use trial-abuse-guard as an npm package.

## Installation

```bash
npm install trial-abuse-guard
```

## Basic CommonJS Usage

```javascript
// basic-example.js
const { TrialAbuseGuard } = require('trial-abuse-guard');

async function main() {
  // Initialize the guard
  const guard = new TrialAbuseGuard();
  
  // Check a user for trial abuse
  const result = await guard.checkUser('user@example.com', '192.168.1.100');
  
  console.log('Risk Assessment:');
  console.log('- Overall Risk:', result.overall);
  console.log('- Recommendation:', result.recommendation);
  console.log('- Risk Level:', guard.getRiskLevel(result.overall));
  
  if (result.recommendation === 'block') {
    console.log('🚫 User should be blocked');
  } else if (result.recommendation === 'flag') {
    console.log('⚠️ User should be flagged for review');
  } else {
    console.log('✅ User is safe to allow');
  }
}

main().catch(console.error);
```

## ES Modules Usage

```javascript
// es-module-example.mjs
import { TrialAbuseGuard } from 'trial-abuse-guard';

const guard = new TrialAbuseGuard({
  blockThreshold: 80,
  flagThreshold: 50
});

const result = await guard.checkUser('test@10minutemail.com', '8.8.8.8');
console.log(`${result.recommendation}: ${result.overall}% risk`);
```

## TypeScript Usage

```typescript
// typescript-example.ts
import { 
  TrialAbuseGuard, 
  TrialAbuseConfig, 
  RiskScore 
} from 'trial-abuse-guard';

const config: TrialAbuseConfig = {
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true
};

const guard = new TrialAbuseGuard(config);

async function checkUser(email: string, ip: string): Promise<RiskScore> {
  return await guard.checkUser(email, ip);
}

// Usage
checkUser('user@example.com', '203.0.113.1')
  .then(result => console.log('Risk:', result.overall))
  .catch(error => console.error('Error:', error));
```

## NextAuth Integration

```bash
npm install trial-abuse-guard next-auth
```

```typescript
// auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

const trialGuard = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80
});

export const { handlers, auth } = NextAuth(
  trialGuard.getNextAuthConfig({
    providers: [GitHub]
  })
);
```

## Clerk Integration

```bash
npm install trial-abuse-guard @clerk/nextjs
```

```typescript
// app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

export async function POST(request: Request) {
  const handler = clerkGuard.createWebhookHandler();
  return Response.json(await handler(request));
}
```

## Express.js Integration

```bash
npm install trial-abuse-guard express
```

```javascript
// server.js
const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

const app = express();
const guard = new TrialAbuseGuard();

app.use(express.json());

app.post('/register', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;
  
  try {
    const risk = await guard.checkUser(email, ip);
    
    if (risk.recommendation === 'block') {
      return res.status(403).json({ 
        error: 'Registration blocked',
        code: 'TRIAL_ABUSE_DETECTED'
      });
    }
    
    // Continue with registration...
    res.json({ success: true, riskLevel: guard.getRiskLevel(risk.overall) });
    
  } catch (error) {
    console.error('Risk check failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('🛡️ Server running with trial abuse protection');
});
```

## Database Integration

### MongoDB

```bash
npm install trial-abuse-guard mongodb
```

```javascript
const { TrialAbuseGuard, MongoStorageAdapter } = require('trial-abuse-guard');

const mongoAdapter = new MongoStorageAdapter({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'myapp'
});

await mongoAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: mongoAdapter
});
```

### PostgreSQL

```bash
npm install trial-abuse-guard pg
```

```javascript
const { TrialAbuseGuard, PostgreSQLStorageAdapter } = require('trial-abuse-guard');

const pgAdapter = new PostgreSQLStorageAdapter({
  connectionString: process.env.DATABASE_URL
});

await pgAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: pgAdapter
});
```

### Redis

```bash
npm install trial-abuse-guard redis
```

```javascript
const { TrialAbuseGuard, RedisStorageAdapter } = require('trial-abuse-guard');

const redisAdapter = new RedisStorageAdapter({
  host: 'localhost',
  port: 6379
});

await redisAdapter.connect();

const guard = new TrialAbuseGuard({
  storageAdapter: redisAdapter
});
```

## Domain Management

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard();

// Add custom domains
await guard.addTempEmailDomains(['suspicious.com', 'fake-trials.net']);

// Remove domains
await guard.removeTempEmailDomains(['legitimate.com']);

// Search domains
const results = guard.searchTempEmailDomains('temp');

// Get statistics
const stats = guard.getTempEmailStats();
console.log(`Tracking ${stats.totalDomains} temp email domains`);

// Export domains
await guard.exportTempEmailDomains('./domains-backup.json');

// Import domains
await guard.importTempEmailDomains('./custom-domains.txt');
```

## Environment Configuration

Create a `.env` file:

```bash
# Optional API keys for enhanced detection
IPQS_API_KEY=your-ipqualityscore-key
VPNAPI_KEY=your-vpnapi-key
PROXYCHECK_KEY=your-proxycheck-key

# Database (if using storage adapters)
MONGODB_URI=mongodb://localhost:27017/myapp
DATABASE_URL=postgresql://user:pass@localhost/myapp
REDIS_URL=redis://localhost:6379

# Auth providers (if using integrations)
CLERK_SECRET_KEY=sk_live_your-clerk-secret
NEXTAUTH_SECRET=your-nextauth-secret
```

## Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "NODE_ENV=production node server.js",
    "test:abuse": "node test-abuse-detection.js"
  },
  "dependencies": {
    "trial-abuse-guard": "^1.0.0"
  }
}
```

## Testing Your Installation

Create a test file:

```javascript
// test-installation.js
const { TrialAbuseGuard } = require('trial-abuse-guard');

async function testInstallation() {
  console.log('🧪 Testing Trial Abuse Guard installation...\n');
  
  const guard = new TrialAbuseGuard();
  
  // Test cases
  const tests = [
    { email: 'user@gmail.com', ip: '8.8.8.8', expected: 'allow' },
    { email: 'test@10minutemail.com', ip: '8.8.8.8', expected: 'block' },
  ];
  
  for (const test of tests) {
    const result = await guard.checkUser(test.email, test.ip);
    const status = result.recommendation === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.email} → ${result.recommendation} (expected: ${test.expected})`);
  }
  
  // Check domain stats
  const stats = guard.getTempEmailStats();
  console.log(`\n📊 Domain database: ${stats.totalDomains} domains loaded`);
  
  console.log('\n🎉 Installation test completed!');
}

testInstallation().catch(console.error);
```

Run the test:

```bash
node test-installation.js
```

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure the package is installed in your project directory
2. **TypeScript errors**: Make sure you have `@types/node` installed
3. **API timeouts**: Consider disabling external API checks for development

### Debug Mode

```javascript
const guard = new TrialAbuseGuard({
  debug: true,
  onRiskAssessment: (email, ip, result) => {
    console.log(`Debug: ${email} → ${result.overall}% risk`);
  }
});
```

## Getting Help

- 📖 Full documentation: [GitHub Repository](https://github.com/yourusername/trial-abuse-guard)
- 🐛 Report issues: [GitHub Issues](https://github.com/yourusername/trial-abuse-guard/issues)
- 💬 Ask questions: [GitHub Discussions](https://github.com/yourusername/trial-abuse-guard/discussions)