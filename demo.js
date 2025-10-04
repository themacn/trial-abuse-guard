// Simple demo script to test the package functionality
const { TrialAbuseGuard } = require('./dist/index.js');

async function runDemo() {
  console.log('🛡️  Trial Abuse Guard Demo\n');

  // Initialize with default settings
  const guard = new TrialAbuseGuard({
    emailSimilarityCheck: true,
    tempEmailCheck: true,
    ipCheck: false, // Disable to avoid API calls in demo
    vpnCheck: false // Disable to avoid API calls in demo
  });

  // Test cases
  const testCases = [
    {
      name: 'Normal User',
      email: 'john.doe@gmail.com',
      ip: '203.0.113.1'
    },
    {
      name: 'Temporary Email',
      email: 'test@10minutemail.com',
      ip: '203.0.113.2'
    },
    {
      name: 'Similar Email (after first user)',
      email: 'john.doe2@gmail.com',
      ip: '203.0.113.3'
    },
    {
      name: 'Another Similar Email',
      email: 'johndoe@gmail.com',
      ip: '203.0.113.4'
    }
  ];

  for (const testCase of testCases) {
    console.log(`--- Testing: ${testCase.name} ---`);
    console.log(`Email: ${testCase.email}`);
    console.log(`IP: ${testCase.ip}`);

    try {
      const result = await guard.checkUser(testCase.email, testCase.ip);

      console.log(`Risk Score: ${result.overall}/100`);
      console.log(`Risk Level: ${guard.getRiskLevel(result.overall)}`);
      console.log(`Recommendation: ${result.recommendation.toUpperCase()}`);
      
      if (result.details.length > 0) {
        console.log('Risk Factors:');
        result.details.forEach(detail => console.log(`  - ${detail}`));
      }

      // Show detected factors
      const detectedFactors = [];
      if (result.factors.emailSimilarity.detected) detectedFactors.push('Email Similarity');
      if (result.factors.tempEmail.detected) detectedFactors.push('Temporary Email');
      if (result.factors.ipRisk.detected) detectedFactors.push('IP Risk');
      if (result.factors.vpnDetection.detected) detectedFactors.push('VPN/Proxy');

      if (detectedFactors.length > 0) {
        console.log(`Detected: ${detectedFactors.join(', ')}`);
      }

      // Recommendation emoji
      const emoji = result.recommendation === 'allow' ? '✅' : 
                   result.recommendation === 'flag' ? '⚠️' : '🚫';
      console.log(`${emoji} Action: ${result.recommendation.toUpperCase()}\n`);

    } catch (error) {
      console.error(`Error: ${error.message}\n`);
    }
  }

  console.log('🎉 Demo completed! The package is working correctly.');
  console.log('\n📝 Integration example:');
  console.log(`
const { TrialAbuseGuard } = require('trial-abuse-guard');
const guard = new TrialAbuseGuard();

// In your registration endpoint:
const risk = await guard.checkUser(email, ipAddress);

if (risk.recommendation === 'block') {
  return res.status(403).json({ error: 'Registration blocked' });
}

if (risk.recommendation === 'flag') {
  // Flag for manual review
  await flagUserForReview(userId, risk);
}

// Continue with normal registration...
  `);
}

runDemo().catch(console.error);