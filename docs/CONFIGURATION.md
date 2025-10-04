# Configuration Guide

Complete guide to configuring Trial Abuse Guard for your specific needs.

## 🔧 Basic Configuration

### Default Settings

Trial Abuse Guard works out-of-the-box with sensible defaults:

```javascript
const guard = new TrialAbuseGuard();
// Uses all default settings - perfect for getting started
```

Default configuration:
```javascript
{
  emailSimilarityCheck: true,
  emailSimilarityThreshold: 0.8,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24,
  customDisposableDomains: [],
  apiKeys: {}
}
```

### Custom Configuration

```javascript
const guard = new TrialAbuseGuard({
  // Detection toggles
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: false,              // Disable IP checking
  vpnCheck: false,             // Disable VPN detection
  
  // Thresholds
  emailSimilarityThreshold: 0.85,  // More strict
  
  // Domain management
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 12,     // Update every 12 hours
  
  // Custom domains
  customDisposableDomains: [
    'company-temp.com',
    'suspicious-domain.net'
  ]
});
```

## ⚙️ Configuration Options

### Detection Settings

#### emailSimilarityCheck
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable email similarity detection

#### emailSimilarityThreshold
- **Type:** `number` (0-1)
- **Default:** `0.8`
- **Description:** Similarity threshold for flagging emails
- **Range:** 0 = any similarity, 1 = identical only

```javascript
// More strict - only flag very similar emails
emailSimilarityThreshold: 0.9

// More lenient - flag loosely similar emails
emailSimilarityThreshold: 0.7
```

#### tempEmailCheck
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable temporary email detection

#### ipCheck
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable IP risk analysis

#### vpnCheck
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Enable VPN/proxy detection

### Domain Management

#### customDisposableDomains
- **Type:** `string[]`
- **Default:** `[]`
- **Description:** Your custom list of suspicious domains

```javascript
customDisposableDomains: [
  'company-test.com',
  'internal-temp.org',
  'known-bad-domain.net'
]
```

#### tempEmailAutoUpdate
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Automatically update domain lists

#### tempEmailUpdateInterval
- **Type:** `number`
- **Default:** `24`
- **Description:** Hours between automatic updates

#### tempEmailStoragePath
- **Type:** `string`
- **Default:** `'./temp-domains.json'`
- **Description:** File path for storing domains

```javascript
// Custom storage locations
tempEmailStoragePath: '/data/domains.json',           // Production
tempEmailStoragePath: './config/temp-domains.json',   // Development
tempEmailStoragePath: null,                           // Memory only (serverless)
```

### API Keys

#### apiKeys.ipQualityScore
- **Type:** `string`
- **Description:** IPQualityScore API key for enhanced IP analysis
- **Get key:** https://www.ipqualityscore.com/

#### apiKeys.vpnapi
- **Type:** `string`
- **Description:** VPNAPI.io key for VPN detection
- **Get key:** https://vpnapi.io/

#### apiKeys.proxyCheck
- **Type:** `string`
- **Description:** ProxyCheck.io key for proxy detection
- **Get key:** https://proxycheck.io/

```javascript
apiKeys: {
  ipQualityScore: process.env.IPQS_API_KEY,
  vpnapi: process.env.VPNAPI_KEY,
  proxyCheck: process.env.PROXYCHECK_KEY
}
```

### Storage Configuration

#### storageAdapter
- **Type:** `StorageAdapter`
- **Description:** Custom storage adapter for user data persistence

```javascript
// MongoDB
storageAdapter: new MongoStorageAdapter({
  connectionString: process.env.MONGODB_URI,
  databaseName: 'myapp'
})

// PostgreSQL
storageAdapter: new PostgreSQLStorageAdapter({
  connectionString: process.env.DATABASE_URL
})

// Redis
storageAdapter: new RedisStorageAdapter({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
})
```

## 🎯 Environment-Specific Configurations

### Development Configuration

```javascript
const devConfig = {
  // Disable external API calls to save quota
  ipCheck: false,
  vpnCheck: false,
  
  // Disable auto-updates for faster startup
  tempEmailAutoUpdate: false,
  
  // Use memory storage
  tempEmailStoragePath: null,
  
  // Lower thresholds for testing
  emailSimilarityThreshold: 0.7,
  
  // Add test domains
  customDisposableDomains: [
    'test-temp.com',
    'dev-disposable.org'
  ]
};

const guard = new TrialAbuseGuard(devConfig);
```

### Production Configuration

```javascript
const prodConfig = {
  // Enable all detection methods
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  
  // Strict thresholds
  emailSimilarityThreshold: 0.85,
  
  // Frequent updates
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 12,
  
  // Production storage
  tempEmailStoragePath: '/data/temp-domains.json',
  
  // Enhanced detection with API keys
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY,
    proxyCheck: process.env.PROXYCHECK_KEY
  },
  
  // Database storage
  storageAdapter: new MongoStorageAdapter({
    connectionString: process.env.MONGODB_URI,
    databaseName: 'production'
  }),
  
  // Production domains
  customDisposableDomains: await loadCustomDomains()
};

const guard = new TrialAbuseGuard(prodConfig);
```

### Testing Configuration

```javascript
const testConfig = {
  // Disable external dependencies
  ipCheck: false,
  vpnCheck: false,
  tempEmailAutoUpdate: false,
  
  // Use in-memory storage
  storageAdapter: new InMemoryStorageAdapter(),
  
  // Predictable behavior
  emailSimilarityThreshold: 0.8,
  
  // Test-specific domains
  customDisposableDomains: [
    'test-disposable.com',
    'fake-temp.org'
  ]
};

const testGuard = new TrialAbuseGuard(testConfig);
```

## 🔌 Integration-Specific Configuration

### NextAuth Configuration

```javascript
const nextAuthConfig = {
  blockHighRisk: true,
  flagMediumRisk: true,
  blockThreshold: 80,
  flagThreshold: 50,
  
  // Callbacks
  onUserBlocked: async (email, riskData) => {
    await analytics.track('nextauth_user_blocked', {
      email_hash: hashEmail(email),
      risk_score: riskData.overall
    });
  },
  
  onUserFlagged: async (email, riskData) => {
    await addToReviewQueue(email, riskData);
  },
  
  // Enhanced detection
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY
  }
};

const adapter = new NextAuthTrialAbuseAdapter(nextAuthConfig);
```

### Clerk Configuration

```javascript
const clerkConfig = {
  blockHighRisk: true,
  blockThreshold: 75,
  flagThreshold: 45,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  
  // Callbacks
  onUserBlocked: async (email, riskData) => {
    console.log(`Clerk: Blocked and deleted ${email}`);
    await sendAdminAlert(`High-risk user: ${email}`);
  },
  
  onUserFlagged: async (userId, email, riskData) => {
    console.log(`Clerk: Flagged ${email} with metadata`);
    await addToManualReview(userId, riskData);
  }
};

const clerkAdapter = new ClerkTrialAbuseAdapter(clerkConfig);
```

## 📊 Performance Configuration

### High-Volume Configuration

```javascript
const highVolumeConfig = {
  // Optimize for speed
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: false,  // Disable slower IP checks
  vpnCheck: false, // Disable slower VPN checks
  
  // Reduce update frequency
  tempEmailUpdateInterval: 48,
  
  // Use Redis for performance
  storageAdapter: new RedisStorageAdapter({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }),
  
  // Caching
  enableCaching: true,
  cacheTimeout: 300 // 5 minutes
};
```

### Low-Resource Configuration

```javascript
const lightweightConfig = {
  // Minimal features
  emailSimilarityCheck: false,
  tempEmailCheck: true,
  ipCheck: false,
  vpnCheck: false,
  
  // No auto-updates
  tempEmailAutoUpdate: false,
  
  // Memory only
  storageAdapter: null,
  
  // Minimal domain list
  customDisposableDomains: [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com'
  ]
};
```

## 🎛️ Advanced Configuration

### Custom Risk Weights

```javascript
const customWeightConfig = {
  // Standard detection
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  
  // Custom risk calculation
  calculateRisk: (factors) => {
    const weights = {
      emailSimilarity: 0.4,  // Emphasize email patterns
      tempEmail: 0.3,
      ipRisk: 0.2,
      vpnDetection: 0.1
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [factor, weight] of Object.entries(weights)) {
      if (factors[factor].confidence > 0) {
        totalScore += factors[factor].score * weight * factors[factor].confidence;
        totalWeight += weight * factors[factor].confidence;
      }
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
};
```

### Conditional Detection

```javascript
const conditionalConfig = {
  // Enable/disable based on conditions
  emailSimilarityCheck: process.env.NODE_ENV === 'production',
  ipCheck: !isTestEnvironment(),
  vpnCheck: hasAPICredits(),
  
  // Dynamic thresholds
  emailSimilarityThreshold: getUserTier() === 'premium' ? 0.9 : 0.8,
  
  // Conditional custom domains
  customDisposableDomains: await loadDomainsForRegion(userRegion)
};
```

## 🔍 Debugging Configuration

### Debug Mode

```javascript
const debugConfig = {
  // Enable detailed logging
  debug: true,
  
  // Log all assessments
  onRiskAssessment: (email, ip, result) => {
    console.log(`[DEBUG] ${email} @ ${ip}:`, {
      overall: result.overall,
      recommendation: result.recommendation,
      factors: Object.keys(result.factors).filter(
        f => result.factors[f].detected
      )
    });
  },
  
  // Track performance
  onPerformanceMetric: (metric, duration) => {
    console.log(`[PERF] ${metric}: ${duration}ms`);
  }
};
```

### Validation Configuration

```javascript
const validatedConfig = {
  // Validate inputs
  validateInputs: true,
  
  // Sanitize emails
  sanitizeEmail: (email) => email.toLowerCase().trim(),
  
  // Validate IP addresses
  validateIP: (ip) => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return ipRegex.test(ip);
  },
  
  // Custom validation
  customValidation: async (email, ip) => {
    // Skip validation for whitelisted domains
    if (email.endsWith('@yourcompany.com')) {
      return { skip: true, reason: 'Company email' };
    }
    
    // Skip for trusted IP ranges
    if (isTrustedIP(ip)) {
      return { skip: true, reason: 'Trusted network' };
    }
    
    return { skip: false };
  }
};
```

## 📁 Configuration Management

### Environment Variables

```bash
# .env file structure
NODE_ENV=production

# API Keys
IPQS_API_KEY=your_ipqualityscore_key
VPNAPI_KEY=your_vpnapi_key
PROXYCHECK_KEY=your_proxycheck_key

# Database
MONGODB_URI=mongodb://localhost:27017/myapp
DATABASE_URL=postgresql://user:pass@localhost/myapp
REDIS_URL=redis://localhost:6379

# Auth Providers
CLERK_SECRET_KEY=sk_live_your_clerk_key
NEXTAUTH_SECRET=your_nextauth_secret

# File Paths
TEMP_DOMAINS_PATH=/data/temp-domains.json
```

### Configuration Loading

```javascript
// config/trial-abuse.js
const loadConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    tempEmailAutoUpdate: true,
    tempEmailUpdateInterval: 24
  };
  
  const envConfigs = {
    development: {
      ...baseConfig,
      ipCheck: false,
      vpnCheck: false,
      tempEmailStoragePath: './dev-domains.json'
    },
    
    production: {
      ...baseConfig,
      apiKeys: {
        ipQualityScore: process.env.IPQS_API_KEY,
        vpnapi: process.env.VPNAPI_KEY
      },
      tempEmailStoragePath: process.env.TEMP_DOMAINS_PATH
    },
    
    test: {
      ...baseConfig,
      tempEmailAutoUpdate: false,
      storageAdapter: null
    }
  };
  
  return envConfigs[env] || envConfigs.development;
};

module.exports = loadConfig();
```

For complete configuration examples, see the [Examples Guide](./EXAMPLES.md).