# Core Features Guide

Comprehensive guide to Trial Abuse Guard's detection methods and capabilities.

## 🔍 Detection Methods Overview

Trial Abuse Guard uses four primary detection methods to identify suspicious users:

1. **Email Similarity Detection** - Identifies users creating multiple accounts
2. **Temporary Email Blocking** - Prevents disposable email usage
3. **IP Risk Analysis** - Analyzes IP address characteristics
4. **VPN/Proxy Detection** - Identifies anonymized connections

## 📧 Email Similarity Detection

### How It Works

The email similarity detector uses advanced algorithms to identify when users create multiple accounts with slightly different email addresses.

```javascript
// Examples of emails that would be flagged as similar:
'john.doe@gmail.com'     // Original
'john.doe2@gmail.com'    // Similar (added number)
'johndoe@gmail.com'      // Similar (removed dots)
'john_doe@gmail.com'     // Similar (different separator)
'john.doe+test@gmail.com' // Similar (Gmail alias)
```

### Detection Algorithm

1. **Email Normalization**
   - Removes dots from Gmail addresses
   - Strips Gmail aliases (+ symbols)
   - Converts to lowercase
   - Handles common email variations

2. **Similarity Calculation**
   - Uses Levenshtein distance algorithm
   - Compares local parts (username) separately
   - Analyzes domain matching
   - Detects sequential numbering patterns

3. **Pattern Recognition**
   - Identifies sequential numbers (user1, user2, user3)
   - Detects common variations (dots, underscores, hyphens)
   - Recognizes alias patterns

### Configuration

```javascript
const guard = new TrialAbuseGuard({
  emailSimilarityCheck: true,
  emailSimilarityThreshold: 0.8, // 0-1 scale (1 = identical)
  
  // Custom storage to track existing emails
  storageAdapter: yourStorageAdapter
});
```

### Similarity Scoring

| Similarity Score | Description | Action |
|-----------------|-------------|---------|
| 0.95-1.0 | Nearly identical | High risk |
| 0.85-0.94 | Very similar | Medium-high risk |
| 0.75-0.84 | Somewhat similar | Medium risk |
| 0.60-0.74 | Loosely similar | Low-medium risk |
| < 0.60 | Different | Low risk |

### Examples

```javascript
// Test email similarity
const guard = new TrialAbuseGuard();

// Add some existing users
await guard.checkUser('john.smith@gmail.com', '8.8.8.8');
await guard.checkUser('mary.johnson@yahoo.com', '8.8.8.8');

// Check similar emails
const result1 = await guard.checkUser('john.smith2@gmail.com', '8.8.8.8');
console.log(result1.factors.emailSimilarity.detected); // true
console.log(result1.factors.emailSimilarity.score); // ~90

const result2 = await guard.checkUser('completely.different@example.com', '8.8.8.8');
console.log(result2.factors.emailSimilarity.detected); // false
console.log(result2.factors.emailSimilarity.score); // ~5
```

## 🚫 Temporary Email Detection

### How It Works

Maintains an extensive, automatically updated database of temporary and disposable email domains.

### Domain Sources

1. **Built-in List** - 1,000+ common disposable domains
2. **External Sources** - 30,000+ domains from multiple repositories
3. **Custom Domains** - Your own suspicious domain list
4. **Pattern Detection** - Algorithmic detection of disposable-like domains

### Auto-Update System

```javascript
const guard = new TrialAbuseGuard({
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24, // hours
  
  // External sources (automatically used)
  // - GitHub disposable email lists
  // - Community-maintained blacklists
  // - Security research databases
});
```

### Detection Patterns

The system recognizes these suspicious patterns:

1. **Known Disposable Services**
   - 10minutemail.com, guerrillamail.com, mailinator.com
   - tempmail.org, yopmail.com, sharklasers.com

2. **Suspicious Domain Patterns**
   - Very short domains (< 6 characters)
   - Domains with many numbers or hyphens
   - Suspicious TLDs (.tk, .ml, .ga, .cf)
   - Random-looking domain names

3. **Suspicious Keywords**
   - temp, disposable, throwaway, fake
   - trash, spam, burner, delete
   - test, temporary, mail

### Custom Domain Management

```javascript
// Add your own suspicious domains
await guard.addTempEmailDomains([
  'suspicious-domain.com',
  'fake-trials.net',
  'company-temp-emails.org'
]);

// Remove false positives
await guard.removeTempEmailDomains(['legitimate-domain.com']);

// Search existing domains
const tempDomains = guard.searchTempEmailDomains('temp');
console.log(`Found ${tempDomains.length} domains containing "temp"`);

// Export for backup
await guard.exportTempEmailDomains('./domain-backup.json');

// Get statistics
const stats = guard.getTempEmailStats();
console.log(`Tracking ${stats.totalDomains} disposable domains`);
```

## 🌐 IP Risk Analysis

### How It Works

Analyzes IP addresses for suspicious characteristics that indicate potential trial abuse.

### Risk Factors

1. **Hosting Providers**
   - Data centers and cloud providers
   - VPS and dedicated server ranges
   - Higher risk due to easy automation

2. **Geographic Patterns**
   - High-risk countries and regions
   - Locations with known fraud activity
   - Unusual geographic distribution

3. **Network Characteristics**
   - ASN (Autonomous System Number) analysis
   - ISP reputation scoring
   - Network block analysis

### Configuration

```javascript
const guard = new TrialAbuseGuard({
  ipCheck: true,
  
  // Enhanced detection with API keys
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    // Provides detailed IP reputation data
  }
});
```

### IP Risk Scoring

| Risk Score | Description | Common Sources |
|-----------|-------------|----------------|
| 0-20 | Low risk | Residential ISPs, mobile carriers |
| 21-40 | Low-medium | Business connections, small ISPs |
| 41-60 | Medium | Shared hosting, some data centers |
| 61-80 | High | Cloud providers, VPS hosts |
| 81-100 | Critical | Known fraud networks, tor exits |

### Examples

```javascript
// Test IP risk analysis
const results = await Promise.all([
  guard.checkUser('user@gmail.com', '8.8.8.8'), // Google DNS - low risk
  guard.checkUser('user@gmail.com', '192.168.1.1'), // Private IP - no risk
  guard.checkUser('user@gmail.com', '104.16.1.1'), // Cloudflare - medium risk
]);

results.forEach((result, i) => {
  console.log(`IP ${i + 1}: Risk ${result.factors.ipRisk.score}`);
});
```

## 🛡️ VPN/Proxy Detection

### How It Works

Identifies connections through VPNs, proxies, and anonymization services that are commonly used for trial abuse.

### Detection Methods

1. **Database Lookups**
   - Known VPN server IP ranges
   - Commercial proxy services
   - Tor exit nodes

2. **API-Based Detection**
   - Real-time VPN detection services
   - Proxy verification APIs
   - Network behavior analysis

3. **Pattern Analysis**
   - Hosting provider analysis
   - Network topology detection
   - Connection behavior patterns

### VPN/Proxy Types Detected

1. **Commercial VPNs**
   - NordVPN, ExpressVPN, CyberGhost
   - Residential VPN services
   - Business VPN solutions

2. **Proxy Services**
   - HTTP/HTTPS proxies
   - SOCKS proxies
   - Residential proxy networks

3. **Anonymization Networks**
   - Tor network exit nodes
   - Anonymous proxy chains
   - Privacy-focused networks

### Configuration

```javascript
const guard = new TrialAbuseGuard({
  vpnCheck: true,
  
  // Multiple detection services for accuracy
  apiKeys: {
    vpnapi: process.env.VPNAPI_KEY,
    proxyCheck: process.env.PROXYCHECK_KEY,
    ipQualityScore: process.env.IPQS_API_KEY
  }
});
```

### Custom VPN Ranges

```javascript
// Add custom VPN IP ranges
const vpnDetector = guard.getVPNDetector();
vpnDetector.addVPNRanges([
  '192.168.100.0/24', // Company VPN range
  '10.0.50.0/24'      // Another VPN range
]);
```

## 📊 Risk Scoring System

### Overall Risk Calculation

The overall risk score is calculated using weighted factors:

```javascript
const weights = {
  emailSimilarity: 0.30,  // 30%
  tempEmail: 0.25,        // 25%
  ipRisk: 0.25,           // 25%
  vpnDetection: 0.20      // 20%
};

// Example calculation:
// Email Similarity: 85 * 0.30 = 25.5
// Temp Email: 90 * 0.25 = 22.5
// IP Risk: 60 * 0.25 = 15.0
// VPN Detection: 80 * 0.20 = 16.0
// Total: 79 (High risk)
```

### Confidence Levels

Each factor includes a confidence level:

- **High Confidence (0.8-1.0)**: Definitive detection
- **Medium Confidence (0.5-0.79)**: Probable detection
- **Low Confidence (0.2-0.49)**: Possible detection
- **Very Low Confidence (0-0.19)**: Uncertain detection

### Risk Recommendations

```javascript
function getRecommendation(score) {
  if (score >= 80) return 'block';    // Critical risk
  if (score >= 50) return 'flag';     // Medium-high risk
  return 'allow';                     // Low-medium risk
}
```

## 🔧 Advanced Configuration

### Custom Detection Rules

```javascript
const guard = new TrialAbuseGuard({
  // Email similarity settings
  emailSimilarityThreshold: 0.85, // Stricter matching
  
  // Custom risk weights
  riskWeights: {
    emailSimilarity: 0.40,  // Emphasize email patterns
    tempEmail: 0.30,
    ipRisk: 0.20,
    vpnDetection: 0.10
  },
  
  // Custom thresholds
  blockThreshold: 75,       // Block at 75+ risk
  flagThreshold: 40,        // Flag at 40+ risk
});
```

### Whitelist Management

```javascript
// IP whitelist for trusted networks
const trustedIPs = ['203.0.113.1', '198.51.100.1'];

// Custom validation
const customGuard = new TrialAbuseGuard({
  customValidation: async (email, ip, userAgent) => {
    // Skip checks for trusted IPs
    if (trustedIPs.includes(ip)) {
      return { skip: true, reason: 'Trusted IP' };
    }
    
    // Skip checks for company domains
    if (email.endsWith('@yourcompany.com')) {
      return { skip: true, reason: 'Company email' };
    }
    
    return { skip: false };
  }
});
```

### Real-time Monitoring

```javascript
const guard = new TrialAbuseGuard({
  onRiskAssessment: async (email, ip, riskData) => {
    // Log all assessments
    console.log(`Risk assessment: ${email} -> ${riskData.overall}`);
    
    // Send to analytics
    analytics.track('trial_risk_assessment', {
      email_hash: hashEmail(email),
      risk_score: riskData.overall,
      factors: Object.keys(riskData.factors).filter(
        factor => riskData.factors[factor].detected
      )
    });
    
    // Alert on high risk
    if (riskData.overall >= 80) {
      await alerting.sendSlack(`🚨 High-risk signup: ${riskData.overall}`);
    }
  }
});
```

## 📈 Performance Optimization

### Caching

```javascript
const guard = new TrialAbuseGuard({
  // Enable result caching
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000 // Max cached results
  }
});
```

### Async Processing

```javascript
// Non-blocking assessment
const checkUserAsync = async (email, ip) => {
  try {
    return await guard.checkUser(email, ip);
  } catch (error) {
    // Log error but don't block user
    console.error('Risk assessment failed:', error);
    return { recommendation: 'allow', overall: 0 };
  }
};
```

### Rate Limiting

```javascript
const guard = new TrialAbuseGuard({
  // API rate limiting
  rateLimit: {
    requests: 100,     // 100 requests
    window: 60000,     // per minute
    backoff: 'exponential'
  }
});
```

## 🎯 Use Cases

### 1. SaaS Trial Protection

```javascript
// Protect trial signups
app.post('/start-trial', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;
  
  const risk = await guard.checkUser(email, ip);
  
  if (risk.recommendation === 'block') {
    return res.status(403).json({ error: 'Trial not available' });
  }
  
  // Adjust trial based on risk
  const trialLength = risk.overall > 50 ? 7 : 14; // Shorter for risky users
  const features = risk.overall > 50 ? 'limited' : 'full';
  
  const trial = await createTrial(email, { length: trialLength, features });
  res.json({ trial, riskLevel: guard.getRiskLevel(risk.overall) });
});
```

### 2. Account Creation Limits

```javascript
// Limit account creation from risky sources
app.post('/register', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;
  
  const risk = await guard.checkUser(email, ip);
  
  if (risk.factors.vpnDetection.detected) {
    return res.status(400).json({
      error: 'Please disable VPN/proxy to register'
    });
  }
  
  if (risk.factors.tempEmail.detected) {
    return res.status(400).json({
      error: 'Please use a permanent email address'
    });
  }
  
  // Continue with registration
});
```

### 3. Progressive Verification

```javascript
// Apply different verification levels based on risk
const applyVerificationLevel = (user, riskScore) => {
  if (riskScore >= 70) {
    // High risk: require phone + ID verification
    return { phone: true, id: true, manual: true };
  } else if (riskScore >= 40) {
    // Medium risk: require phone verification
    return { phone: true, id: false, manual: false };
  } else {
    // Low risk: email verification only
    return { phone: false, id: false, manual: false };
  }
};
```

For more implementation examples, see the [Examples Guide](./EXAMPLES.md).