# Troubleshooting Guide

Common issues and solutions for Trial Abuse Guard.

## 🐛 Common Issues

### Installation Problems

#### Issue: Module not found
```
Error: Cannot find module 'trial-abuse-guard'
```

**Solution:**
```bash
# Ensure package is installed correctly
npm install trial-abuse-guard

# Check package.json
npm list trial-abuse-guard

# Clear cache if needed
npm cache clean --force
npm install
```

#### Issue: TypeScript compilation errors
```
error TS2307: Cannot find module 'trial-abuse-guard'
```

**Solution:**
```bash
# Install type definitions
npm install --save-dev @types/node

# Update tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Runtime Issues

#### Issue: High memory usage
```
JavaScript heap out of memory
```

**Solution:**
```javascript
// Disable auto-updates for memory-constrained environments
const guard = new TrialAbuseGuard({
  tempEmailAutoUpdate: false,
  ipCheck: false,
  vpnCheck: false
});

// Or use memory-efficient storage
const guard = new TrialAbuseGuard({
  tempEmailStoragePath: null, // Memory only
  customDisposableDomains: ['essential-domains-only.com']
});
```

#### Issue: Slow response times
```
Risk assessment taking > 5 seconds
```

**Solution:**
```javascript
// Implement caching
class FastTrialGuard {
  constructor() {
    this.cache = new Map();
    this.guard = new TrialAbuseGuard({
      // Disable slower checks
      ipCheck: false,
      vpnCheck: false
    });
  }
  
  async checkUser(email, ip) {
    const key = `${email}:${ip}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = await this.guard.checkUser(email, ip);
    this.cache.set(key, result);
    
    // Clean cache after 5 minutes
    setTimeout(() => this.cache.delete(key), 300000);
    
    return result;
  }
}
```

#### Issue: API timeouts
```
Request timeout for IP analysis
```

**Solution:**
```javascript
// Implement timeout handling
const guard = new TrialAbuseGuard({
  apiTimeout: 3000, // 3 seconds
  
  // Fallback on timeout
  onTimeout: (service) => {
    console.warn(`${service} timed out, using fallback`);
  }
});

// Or disable problematic services
const guard = new TrialAbuseGuard({
  ipCheck: false, // Disable if causing timeouts
  vpnCheck: false
});
```

### Configuration Issues

#### Issue: False positives
```
Legitimate users being blocked
```

**Solution:**
```javascript
// Adjust thresholds
const guard = new TrialAbuseGuard({
  emailSimilarityThreshold: 0.9, // More strict (less false positives)
  blockThreshold: 90,            // Higher block threshold
  
  // Add whitelist
  customValidation: async (email, ip) => {
    // Skip checks for company domains
    if (email.endsWith('@yourcompany.com')) {
      return { skip: true, reason: 'Company email' };
    }
    
    // Skip for trusted IPs
    if (trustedIPs.includes(ip)) {
      return { skip: true, reason: 'Trusted IP' };
    }
    
    return { skip: false };
  }
});

// Remove false positive domains
await guard.removeTempEmailDomains([
  'legitimate-domain.com',
  'partner-company.org'
]);
```

#### Issue: Missing domain updates
```
Domains not updating automatically
```

**Solution:**
```javascript
// Check update configuration
const stats = guard.getTempEmailStats();
console.log('Auto-update enabled:', stats.autoUpdateEnabled);
console.log('Last update:', stats.lastUpdate);

// Force manual update
await guard.updateTempEmailDomains();

// Check file permissions (if using file storage)
const fs = require('fs');
try {
  await fs.access('./temp-domains.json', fs.constants.W_OK);
  console.log('File is writable');
} catch (error) {
  console.error('File permission issue:', error);
}

// Use alternative storage
const guard = new TrialAbuseGuard({
  storageAdapter: new RedisStorageAdapter(redisConfig)
});
```

### Integration Issues

#### Issue: NextAuth not detecting risk data
```
session.user.riskScore is undefined
```

**Solution:**
```javascript
// Ensure adapter is configured before NextAuth
const adapter = new NextAuthTrialAbuseAdapter(config);

// Make sure to use the enhanced config
export const { handlers, auth } = NextAuth(
  adapter.getNextAuthConfig(baseConfig) // Use adapter's config
);

// Check session in component
import { useSession } from 'next-auth/react';

export function Component() {
  const { data: session, status } = useSession();
  
  console.log('Session:', session);
  console.log('Risk data:', session?.user?.riskScore);
  
  return <div>Risk: {session?.user?.riskLevel || 'unknown'}</div>;
}
```

#### Issue: Clerk webhooks not working
```
User created but risk assessment not triggered
```

**Solution:**
```javascript
// Verify webhook configuration
// 1. Check Clerk dashboard webhook settings
// 2. Verify endpoint URL is correct
// 3. Check webhook events are selected

// Add debugging to webhook handler
export async function POST(request) {
  console.log('Webhook received:', request.headers);
  
  try {
    const body = await request.text();
    console.log('Webhook body:', body);
    
    const handler = clerkGuard.createWebhookHandler();
    const result = await handler(request);
    
    console.log('Handler result:', result);
    return Response.json(result);
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Test webhook locally with ngrok
// npm install -g ngrok
// ngrok http 3000
// Use ngrok URL in Clerk dashboard
```

## 🔧 Debug Mode

### Enable Debug Logging

```javascript
const guard = new TrialAbuseGuard({
  debug: true,
  
  onRiskAssessment: (email, ip, result) => {
    console.log(`[DEBUG] Assessment for ${email}:`, {
      overall: result.overall,
      recommendation: result.recommendation,
      factors: Object.keys(result.factors).map(factor => ({
        name: factor,
        detected: result.factors[factor].detected,
        score: result.factors[factor].score,
        confidence: result.factors[factor].confidence
      }))
    });
  }
});
```

### Performance Debugging

```javascript
class DebugTrialGuard {
  constructor(config) {
    this.guard = new TrialAbuseGuard(config);
  }
  
  async checkUser(email, ip, userAgent) {
    const startTime = Date.now();
    console.log(`[PERF] Starting assessment for ${email}`);
    
    try {
      const result = await this.guard.checkUser(email, ip, userAgent);
      
      const duration = Date.now() - startTime;
      console.log(`[PERF] Assessment completed in ${duration}ms`);
      
      // Break down timing by factor
      this.logFactorTiming(result);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF] Assessment failed after ${duration}ms:`, error);
      throw error;
    }
  }
  
  logFactorTiming(result) {
    Object.entries(result.factors).forEach(([factor, data]) => {
      if (data.timing) {
        console.log(`[PERF] ${factor}: ${data.timing}ms`);
      }
    });
  }
}
```

### Network Debugging

```javascript
// Debug external API calls
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  console.log(`[NET] Request to ${url}`);
  const startTime = Date.now();
  
  try {
    const response = await originalFetch(url, options);
    const duration = Date.now() - startTime;
    
    console.log(`[NET] Response from ${url}: ${response.status} (${duration}ms)`);
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[NET] Request to ${url} failed after ${duration}ms:`, error);
    throw error;
  }
};
```

## 📊 Health Checks

### System Health

```javascript
class HealthChecker {
  constructor(guard) {
    this.guard = guard;
  }
  
  async checkHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    try {
      // Check domain service
      const stats = this.guard.getTempEmailStats();
      health.checks.domains = {
        status: stats.totalDomains > 1000 ? 'healthy' : 'warning',
        count: stats.totalDomains,
        lastUpdate: stats.lastUpdate
      };
      
      // Check API connectivity
      health.checks.apis = await this.checkAPIs();
      
      // Check storage
      health.checks.storage = await this.checkStorage();
      
      // Overall health
      const allHealthy = Object.values(health.checks)
        .every(check => check.status === 'healthy');
      
      health.status = allHealthy ? 'healthy' : 'degraded';
      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }
    
    return health;
  }
  
  async checkAPIs() {
    const apiChecks = {};
    
    // Check IP API
    try {
      const testIP = '8.8.8.8';
      await this.guard.checkUser('test@example.com', testIP);
      apiChecks.ipServices = { status: 'healthy' };
    } catch (error) {
      apiChecks.ipServices = { status: 'error', error: error.message };
    }
    
    return apiChecks;
  }
  
  async checkStorage() {
    try {
      // Test storage operations
      const testData = {
        email: 'health-check@example.com',
        ipAddress: '127.0.0.1',
        timestamp: new Date()
      };
      
      if (this.guard.config.storageAdapter) {
        await this.guard.config.storageAdapter.storeUserData(testData);
      }
      
      return { status: 'healthy' };
      
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

// Usage
const healthChecker = new HealthChecker(guard);

app.get('/health', async (req, res) => {
  const health = await healthChecker.checkHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## 🆘 Getting Help

### Collecting Debug Information

```javascript
function collectDebugInfo(guard) {
  return {
    version: require('trial-abuse-guard/package.json').version,
    nodeVersion: process.version,
    platform: process.platform,
    config: {
      emailSimilarityCheck: guard.config.emailSimilarityCheck,
      tempEmailCheck: guard.config.tempEmailCheck,
      ipCheck: guard.config.ipCheck,
      vpnCheck: guard.config.vpnCheck,
      storageAdapter: guard.config.storageAdapter?.constructor?.name
    },
    stats: guard.getTempEmailStats(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasApiKeys: {
        ipQualityScore: !!process.env.IPQS_API_KEY,
        vpnapi: !!process.env.VPNAPI_KEY,
        proxyCheck: !!process.env.PROXYCHECK_KEY
      }
    }
  };
}

// When reporting issues, include this information
console.log('Debug Info:', JSON.stringify(collectDebugInfo(guard), null, 2));
```

### Support Channels

- **📖 Documentation**: Check all documentation files in `/docs`
- **🐛 GitHub Issues**: Report bugs with debug information
- **💬 Discussions**: Ask questions in GitHub Discussions
- **📧 Email**: support@trial-abuse-guard.com

### Before Contacting Support

1. **Check the logs** for error messages
2. **Try the latest version** of the package
3. **Test with minimal configuration** to isolate the issue
4. **Collect debug information** using the script above
5. **Check network connectivity** to external APIs

### Common Solutions Checklist

- [ ] Package installed correctly (`npm list trial-abuse-guard`)
- [ ] Environment variables set (`IPQS_API_KEY`, etc.)
- [ ] File permissions correct (if using file storage)
- [ ] Network allows outbound HTTPS requests
- [ ] API keys are valid and have sufficient quota
- [ ] Configuration is valid JSON/JavaScript
- [ ] Storage adapter is properly configured
- [ ] Webhook endpoints are accessible (for integrations)

For more help, see the complete documentation at [docs/README.md](./README.md).