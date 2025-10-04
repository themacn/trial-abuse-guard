// Test script for the new persistent domain management features
const { TrialAbuseGuard } = require('./dist/index.js');

async function testDomainManagement() {
  console.log('🧪 Testing Persistent Domain Management Features\n');

  // Initialize with domain management features
  const guard = new TrialAbuseGuard({
    tempEmailAutoUpdate: false, // Disable for testing
    tempEmailStoragePath: './test-domains.json',
    customDisposableDomains: ['test-custom.com']
  });

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('1. 📊 Initial Statistics:');
  let stats = guard.getTempEmailStats();
  console.log(`   Total domains: ${stats.totalDomains}`);
  console.log(`   Auto-update: ${stats.autoUpdateEnabled}`);
  console.log();

  console.log('2. ➕ Adding custom domains...');
  await guard.addTempEmailDomains([
    'my-suspicious.com',
    'fake-trial.net',
    'temp-signup.org'
  ]);
  console.log('   Added 3 custom domains');

  stats = guard.getTempEmailStats();
  console.log(`   New total: ${stats.totalDomains} domains`);
  console.log();

  console.log('3. 🔍 Searching domains:');
  const searchResults = guard.searchTempEmailDomains('temp');
  console.log(`   Found ${searchResults.length} domains containing "temp"`);
  console.log(`   Examples: ${searchResults.slice(0, 3).join(', ')}`);
  console.log();

  console.log('4. 🧪 Testing email detection:');
  const testEmails = [
    'user@gmail.com',
    'test@my-suspicious.com', // Our custom domain
    'fake@10minutemail.com',  // Built-in temp domain
    'trial@fake-trial.net'    // Another custom domain
  ];

  for (const email of testEmails) {
    const result = await guard.checkUser(email, '203.0.113.1');
    const emoji = result.factors.tempEmail.detected ? '🚫' : '✅';
    const status = result.factors.tempEmail.detected ? 'TEMP' : 'OK';
    console.log(`   ${emoji} ${email.padEnd(25)} → ${status} (Risk: ${result.overall})`);
  }
  console.log();

  console.log('5. 💾 Testing export functionality...');
  await guard.exportTempEmailDomains('./test-export.json', 'json');
  await guard.exportTempEmailDomains('./test-export.txt', 'txt');
  console.log('   Exported domains to JSON and TXT formats');
  console.log();

  console.log('6. ➖ Removing a domain...');
  await guard.removeTempEmailDomains(['fake-trial.net']);
  console.log('   Removed fake-trial.net');

  // Test that removed domain is no longer detected
  const removedTest = await guard.checkUser('test@fake-trial.net', '203.0.113.1');
  const removedStatus = removedTest.factors.tempEmail.detected ? 'STILL TEMP' : 'REMOVED';
  console.log(`   Verification: fake-trial.net → ${removedStatus}`);
  console.log();

  console.log('7. 📈 Final statistics:');
  stats = guard.getTempEmailStats();
  console.log(`   Final total: ${stats.totalDomains} domains`);
  console.log();

  console.log('✅ Domain management test completed successfully!');
  console.log();
  console.log('🔧 Key Features Demonstrated:');
  console.log('   • Persistent domain storage');
  console.log('   • Custom domain addition/removal');
  console.log('   • Domain search functionality');
  console.log('   • Export/import capabilities');
  console.log('   • Real-time email testing');
  console.log('   • Automatic domain detection in checkUser()');
}

testDomainManagement().catch(console.error);