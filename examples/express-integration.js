const express = require('express');
const { TrialAbuseGuard, PostgreSQLStorageAdapter } = require('trial-abuse-guard');

const app = express();
app.use(express.json());

// Initialize trial abuse guard
let guard;

async function initializeGuard() {
  const pgAdapter = new PostgreSQLStorageAdapter({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost/mydb'
  });
  
  await pgAdapter.connect();
  
  guard = new TrialAbuseGuard({
    storageAdapter: pgAdapter,
    apiKeys: {
      ipQualityScore: process.env.IPQS_API_KEY
    }
  });
}

// Middleware to check trial abuse
async function checkTrialAbuse(req, res, next) {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await guard.checkUser(email, ipAddress, userAgent);

    // Add risk info to request object
    req.riskAssessment = result;

    // Handle high-risk users
    if (result.recommendation === 'block') {
      return res.status(403).json({
        error: 'Registration blocked due to security concerns',
        code: 'TRIAL_ABUSE_DETECTED'
      });
    }

    // Flag medium-risk users for review
    if (result.recommendation === 'flag') {
      // You might want to log this for manual review
      console.log(`Flagged user: ${email}, Risk: ${result.overall}`, result.details);
    }

    next();
  } catch (error) {
    console.error('Trial abuse check failed:', error);
    // Don't block on check failure, but log it
    req.riskAssessment = null;
    next();
  }
}

// Registration endpoint with trial abuse protection
app.post('/api/register', checkTrialAbuse, async (req, res) => {
  const { email, password, name } = req.body;
  const risk = req.riskAssessment;

  try {
    // Your normal registration logic here
    const user = await createUser({ email, password, name });

    // Add risk info to user record if needed
    if (risk && risk.overall > 30) {
      await flagUserForReview(user.id, risk);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      security: {
        riskLevel: guard.getRiskLevel(risk?.overall || 0),
        flagged: risk?.recommendation === 'flag'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Trial start endpoint with abuse protection
app.post('/api/start-trial', checkTrialAbuse, async (req, res) => {
  const { userId } = req.body;
  const risk = req.riskAssessment;

  // Apply trial restrictions based on risk
  let trialDuration = 14; // Default 14 days
  let features = 'full';

  if (risk) {
    if (risk.overall > 70) {
      return res.status(403).json({
        error: 'Trial not available',
        code: 'HIGH_RISK_USER'
      });
    } else if (risk.overall > 40) {
      // Reduced trial for medium-risk users
      trialDuration = 7;
      features = 'limited';
    }
  }

  const trial = await startTrial(userId, { duration: trialDuration, features });

  res.json({
    success: true,
    trial,
    security: {
      riskLevel: guard.getRiskLevel(risk?.overall || 0),
      restrictions: risk?.overall > 40 ? 'limited' : 'none'
    }
  });
});

// Admin endpoint to check user risk
app.get('/api/admin/user/:email/risk', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Get recent activity for this email
    const history = await guard.config.storageAdapter.getUserHistory(email, 5);
    
    res.json({
      email,
      history: history.map(h => ({
        ipAddress: h.ipAddress,
        timestamp: h.timestamp,
        userAgent: h.userAgent
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions (implement these based on your user system)
async function createUser(userData) {
  // Your user creation logic
  return { id: 'user_123', ...userData };
}

async function flagUserForReview(userId, riskData) {
  // Flag user in your admin system
  console.log(`User ${userId} flagged for review:`, riskData);
}

async function startTrial(userId, options) {
  // Your trial logic
  return { id: 'trial_456', userId, ...options };
}

// Initialize and start server
initializeGuard().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000 with trial abuse protection');
  });
}).catch(console.error);