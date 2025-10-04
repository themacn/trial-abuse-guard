#!/usr/bin/env node

// Post-install script for trial-abuse-guard
const fs = require('fs');
const path = require('path');

function postInstall() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'node_modules', 'trial-abuse-guard', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Welcome message
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    🛡️  Trial Abuse Guard                        ║
║                                                                  ║
║  Successfully installed! Protect your SaaS from trial abuse.    ║
║                                                                  ║
║  Quick Start:                                                    ║
║  const { TrialAbuseGuard } = require('trial-abuse-guard');       ║
║  const guard = new TrialAbuseGuard();                            ║
║  const result = await guard.checkUser(email, ipAddress);         ║
║                                                                  ║
║  📖 Documentation: https://github.com/themacn/trial-abuse-guard ║
║  🐛 Issues: https://github.com/themacn/trial-abuse-guard/issues ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    // Silent fail - don't break installation
    console.log('🛡️ Trial Abuse Guard installed successfully!');
  }
}

if (require.main === module) {
  postInstall();
}

module.exports = postInstall;