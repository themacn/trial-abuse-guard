# Domain Management Guide

Comprehensive guide to managing temporary email domains with Trial Abuse Guard.

## 🗂️ Overview

Trial Abuse Guard maintains an extensive, automatically updated database of temporary and disposable email domains. This system provides:

- **30,000+ domains** from multiple external sources
- **Automatic updates** from community-maintained lists
- **Custom domain management** for your specific needs
- **Persistent storage** with configurable locations
- **Search and export** functionality

## 🔄 Auto-Update System

### How It Works

The domain service automatically fetches updated domain lists from multiple sources:

1. **GitHub Repositories** - Community-maintained blacklists
2. **Security Research** - Academic and commercial threat intelligence
3. **User Contributions** - Crowdsourced domain discoveries

### Configuration

```javascript
const guard = new TrialAbuseGuard({
  // Auto-update settings
  tempEmailAutoUpdate: true,        // Enable automatic updates
  tempEmailUpdateInterval: 24,      // Update every 24 hours
  tempEmailStoragePath: './domains.json', // Custom storage location
  
  // External sources (automatically configured)
  // You can also disable auto-update and manage manually
});
```

### Update Sources

The system pulls from these verified sources:

```javascript
// Default external sources (automatically used)
const sources = [
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/domains.txt',
  'https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt',
  'https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt'
];

// Custom sources can be added
const customGuard = new TrialAbuseGuard({
  externalSources: [
    ...sources,
    'https://your-company.com/suspicious-domains.txt'
  ]
});
```

### Manual Updates

```javascript
// Force an immediate update
await guard.updateTempEmailDomains();

// Check last update time
const stats = guard.getTempEmailStats();
console.log('Last updated:', stats.lastUpdate);

// Get update status
console.log('Auto-update enabled:', stats.autoUpdateEnabled);
console.log('Update interval:', stats.updateInterval, 'hours');
```

## 📝 Custom Domain Management

### Adding Domains

```javascript
// Add single domain
await guard.addTempEmailDomains(['suspicious-domain.com']);

// Add multiple domains
await guard.addTempEmailDomains([
  'fake-trials.net',
  'temp-signups.org',
  'burner-accounts.com',
  'company-test-emails.io'
]);

// Add domains with patterns
const suspiciousDomains = [
  'temp-mail-*.com',     // Pattern matching
  '*-disposable.net',    // Wildcard patterns
  'trial-abuse-*.org'    // Company-specific patterns
];

await guard.addTempEmailDomains(suspiciousDomains);
```

### Removing Domains

```javascript
// Remove false positives
await guard.removeTempEmailDomains([
  'legitimate-company.com',
  'real-business.org'
]);

// Remove multiple domains
const falsePositives = [
  'customer-domain.com',
  'partner-email.net',
  'valid-service.org'
];

await guard.removeTempEmailDomains(falsePositives);
```

### Bulk Operations

```javascript
// Get all domains
const allDomains = guard.getTempEmailDomains();
console.log(`Total domains: ${allDomains.length}`);

// Search domains
const tempDomains = guard.searchTempEmailDomains('temp');
const testDomains = guard.searchTempEmailDomains('test');
const mailDomains = guard.searchTempEmailDomains('mail');

console.log(`Found ${tempDomains.length} domains containing "temp"`);

// Check specific domain
const isSuspicious = guard.getTempEmailDetector().isDomainDisposable('example.com');
console.log('Domain is suspicious:', isSuspicious);
```

## 📊 Statistics and Monitoring

### Domain Statistics

```javascript
const stats = guard.getTempEmailStats();

console.log('Domain Statistics:');
console.log('- Total domains:', stats.totalDomains);
console.log('- Last update:', stats.lastUpdate);
console.log('- Auto-update:', stats.autoUpdateEnabled ? 'ON' : 'OFF');
console.log('- Update interval:', stats.updateInterval, 'hours');
console.log('- Sources:', stats.sources.length);

// Example output:
// Domain Statistics:
// - Total domains: 31,247
// - Last update: 2024-01-15T10:30:00.000Z
// - Auto-update: ON
// - Update interval: 24 hours
// - Sources: 3
```

### Monitoring Updates

```javascript
// Set up monitoring
const guard = new TrialAbuseGuard({
  onDomainUpdate: async (stats) => {
    console.log(`📊 Domain list updated: ${stats.totalDomains} total domains`);
    
    // Send to monitoring service
    await metrics.gauge('temp_domains.total', stats.totalDomains);
    await metrics.increment('temp_domains.updates');
    
    // Alert if significant change
    if (stats.newDomainsAdded > 1000) {
      await alerting.send(`Large domain update: +${stats.newDomainsAdded} domains`);
    }
  }
});
```

## 💾 Storage Management

### Default Storage

By default, domains are stored in a JSON file:

```javascript
// Default location: ./temp-domains.json
{
  "domains": [
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    // ... 30,000+ more domains
  ],
  "lastUpdate": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Custom Storage Location

```javascript
const guard = new TrialAbuseGuard({
  tempEmailStoragePath: '/data/suspicious-domains.json'
});

// For Docker environments
const dockerGuard = new TrialAbuseGuard({
  tempEmailStoragePath: '/app/data/domains.json'
});

// For serverless environments (use memory storage)
const serverlessGuard = new TrialAbuseGuard({
  tempEmailStoragePath: null, // Memory only
  tempEmailAutoUpdate: false  // Disable file operations
});
```

### Database Storage

For production environments, integrate with your database:

```javascript
// Custom storage adapter
class CustomDomainStorage {
  async loadDomains() {
    const result = await db.query('SELECT domain FROM temp_email_domains');
    return result.rows.map(row => row.domain);
  }
  
  async saveDomains(domains) {
    await db.query('DELETE FROM temp_email_domains');
    const values = domains.map(domain => `('${domain}')`).join(',');
    await db.query(`INSERT INTO temp_email_domains (domain) VALUES ${values}`);
  }
  
  async addDomains(domains) {
    const values = domains.map(domain => `('${domain}')`).join(',');
    await db.query(`INSERT IGNORE INTO temp_email_domains (domain) VALUES ${values}`);
  }
  
  async removeDomains(domains) {
    const placeholders = domains.map(() => '?').join(',');
    await db.query(`DELETE FROM temp_email_domains WHERE domain IN (${placeholders})`, domains);
  }
}

const guard = new TrialAbuseGuard({
  storageAdapter: new CustomDomainStorage()
});
```

## 📤 Import/Export

### Export Domains

```javascript
// Export to JSON
await guard.exportTempEmailDomains('./backup/domains.json', 'json');

// Export to plain text
await guard.exportTempEmailDomains('./backup/domains.txt', 'txt');

// Programmatic export
const domains = guard.getTempEmailDomains();
const exportData = {
  domains,
  count: domains.length,
  exportedAt: new Date().toISOString(),
  version: '1.0.0'
};

await fs.writeFile('./custom-export.json', JSON.stringify(exportData, null, 2));
```

### Import Domains

```javascript
// Import from file
const imported = await guard.importTempEmailDomains('./custom-domains.txt');
console.log(`Imported ${imported} domains`);

// Import from JSON
const imported2 = await guard.importTempEmailDomains('./domains-backup.json');

// Import from array
const customDomains = [
  'company-temp1.com',
  'company-temp2.org',
  'suspicious-pattern.net'
];

await guard.addTempEmailDomains(customDomains);
```

### File Formats

**JSON Format:**
```json
{
  "domains": [
    "example-temp.com",
    "disposable-mail.org"
  ],
  "count": 2,
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

**Text Format:**
```
example-temp.com
disposable-mail.org
temp-email-service.net
```

## 🔍 Search and Analysis

### Advanced Search

```javascript
// Search with regular expressions
const regexResults = guard.searchTempEmailDomains(/temp|disposable|fake/i);

// Search for patterns
const numberDomains = guard.searchTempEmailDomains(/\d{3,}/); // Domains with 3+ numbers
const shortDomains = guard.searchTempEmailDomains(/^.{1,5}\./); // Very short domains

// Search by TLD
const tkDomains = guard.searchTempEmailDomains(/\.tk$/);
const mlDomains = guard.searchTempEmailDomains(/\.ml$/);

// Custom analysis
const analyseDomains = () => {
  const allDomains = guard.getTempEmailDomains();
  
  const analysis = {
    total: allDomains.length,
    byTLD: {},
    byLength: {},
    hasNumbers: 0,
    hasHyphens: 0
  };
  
  allDomains.forEach(domain => {
    // TLD analysis
    const tld = domain.split('.').pop();
    analysis.byTLD[tld] = (analysis.byTLD[tld] || 0) + 1;
    
    // Length analysis
    const length = domain.length;
    const lengthBucket = Math.floor(length / 5) * 5;
    analysis.byLength[`${lengthBucket}-${lengthBucket + 4}`] = 
      (analysis.byLength[`${lengthBucket}-${lengthBucket + 4}`] || 0) + 1;
    
    // Pattern analysis
    if (/\d/.test(domain)) analysis.hasNumbers++;
    if (/-/.test(domain)) analysis.hasHyphens++;
  });
  
  return analysis;
};

const domainAnalysis = analyseDomains();
console.log('Domain Analysis:', domainAnalysis);
```

### Domain Categories

```javascript
// Categorize domains by type
const categorizeDomains = () => {
  const allDomains = guard.getTempEmailDomains();
  
  const categories = {
    numbered: [],      // Contains numbers
    short: [],         // Very short (< 6 chars)
    temporary: [],     // Contains "temp", "disposable", etc.
    suspicious: [],    // Suspicious TLDs
    generic: []        // Everything else
  };
  
  allDomains.forEach(domain => {
    if (/\d/.test(domain)) {
      categories.numbered.push(domain);
    } else if (domain.length < 6) {
      categories.short.push(domain);
    } else if (/temp|disposable|fake|trash/i.test(domain)) {
      categories.temporary.push(domain);
    } else if (/\.(tk|ml|ga|cf|gq)$/.test(domain)) {
      categories.suspicious.push(domain);
    } else {
      categories.generic.push(domain);
    }
  });
  
  return categories;
};
```

## 🛠️ Advanced Management

### Custom Domain Rules

```javascript
class AdvancedDomainManager {
  constructor(guard) {
    this.guard = guard;
    this.customRules = [];
  }
  
  addRule(name, pattern, action) {
    this.customRules.push({ name, pattern, action });
  }
  
  async applyRules() {
    const allDomains = this.guard.getTempEmailDomains();
    const actions = { add: [], remove: [] };
    
    for (const rule of this.customRules) {
      const matches = allDomains.filter(domain => rule.pattern.test(domain));
      
      if (rule.action === 'remove') {
        actions.remove.push(...matches);
      }
    }
    
    // Apply actions
    if (actions.remove.length > 0) {
      await this.guard.removeTempEmailDomains(actions.remove);
      console.log(`Removed ${actions.remove.length} domains via rules`);
    }
  }
}

// Usage
const manager = new AdvancedDomainManager(guard);

// Rule to remove company domains that were incorrectly flagged
manager.addRule('company-domains', /yourcompany\.com$/, 'remove');

// Rule to remove partner domains
manager.addRule('partner-domains', /(partner1|partner2)\.com$/, 'remove');

await manager.applyRules();
```

### Scheduled Maintenance

```javascript
// Set up scheduled maintenance
const scheduleMaintenanceTasks = () => {
  // Daily cleanup - remove false positives
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily domain cleanup...');
    
    // Remove known false positives
    const falsePositives = await getFalsePositivesFromDB();
    if (falsePositives.length > 0) {
      await guard.removeTempEmailDomains(falsePositives);
      console.log(`Removed ${falsePositives.length} false positives`);
    }
    
    // Export backup
    await guard.exportTempEmailDomains('./backups/domains-daily.json');
  });
  
  // Weekly analysis and reporting
  cron.schedule('0 0 * * 0', async () => {
    console.log('📊 Running weekly domain analysis...');
    
    const stats = guard.getTempEmailStats();
    const analysis = analyseDomains();
    
    // Generate report
    const report = {
      week: new Date().toISOString().slice(0, 10),
      totalDomains: stats.totalDomains,
      newDomainsThisWeek: await getNewDomainsCount(7),
      topTLDs: Object.entries(analysis.byTLD)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      analysis
    };
    
    await sendWeeklyReport(report);
  });
};
```

### Performance Optimization

```javascript
// Optimized domain checking for high-volume applications
class OptimizedDomainChecker {
  constructor(guard) {
    this.guard = guard;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  isDomainDisposable(domain) {
    const now = Date.now();
    const cached = this.cache.get(domain);
    
    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.result;
    }
    
    const result = this.guard.getTempEmailDetector().isDomainDisposable(domain);
    this.cache.set(domain, { result, timestamp: now });
    
    // Cleanup old cache entries
    if (this.cache.size > 10000) {
      this.cleanupCache();
    }
    
    return result;
  }
  
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}
```

For more advanced domain management examples, see the [Examples Guide](./EXAMPLES.md).