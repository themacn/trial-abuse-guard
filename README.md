# Trial Abuse Guard

A comprehensive npm package for preventing SaaS trial abuse through intelligent detection of suspicious sign-up patterns, including email similarity detection, temporary email blocking, IP analysis, and VPN detection.

## 🚀 Features

- **Email Similarity Detection**: Identifies users creating multiple accounts with similar email addresses
- **Temporary Email Blocking**: Detects and blocks disposable/temporary email services
- **IP Risk Analysis**: Analyzes IP addresses for suspicious activity and hosting providers
- **VPN/Proxy Detection**: Identifies connections from VPN servers, proxies, and Tor networks
- **Risk Scoring**: Provides comprehensive risk scores with actionable recommendations
- **Database Integration**: Built-in adapters for MongoDB, PostgreSQL, and Redis
- **Easy Integration**: Simple API that works with any Node.js application
- **TypeScript Support**: Fully typed for better development experience

## 📦 Installation

```bash
npm install trial-abuse-guard
```

## 🔧 Basic Usage

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard();

// Check a user for trial abuse - exactly as requested!
const result = await guard.checkUser(
  'user@example.com',
  '192.168.1.100'
);

console.log(result.recommendation); // 'allow', 'flag', or 'block'
console.log(result.overall); // Risk score 0-100
console.log(result.details); // Detailed explanation
```

## 🗂️ Persistent Temp Email Domain Management

The package automatically maintains and updates a persistent list of temporary email domains:

```javascript
// Automatic updates from multiple external sources
const guard = new TrialAbuseGuard({
  tempEmailAutoUpdate: true,        // Auto-update enabled (default)
  tempEmailUpdateInterval: 24,      // Update every 24 hours
  tempEmailStoragePath: './domains.json' // Custom storage location
});

// Add your own domains to the blacklist
await guard.addTempEmailDomains(['suspicious.com', 'fake-trials.org']);

// Remove domains if needed
await guard.removeTempEmailDomains(['legit-domain.com']);

// Get statistics
const stats = guard.getTempEmailStats();
console.log(`Tracking ${stats.totalDomains} temp email domains`);

// Search domains
const results = guard.searchTempEmailDomains('temp');

// Export/Import domain lists
await guard.exportTempEmailDomains('./backup.json');
await guard.importTempEmailDomains('./custom-domains.txt');

// Force update from external sources
await guard.updateTempEmailDomains();
```

## 🔌 Easy Integration with NextAuth/Auth.js and Clerk

The package provides seamless integration with popular authentication libraries:

### NextAuth/Auth.js Integration

```javascript
import NextAuth from 'next-auth';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  onUserBlocked: async (email, riskData) => {
    console.log(`Blocked user: ${email} (Risk: ${riskData.overall})`);
  }
});

export const { handlers, auth } = NextAuth(
  trialAbuseAdapter.getNextAuthConfig({
    providers: [/* your providers */],
    // Your existing config is preserved and enhanced
  })
);
```

**Features:**
- 🚫 Automatically blocks high-risk sign-ups
- ⚠️ Flags suspicious users for review
- 📊 Adds risk data to session and JWT
- 🔧 Preserves all existing NextAuth configuration
- 🎯 Custom callbacks for handling blocked/flagged users

### Clerk Integration

```javascript
// Webhook handler: app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';

const clerkAdapter = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  onUserBlocked: async (email, riskData) => {
    // User is automatically deleted from Clerk
    console.log(`Blocked and deleted: ${email}`);
  }
});

export async function POST(request) {
  const webhookHandler = clerkAdapter.createWebhookHandler();
  return Response.json(await webhookHandler(request));
}
```

**Features:**
- 🗑️ Automatically deletes high-risk users
- 🏷️ Adds risk metadata to user profiles
- 🛡️ Middleware for route protection
- 📊 Admin dashboard integration
- ⚡ Real-time risk assessment

### Pre-signup Risk Checking

```javascript
// Check risk before allowing signup
const { allowed, risk, action } = await clerkAdapter.preSignUpCheck(
  email, 
  ipAddress
);

if (!allowed) {
  return res.status(403).json({ error: 'Sign-up not available' });
}
```

## ⚙️ Configuration

```javascript
const { TrialAbuseGuard, MongoStorageAdapter } = require('trial-abuse-guard');

// Configure with MongoDB storage
const mongoAdapter = new MongoStorageAdapter({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'myapp'
});

await mongoAdapter.connect();

const guard = new TrialAbuseGuard({
  // Detection settings
  emailSimilarityCheck: true,
  emailSimilarityThreshold: 0.8,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  
  // Custom disposable domains
  customDisposableDomains: ['mydisposable.com'],
  
  // API keys for enhanced detection
  apiKeys: {
    ipQualityScore: 'your-api-key',
    vpnapi: 'your-api-key',
    proxyCheck: 'your-api-key'
  },
  
  // Storage adapter
  storageAdapter: mongoAdapter
});
```

## 🔌 Framework Integration

### Express.js

```javascript
const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

const app = express();
const guard = new TrialAbuseGuard();

app.post('/register', async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip;
  
  const risk = await guard.checkUser(email, ipAddress);
  
  if (risk.recommendation === 'block') {
    return res.status(403).json({ 
      error: 'Registration blocked due to security concerns' 
    });
  }
  
  // Proceed with registration...
});
```

### Next.js API Route

```typescript
// pages/api/register.ts
import { TrialAbuseGuard } from 'trial-abuse-guard';

const guard = new TrialAbuseGuard();

export default async function handler(req, res) {
  const { email } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  const risk = await guard.checkUser(email, ipAddress);
  
  if (risk.recommendation === 'block') {
    return res.status(403).json({ error: 'Registration not available' });
  }
  
  // Continue with registration...
}
```

## 💾 Storage Adapters

### MongoDB

```javascript
const { MongoStorageAdapter } = require('trial-abuse-guard');

const mongoAdapter = new MongoStorageAdapter({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'myapp',
  collectionName: 'trial_users' // optional
});
```

### PostgreSQL

```javascript
const { PostgreSQLStorageAdapter } = require('trial-abuse-guard');

const pgAdapter = new PostgreSQLStorageAdapter({
  connectionString: 'postgresql://user:pass@localhost/mydb',
  tableName: 'trial_users' // optional
});
```

### Redis

```javascript
const { RedisStorageAdapter } = require('trial-abuse-guard');

const redisAdapter = new RedisStorageAdapter({
  host: 'localhost',
  port: 6379,
  password: 'your-password', // optional
  keyPrefix: 'trial_abuse:' // optional
});
```

## 🎯 Risk Assessment

The package returns a comprehensive risk assessment:

```javascript
{
  overall: 75,                    // Overall risk score (0-100)
  recommendation: 'flag',         // 'allow', 'flag', or 'block'
  factors: {
    emailSimilarity: {
      score: 85,
      detected: true,
      confidence: 0.9,
      details: "Similar to existing emails: user1@example.com"
    },
    tempEmail: {
      score: 0,
      detected: false,
      confidence: 0.05,
      details: "Email appears legitimate"
    },
    ipRisk: {
      score: 60,
      detected: true,
      confidence: 0.8,
      details: "IP Risk Score: 60, Country: US"
    },
    vpnDetection: {
      score: 80,
      detected: true,
      confidence: 0.9,
      details: "VPN/Proxy detected: VPN=true, Proxy=false, Tor=false"
    }
  },
  details: [
    "Similar to existing emails: user1@example.com",
    "VPN/Proxy detected: VPN=true, Proxy=false, Tor=false"
  ]
}
```

## 🔑 API Keys (Optional but Recommended)

For enhanced detection accuracy, obtain API keys from:

- **IPQualityScore**: [https://www.ipqualityscore.com/](https://www.ipqualityscore.com/)
- **VPNAPI**: [https://vpnapi.io/](https://vpnapi.io/)
- **ProxyCheck**: [https://proxycheck.io/](https://proxycheck.io/)

The package works without API keys but with reduced detection capabilities.

## 📊 Risk Levels

| Score | Level | Recommendation | Action |
|-------|-------|---------------|---------|
| 0-29  | Low   | Allow | Proceed normally |
| 30-59 | Medium | Flag | Manual review recommended |
| 60-79 | High | Flag | Enhanced monitoring |
| 80-100 | Critical | Block | Deny access |

## 🛠️ Advanced Usage

### Custom Storage Adapter

```javascript
class CustomStorageAdapter {
  async getExistingEmails() {
    // Return array of existing emails
    return ['email1@example.com', 'email2@example.com'];
  }
  
  async getExistingIPs(email) {
    // Return array of IPs for this email
    return ['192.168.1.1', '203.0.113.1'];
  }
  
  async storeUserData(data) {
    // Store user data for future comparisons
    console.log('Storing:', data);
  }
}

const guard = new TrialAbuseGuard({
  storageAdapter: new CustomStorageAdapter()
});
```

### Individual Detectors

```javascript
const { 
  EmailSimilarityDetector, 
  TempEmailDetector, 
  IPAnalyzer, 
  VPNDetector 
} = require('trial-abuse-guard');

// Use individual detectors for specific needs
const emailDetector = new EmailSimilarityDetector(config);
const result = await emailDetector.checkSimilarity('test@example.com');
```

## 🧪 Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

This package is designed to enhance security but should be part of a comprehensive security strategy. Always:

- Keep your API keys secure
- Regularly update the package
- Monitor and adjust risk thresholds based on your needs
- Implement proper logging and monitoring

## 📈 Performance

- Lightweight with minimal dependencies
- Async/await support for non-blocking operations
- Caching strategies for improved performance
- Configurable timeouts for external API calls

## 🆘 Support

- 📖 [Documentation](https://github.com/yourusername/trial-abuse-guard/wiki)
- 🐛 [Issues](https://github.com/yourusername/trial-abuse-guard/issues)
- 💬 [Discussions](https://github.com/yourusername/trial-abuse-guard/discussions)

---

**Made with ❤️ for the developer community**