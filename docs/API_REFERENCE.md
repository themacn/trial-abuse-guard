# API Reference

Complete API documentation for Trial Abuse Guard.

## 🏗️ Core Classes

### TrialAbuseGuard

Main class for trial abuse detection.

#### Constructor

```typescript
new TrialAbuseGuard(config?: TrialAbuseConfig)
```

**Parameters:**
- `config` (optional): Configuration object

**Example:**
```javascript
const guard = new TrialAbuseGuard({
  blockHighRisk: true,
  blockThreshold: 80,
  apiKeys: {
    ipQualityScore: 'your-key'
  }
});
```

#### Methods

##### checkUser()

```typescript
async checkUser(email: string, ipAddress: string, userAgent?: string): Promise<RiskScore>
```

Check a user for trial abuse patterns.

**Parameters:**
- `email`: User's email address
- `ipAddress`: User's IP address
- `userAgent` (optional): User agent string

**Returns:** `RiskScore` object with assessment results

**Example:**
```javascript
const result = await guard.checkUser('user@example.com', '203.0.113.1');
console.log(result.recommendation); // 'allow', 'flag', or 'block'
```

##### getRiskLevel()

```typescript
getRiskLevel(score: number): RiskLevel
```

Convert numeric risk score to human-readable level.

**Parameters:**
- `score`: Risk score (0-100)

**Returns:** `'low' | 'medium' | 'high' | 'critical'`

##### addTempEmailDomains()

```typescript
async addTempEmailDomains(domains: string[]): Promise<void>
```

Add domains to the temporary email blacklist.

##### removeTempEmailDomains()

```typescript
async removeTempEmailDomains(domains: string[]): Promise<void>
```

Remove domains from the temporary email blacklist.

##### getTempEmailDomains()

```typescript
getTempEmailDomains(): string[]
```

Get all tracked temporary email domains.

##### searchTempEmailDomains()

```typescript
searchTempEmailDomains(pattern: string): string[]
```

Search domains by pattern or regex.

##### getTempEmailStats()

```typescript
getTempEmailStats(): DomainStats
```

Get domain statistics and update information.

##### updateTempEmailDomains()

```typescript
async updateTempEmailDomains(): Promise<void>
```

Force update domains from external sources.

##### exportTempEmailDomains()

```typescript
async exportTempEmailDomains(filePath: string, format?: 'json' | 'txt'): Promise<void>
```

Export domains to file.

##### importTempEmailDomains()

```typescript
async importTempEmailDomains(filePath: string): Promise<number>
```

Import domains from file. Returns number of domains imported.

## 📋 Type Definitions

### TrialAbuseConfig

```typescript
interface TrialAbuseConfig {
  emailSimilarityCheck?: boolean;
  emailSimilarityThreshold?: number;
  tempEmailCheck?: boolean;
  ipCheck?: boolean;
  vpnCheck?: boolean;
  customDisposableDomains?: string[];
  tempEmailAutoUpdate?: boolean;
  tempEmailUpdateInterval?: number;
  tempEmailStoragePath?: string;
  apiKeys?: {
    ipQualityScore?: string;
    vpnapi?: string;
    proxyCheck?: string;
  };
  storageAdapter?: StorageAdapter;
}
```

### RiskScore

```typescript
interface RiskScore {
  overall: number;                // 0-100 overall risk score
  recommendation: 'allow' | 'flag' | 'block';
  factors: {
    emailSimilarity: RiskFactor;
    tempEmail: RiskFactor;
    ipRisk: RiskFactor;
    vpnDetection: RiskFactor;
  };
  details: string[];             // Human-readable risk details
}
```

### RiskFactor

```typescript
interface RiskFactor {
  score: number;                 // 0-100 factor score
  detected: boolean;             // Whether risk was detected
  confidence: number;            // 0-1 confidence level
  details?: string;              // Factor-specific details
}
```

### StorageAdapter

```typescript
interface StorageAdapter {
  getExistingEmails(): Promise<string[]>;
  getExistingIPs(email: string): Promise<string[]>;
  storeUserData(data: UserData): Promise<void>;
}
```

### UserData

```typescript
interface UserData {
  email: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}
```

## 🔌 Integration Classes

### NextAuthTrialAbuseAdapter

#### Constructor

```typescript
new NextAuthTrialAbuseAdapter(config?: NextAuthTrialAbuseConfig)
```

#### Methods

##### getNextAuthConfig()

```typescript
getNextAuthConfig(baseConfig: NextAuthConfig): NextAuthConfig
```

Enhance NextAuth configuration with trial abuse protection.

##### createMiddleware()

```typescript
createMiddleware(): Function
```

Create middleware for API route protection.

##### checkUser()

```typescript
async checkUser(email: string, ipAddress: string, userAgent?: string): Promise<RiskScore>
```

Manual risk checking method.

### ClerkTrialAbuseAdapter

#### Constructor

```typescript
new ClerkTrialAbuseAdapter(config?: ClerkTrialAbuseConfig)
```

#### Methods

##### createWebhookHandler()

```typescript
createWebhookHandler(): Function
```

Create webhook handler for Clerk events.

##### preSignUpCheck()

```typescript
async preSignUpCheck(email: string, ipAddress: string, userAgent?: string): Promise<{
  allowed: boolean;
  risk: RiskScore;
  action: 'allow' | 'block' | 'flag';
}>
```

Check user risk before signup reaches Clerk.

##### createMiddleware()

```typescript
createMiddleware(): Function
```

Create middleware for route protection.

## 💾 Storage Adapters

### MongoStorageAdapter

```typescript
new MongoStorageAdapter(config: {
  connectionString: string;
  databaseName: string;
  collectionName?: string;
})
```

### PostgreSQLStorageAdapter

```typescript
new PostgreSQLStorageAdapter(config: {
  connectionString: string;
  tableName?: string;
})
```

### RedisStorageAdapter

```typescript
new RedisStorageAdapter(config: {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
})
```

## 🛠️ Utility Functions

### createTrialGuard()

```typescript
function createTrialGuard(config?: TrialAbuseConfig): TrialAbuseGuard
```

Convenience function for creating guard instances.

## 📊 Constants

### Risk Thresholds

```typescript
const RISK_LEVELS = {
  LOW: { min: 0, max: 29 },
  MEDIUM: { min: 30, max: 59 },
  HIGH: { min: 60, max: 79 },
  CRITICAL: { min: 80, max: 100 }
};
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  emailSimilarityCheck: true,
  emailSimilarityThreshold: 0.8,
  tempEmailCheck: true,
  ipCheck: true,
  vpnCheck: true,
  tempEmailAutoUpdate: true,
  tempEmailUpdateInterval: 24,
  blockThreshold: 80,
  flagThreshold: 50
};
```

## 🔍 Error Handling

All async methods may throw these error types:

- `ValidationError`: Invalid input parameters
- `NetworkError`: External API failures
- `StorageError`: Database/file system errors
- `ConfigurationError`: Invalid configuration

**Example:**
```javascript
try {
  const result = await guard.checkUser('invalid-email', 'invalid-ip');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

For complete examples and usage patterns, see the [Examples Guide](./EXAMPLES.md).