const { TrialAbuseGuard } = require('trial-abuse-guard');

// Basic usage example
async function basicExample() {
  // Initialize with default settings
  const guard = new TrialAbuseGuard();

  // Check a user for trial abuse
  const result = await guard.checkUser(
    'user@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  );

  console.log('Risk Assessment:', {
    overallRisk: result.overall,
    recommendation: result.recommendation,
    riskLevel: guard.getRiskLevel(result.overall),
    details: result.details
  });

  // Handle based on risk level
  switch (result.recommendation) {
    case 'block':
      console.log('🚫 User should be blocked - high risk detected');
      break;
    case 'flag':
      console.log('⚠️ User should be flagged for review');
      break;
    case 'allow':
      console.log('✅ User appears safe to allow');
      break;
  }
}

basicExample().catch(console.error);