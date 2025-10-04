const { TrialAbuseGuard } = require('trial-abuse-guard');

// Example: Managing the persistent temp email domain list
async function domainManagementExample() {
  console.log('🔧 Temp Email Domain Management Demo\n');

  // Initialize with custom domain settings
  const guard = new TrialAbuseGuard({
    tempEmailCheck: true,
    tempEmailAutoUpdate: true,        // Enable automatic updates
    tempEmailUpdateInterval: 12,      // Update every 12 hours
    tempEmailStoragePath: './my-temp-domains.json', // Custom storage location
    customDisposableDomains: [        // Add your own domains
      'mycustom-temp.com',
      'company-disposable.org'
    ]
  });

  // Wait a moment for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📊 Domain Statistics:');
  const stats = guard.getTempEmailStats();
  console.log(`Total domains: ${stats.totalDomains}`);
  console.log(`Last update: ${stats.lastUpdate || 'Never'}`);
  console.log(`Auto-update: ${stats.autoUpdateEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`Update interval: ${stats.updateInterval} hours`);
  console.log();

  // Add custom domains
  console.log('➕ Adding custom domains...');
  await guard.addTempEmailDomains([
    'suspicious-email.com',
    'fake-trials.net',
    'temp-signup.org'
  ]);
  console.log('Added 3 custom domains');

  // Search for specific domains
  console.log('\n🔍 Searching for domains containing "temp":');
  const tempDomains = guard.searchTempEmailDomains('temp');
  console.log(`Found ${tempDomains.length} domains:`, tempDomains.slice(0, 5));

  // Test email detection
  console.log('\n🧪 Testing email detection:');
  const testEmails = [
    'user@gmail.com',
    'test@10minutemail.com',
    'trial@suspicious-email.com', // Our custom domain
    'user@mailinator.com'
  ];

  for (const email of testEmails) {
    const result = await guard.checkUser(email, '203.0.113.1');
    const emoji = result.factors.tempEmail.detected ? '🚫' : '✅';
    console.log(`${emoji} ${email}: ${result.factors.tempEmail.detected ? 'TEMP EMAIL' : 'LEGITIMATE'}`);
  }

  // Export domains for backup
  console.log('\n💾 Exporting domains to backup file...');
  await guard.exportTempEmailDomains('./temp-domains-backup.json');
  await guard.exportTempEmailDomains('./temp-domains-backup.txt', 'txt');
  console.log('Exported domains to JSON and TXT formats');

  // Force update from external sources
  console.log('\n🔄 Force updating domains from external sources...');
  await guard.updateTempEmailDomains();
  const newStats = guard.getTempEmailStats();
  console.log(`Updated! Total domains: ${newStats.totalDomains}`);

  // Remove a domain (if needed)
  console.log('\n➖ Removing a test domain...');
  await guard.removeTempEmailDomains(['fake-trials.net']);
  console.log('Removed fake-trials.net');

  console.log('\n✅ Domain management demo completed!');
}

// Example: Importing domains from external file
async function importDomainsExample() {
  console.log('\n📥 Import Domains Example');
  
  const guard = new TrialAbuseGuard();
  
  // Create a sample domain file
  const fs = require('fs');
  const sampleDomains = [
    'company-temp1.com',
    'company-temp2.org',
    'suspicious-domain.net'
  ];
  
  fs.writeFileSync('./sample-domains.txt', sampleDomains.join('\n'));
  
  // Import the domains
  const imported = await guard.importTempEmailDomains('./sample-domains.txt');
  console.log(`Imported ${imported} domains from file`);
  
  // Cleanup
  fs.unlinkSync('./sample-domains.txt');
}

// Example: Real-time domain monitoring
async function monitoringExample() {
  console.log('\n📈 Real-time Monitoring Example');
  
  const guard = new TrialAbuseGuard({
    tempEmailAutoUpdate: true,
    tempEmailUpdateInterval: 1 // Update every hour for demo
  });

  // Set up monitoring
  setInterval(() => {
    const stats = guard.getTempEmailStats();
    console.log(`[${new Date().toISOString()}] Monitoring: ${stats.totalDomains} domains tracked`);
  }, 30000); // Log every 30 seconds for demo

  console.log('Started real-time monitoring (press Ctrl+C to stop)');
}

// Run examples
async function runAll() {
  try {
    await domainManagementExample();
    await importDomainsExample();
    
    // Uncomment to run monitoring example
    // await monitoringExample();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runAll();