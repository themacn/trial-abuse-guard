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

  // Check multiple users with various risk scenarios
  const users = [
    { email: 'john.doe@gmail.com', ip: '203.0.113.1' },
    { email: 'john.doe2@gmail.com', ip: '203.0.113.1' }, // Similar email, same IP
    { email: 'test@10minutemail.com', ip: '198.51.100.1' }, // Temp email
    { email: 'user@example.com', ip: '104.16.1.1' }, // Cloudflare IP (hosting)
    { email: 'vpnuser@protonmail.com', ip: '185.220.101.1' }, // Tor exit node
    { email: 'legituser@company.com', ip: '192.168.1.100' } // Local IP
  ];

  for (const user of users) {
    console.log(`\n--- Checking ${user.email} (${user.ip}) ---`);

    const result = await guard.checkUser(user.email, user.ip);

    console.log({
      overallRisk: result.overall,
      recommendation: result.recommendation,
      riskLevel: guard.getRiskLevel(result.overall),
      factors: {
        emailSimilarity: {
          detected: result.factors.emailSimilarity.detected,
          score: result.factors.emailSimilarity.score,
          confidence: result.factors.emailSimilarity.confidence
        },
        tempEmail: {
          detected: result.factors.tempEmail.detected,
          score: result.factors.tempEmail.score,
          details: result.factors.tempEmail.details
        },
        ipRisk: {
          detected: result.factors.ipRisk.detected,
          score: result.factors.ipRisk.score,
          details: result.factors.ipRisk.details
        },
        vpnDetection: {
          detected: result.factors.vpnDetection.detected,
          score: result.factors.vpnDetection.score,
          details: result.factors.vpnDetection.details
        }
      },
      details: result.details
    });
  }

  // Demonstrate domain management
  console.log('\n--- Domain Management ---');
  await guard.addTempEmailDomains(['custom-spam-domain.com']);
  console.log('Added custom domain for tracking');

  const allDomains = guard.getTempEmailDomains();
  console.log(`Total tracked domains: ${allDomains.length}`);
}

advancedExample().catch(console.error);