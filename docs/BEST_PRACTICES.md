# Best Practices Guide

Production deployment guidelines and optimization strategies for Trial Abuse Guard.

## 🚀 Production Deployment

### Environment Setup

```javascript
// production-config.js
const productionConfig = {
  // Enhanced detection for production
  emailSimilarityCheck: true,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  
  // Strict thresholds
  emailSimilarityThreshold: 0.85,
  
  // Frequent updates
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 12, // Every 12 hours
  
  // Production storage
  tempEmailStoragePath: process.env.TEMP_DOMAINS_PATH || '/data/temp-domains.json',
  
  // All API keys for maximum accuracy
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY,
    proxyCheck: process.env.PROXYCHECK_KEY
  },
  
  // Database storage for scalability
  storageAdapter: new MongoStorageAdapter({
    connectionString: process.env.MONGODB_URI,
    databaseName: 'production'
  })
};

module.exports = productionConfig;
```

### Error Handling

```javascript
class RobustTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard(config);
    this.fallbackMode = false;
  }
  
  async checkUser(email, ip, userAgent) {
    try {
      const result = await this.guard.checkUser(email, ip, userAgent);
      
      // Reset fallback mode on success
      if (this.fallbackMode) {
        this.fallbackMode = false;
        console.log('✅ Trial Abuse Guard: Resumed normal operation');
      }
      
      return result;
      
    } catch (error) {
      console.error('Trial Abuse Guard error:', error);
      
      // Enable fallback mode
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        await this.alertAdmins('Trial Abuse Guard: Fallback mode activated');
      }
      
      // Return safe fallback
      return this.getFallbackResult(email, ip);
    }
  }
  
  getFallbackResult(email, ip) {
    // Basic checks without external APIs
    const isObviouslyTemp = this.isObviouslyTempEmail(email);
    const isPrivateIP = this.isPrivateIP(ip);
    
    if (isObviouslyTemp) {
      return {
        overall: 90,
        recommendation: 'block',
        factors: { tempEmail: { detected: true, score: 90 } },
        details: ['Obvious temporary email (fallback mode)']
      };
    }
    
    return {
      overall: 0,
      recommendation: 'allow',
      factors: {},
      details: ['Fallback mode - limited checks only']
    };
  }
  
  isObviouslyTempEmail(email) {
    const obviouslyTemp = [
      '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'tempmail.org', 'yopmail.com', 'temp-mail.org'
    ];
    
    const domain = email.toLowerCase().split('@')[1];
    return obviouslyTemp.includes(domain);
  }
  
  isPrivateIP(ip) {
    // Basic private IP check
    return ip.startsWith('192.168.') || 
           ip.startsWith('10.') || 
           ip.startsWith('172.16.') ||
           ip === '127.0.0.1';
  }
  
  async alertAdmins(message) {
    // Alert administrators about issues
    console.error(message);
    
    try {
      if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
      }
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
  }
}
```

### Monitoring and Logging

```javascript
class MonitoredTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard({
      ...config,
      onRiskAssessment: this.trackMetrics.bind(this)
    });
    
    this.metrics = {
      total: 0,
      blocked: 0,
      flagged: 0,
      allowed: 0,
      errors: 0
    };
  }
  
  async checkUser(email, ip, userAgent) {
    const startTime = Date.now();
    
    try {
      const result = await this.guard.checkUser(email, ip, userAgent);
      
      // Track performance
      const duration = Date.now() - startTime;
      this.trackPerformance('checkUser', duration);
      
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      this.trackError(error, { email, ip });
      throw error;
    }
  }
  
  trackMetrics(email, ip, result) {
    this.metrics.total++;
    this.metrics[result.recommendation]++;
    
    // Send to analytics
    if (typeof analytics !== 'undefined') {
      analytics.track('trial_abuse_check', {
        email_hash: this.hashEmail(email),
        ip_hash: this.hashIP(ip),
        risk_score: result.overall,
        recommendation: result.recommendation,
        factors_detected: Object.keys(result.factors).filter(
          factor => result.factors[factor].detected
        )
      });
    }
    
    // Log high-risk assessments
    if (result.overall >= 80) {
      console.warn(`High-risk user detected: ${this.hashEmail(email)} (${result.overall})`);
    }
  }
  
  trackPerformance(operation, duration) {
    if (typeof metrics !== 'undefined') {
      metrics.timing(`trial_guard.${operation}`, duration);
    }
    
    // Alert on slow operations
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow operation: ${operation} took ${duration}ms`);
    }
  }
  
  trackError(error, context) {
    console.error('Trial Guard error:', error, context);
    
    if (typeof metrics !== 'undefined') {
      metrics.increment('trial_guard.errors');
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      blockRate: this.metrics.blocked / this.metrics.total,
      flagRate: this.metrics.flagged / this.metrics.total,
      errorRate: this.metrics.errors / this.metrics.total
    };
  }
  
  hashEmail(email) {
    // Simple hash for privacy
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 8);
  }
  
  hashIP(ip) {
    // Hash IP for privacy
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 8);
  }
}
```

## ⚡ Performance Optimization

### Caching Strategy

```javascript
class CachedTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard(config);
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 10000;
  }
  
  async checkUser(email, ip, userAgent) {
    const cacheKey = this.getCacheKey(email, ip);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = await this.guard.checkUser(email, ip, userAgent);
    this.setCache(cacheKey, result);
    
    return result;
  }
  
  getCacheKey(email, ip) {
    // Cache by email domain + IP subnet for privacy
    const domain = email.split('@')[1];
    const ipSubnet = ip.split('.').slice(0, 3).join('.');
    return `${domain}:${ipSubnet}`;
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }
  
  setCache(key, result) {
    // Only cache non-personal results
    if (result.factors.emailSimilarity.detected) {
      return; // Don't cache email similarity results
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Cleanup old entries
    if (this.cache.size > this.maxCacheSize) {
      this.cleanupCache();
    }
  }
  
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    console.log(`Cache cleanup: removed ${cleaned} expired entries`);
  }
}
```

### Rate Limiting

```javascript
class RateLimitedTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard(config);
    this.rateLimiter = new Map();
    this.maxRequestsPerMinute = 60;
  }
  
  async checkUser(email, ip, userAgent) {
    // Rate limit by IP
    if (!this.checkRateLimit(ip)) {
      throw new Error('Rate limit exceeded');
    }
    
    return await this.guard.checkUser(email, ip, userAgent);
  }
  
  checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    let requests = this.rateLimiter.get(ip) || [];
    
    // Remove old requests
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= this.maxRequestsPerMinute) {
      return false;
    }
    
    // Add current request
    requests.push(now);
    this.rateLimiter.set(ip, requests);
    
    return true;
  }
}
```

## 🔒 Security Best Practices

### API Key Management

```javascript
// Secure API key handling
class SecureTrialGuard {
  constructor() {
    // Validate API keys on startup
    this.validateAPIKeys();
    
    this.guard = new TrialAbuseGuard({
      apiKeys: {
        ipQualityScore: this.getSecureAPIKey('IPQS_API_KEY'),
        vpnapi: this.getSecureAPIKey('VPNAPI_KEY'),
        proxyCheck: this.getSecureAPIKey('PROXYCHECK_KEY')
      }
    });
  }
  
  getSecureAPIKey(envVar) {
    const key = process.env[envVar];
    
    if (!key) {
      console.warn(`Warning: ${envVar} not set - reduced functionality`);
      return null;
    }
    
    // Basic key validation
    if (key.length < 20) {
      console.warn(`Warning: ${envVar} appears invalid`);
    }
    
    return key;
  }
  
  validateAPIKeys() {
    const requiredKeys = ['IPQS_API_KEY', 'VPNAPI_KEY'];
    const missing = requiredKeys.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`Missing API keys: ${missing.join(', ')}`);
      console.warn('Consider adding these for enhanced detection');
    }
  }
}
```

### Data Privacy

```javascript
class PrivacyAwareTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard({
      ...config,
      
      // Custom storage adapter that doesn't store emails directly
      storageAdapter: new PrivacyStorageAdapter()
    });
  }
  
  async checkUser(email, ip, userAgent) {
    // Hash sensitive data before processing
    const hashedEmail = this.hashPII(email);
    const hashedIP = this.hashPII(ip);
    
    const result = await this.guard.checkUser(email, ip, userAgent);
    
    // Log without sensitive data
    this.logAssessment(hashedEmail, hashedIP, result);
    
    return result;
  }
  
  hashPII(data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(data.toLowerCase() + process.env.HASH_SALT)
      .digest('hex')
      .slice(0, 16);
  }
  
  logAssessment(hashedEmail, hashedIP, result) {
    console.log(`Assessment: ${hashedEmail}@${hashedIP} -> ${result.recommendation}`);
  }
}

class PrivacyStorageAdapter {
  constructor() {
    this.hashedEmails = new Set();
  }
  
  async getExistingEmails() {
    // Return hashed emails for similarity comparison
    return Array.from(this.hashedEmails);
  }
  
  async storeUserData(data) {
    // Store only hashed versions
    const hashedEmail = this.hashEmail(data.email);
    this.hashedEmails.add(hashedEmail);
  }
  
  hashEmail(email) {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(email.toLowerCase() + process.env.HASH_SALT)
      .digest('hex');
  }
}
```

## 📈 Scaling Strategies

### Microservice Architecture

```javascript
// trial-abuse-service.js
const express = require('express');
const { TrialAbuseGuard } = require('trial-abuse-guard');

class TrialAbuseService {
  constructor() {
    this.app = express();
    this.guard = new TrialAbuseGuard({
      // Service-specific configuration
    });
    
    this.setupRoutes();
    this.setupHealthChecks();
  }
  
  setupRoutes() {
    this.app.use(express.json());
    
    // Main assessment endpoint
    this.app.post('/assess', async (req, res) => {
      try {
        const { email, ip, userAgent } = req.body;
        
        if (!email || !ip) {
          return res.status(400).json({ error: 'Email and IP required' });
        }
        
        const result = await this.guard.checkUser(email, ip, userAgent);
        
        res.json({
          riskScore: result.overall,
          recommendation: result.recommendation,
          riskLevel: this.guard.getRiskLevel(result.overall),
          details: result.details
        });
        
      } catch (error) {
        console.error('Assessment error:', error);
        res.status(500).json({ error: 'Assessment failed' });
      }
    });
    
    // Domain management endpoints
    this.app.post('/domains', async (req, res) => {
      const { domains } = req.body;
      await this.guard.addTempEmailDomains(domains);
      res.json({ success: true });
    });
    
    this.app.get('/domains/stats', (req, res) => {
      const stats = this.guard.getTempEmailStats();
      res.json(stats);
    });
  }
  
  setupHealthChecks() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        domainCount: this.guard.getTempEmailStats().totalDomains
      });
    });
    
    this.app.get('/metrics', (req, res) => {
      res.json(this.getMetrics());
    });
  }
  
  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`🛡️ Trial Abuse Service running on port ${port}`);
    });
  }
}

// Usage
const service = new TrialAbuseService();
service.start();
```

### Load Balancing

```javascript
// client-side load balancer
class TrialAbuseClient {
  constructor(serviceUrls) {
    this.services = serviceUrls.map(url => ({ url, healthy: true }));
    this.currentIndex = 0;
    
    // Health check interval
    setInterval(() => this.healthCheck(), 30000);
  }
  
  async checkUser(email, ip, userAgent) {
    const service = this.getHealthyService();
    
    if (!service) {
      throw new Error('No healthy services available');
    }
    
    try {
      const response = await fetch(`${service.url}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ip, userAgent }),
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Service error: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // Mark service as unhealthy
      service.healthy = false;
      
      // Retry with next service
      return this.checkUser(email, ip, userAgent);
    }
  }
  
  getHealthyService() {
    const healthyServices = this.services.filter(s => s.healthy);
    
    if (healthyServices.length === 0) {
      return null;
    }
    
    // Round-robin selection
    const service = healthyServices[this.currentIndex % healthyServices.length];
    this.currentIndex++;
    
    return service;
  }
  
  async healthCheck() {
    for (const service of this.services) {
      try {
        const response = await fetch(`${service.url}/health`, { timeout: 3000 });
        service.healthy = response.ok;
      } catch (error) {
        service.healthy = false;
      }
    }
  }
}
```

## 🧪 Testing Strategies

### Unit Testing

```javascript
// test/trial-guard.test.js
const { TrialAbuseGuard } = require('trial-abuse-guard');

describe('TrialAbuseGuard', () => {
  let guard;
  
  beforeEach(() => {
    guard = new TrialAbuseGuard({
      ipCheck: false,
      vpnCheck: false,
      tempEmailAutoUpdate: false
    });
  });
  
  describe('Email Detection', () => {
    test('should allow legitimate emails', async () => {
      const result = await guard.checkUser('user@gmail.com', '8.8.8.8');
      expect(result.recommendation).toBe('allow');
      expect(result.overall).toBeLessThan(30);
    });
    
    test('should block obvious temp emails', async () => {
      const result = await guard.checkUser('test@10minutemail.com', '8.8.8.8');
      expect(result.recommendation).toBe('block');
      expect(result.factors.tempEmail.detected).toBe(true);
    });
    
    test('should detect email similarity', async () => {
      // First user
      await guard.checkUser('john@gmail.com', '8.8.8.8');
      
      // Similar user
      const result = await guard.checkUser('john2@gmail.com', '8.8.8.8');
      expect(result.factors.emailSimilarity.detected).toBe(true);
    });
  });
  
  describe('Risk Calculation', () => {
    test('should calculate risk levels correctly', () => {
      expect(guard.getRiskLevel(10)).toBe('low');
      expect(guard.getRiskLevel(45)).toBe('medium');
      expect(guard.getRiskLevel(70)).toBe('high');
      expect(guard.getRiskLevel(90)).toBe('critical');
    });
  });
});
```

### Integration Testing

```javascript
// test/integration.test.js
const request = require('supertest');
const app = require('../app'); // Your Express app

describe('Trial Abuse Integration', () => {
  test('should block registration with temp email', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        email: 'test@guerrillamail.com',
        password: 'password123',
        name: 'Test User'
      });
    
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TRIAL_ABUSE_DETECTED');
  });
  
  test('should allow normal registration', async () => {
    const response = await request(app)
      .post('/register')
      .send({
        email: 'normal@gmail.com',
        password: 'password123',
        name: 'Normal User'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
  });
});
```

For troubleshooting common issues, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).