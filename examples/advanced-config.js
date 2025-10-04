const { TrialAbuseGuard, MongoStorageAdapter } = require('trial-abuse-guard');

// Advanced configuration example
async function advancedExample() {
  // Configure MongoDB storage
  const mongoAdapter = new MongoStorageAdapter({
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'myapp',
    collectionName: 'trial_users'
  });
  
  await mongoAdapter.connect();

  // Initialize with custom configuration
  const guard = new TrialAbuseGuard({
    emailSimilarityCheck: true,
    emailSimilarityThreshold: 0.85, // Stricter threshold
    tempEmailCheck: true,
    ipCheck: true,
    vpnCheck: true,
    
    // Add custom disposable domains
    customDisposableDomains: [
      'mydisposable.com',
      'tempmail.org'
    ],
    
    // API keys for enhanced detection
    apiKeys: {
      ipQualityScore: process.env.IPQS_API_KEY,
      vpnapi: process.env.VPNAPI_KEY,
      proxyCheck: process.env.PROXYCHECK_KEY
    },
    
    // Use MongoDB for data persistence
    storageAdapter: mongoAdapter
  });

  // Check multiple users
  const users = [
    { email: 'john.doe@gmail.com', ip: '203.0.113.1' },
    { email: 'john.doe2@gmail.com', ip: '203.0.113.1' }, // Similar email, same IP
    { email: 'test@10minutemail.com', ip: '198.51.100.1' }, // Temp email
    { email: 'user@example.com', ip: '104.16.1.1' } // Cloudflare IP (hosting)
  ];

  for (const user of users) {
    console.log(`\n--- Checking ${user.email} ---`);
    
    const result = await guard.checkUser(user.email, user.ip);
    
    console.log({
      email: user.email,
      overallRisk: result.overall,
      recommendation: result.recommendation,
      factors: {
        emailSimilarity: result.factors.emailSimilarity.detected,
        tempEmail: result.factors.tempEmail.detected,
        vpnDetection: result.factors.vpnDetection.detected,
        ipRisk: result.factors.ipRisk.detected
      },
      details: result.details
    });
  }
}

advancedExample().catch(console.error);