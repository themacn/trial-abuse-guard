#!/usr/bin/env node

// CLI tool for managing temp email domains
const { TrialAbuseGuard } = require('trial-abuse-guard');
const fs = require('fs').promises;

class TrialAbuseGuardCLI {
  constructor() {
    this.guard = new TrialAbuseGuard({
      tempEmailAutoUpdate: true,
      tempEmailUpdateInterval: 24
    });
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'stats':
          await this.showStats();
          break;
        case 'add':
          await this.addDomains(args.slice(1));
          break;
        case 'remove':
          await this.removeDomains(args.slice(1));
          break;
        case 'search':
          await this.searchDomains(args[1]);
          break;
        case 'test':
          await this.testEmail(args[1], args[2]);
          break;
        case 'update':
          await this.updateDomains();
          break;
        case 'export':
          await this.exportDomains(args[1], args[2]);
          break;
        case 'import':
          await this.importDomains(args[1]);
          break;
        case 'reset':
          await this.resetDomains();
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async showStats() {
    console.log('📊 Temp Email Domain Statistics\n');
    
    const stats = this.guard.getTempEmailStats();
    console.log(`Total domains: ${stats.totalDomains.toLocaleString()}`);
    console.log(`Last update: ${stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never'}`);
    console.log(`Auto-update: ${stats.autoUpdateEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Update interval: ${stats.updateInterval} hours`);
    console.log(`External sources: ${stats.sources.length}`);
  }

  async addDomains(domains) {
    if (domains.length === 0) {
      console.log('❌ Please specify domains to add');
      return;
    }

    console.log(`➕ Adding ${domains.length} domains...`);
    await this.guard.addTempEmailDomains(domains);
    console.log('✅ Domains added successfully');
  }

  async removeDomains(domains) {
    if (domains.length === 0) {
      console.log('❌ Please specify domains to remove');
      return;
    }

    console.log(`➖ Removing ${domains.length} domains...`);
    await this.guard.removeTempEmailDomains(domains);
    console.log('✅ Domains removed successfully');
  }

  async searchDomains(pattern) {
    if (!pattern) {
      console.log('❌ Please specify a search pattern');
      return;
    }

    console.log(`🔍 Searching for domains matching "${pattern}"...\n`);
    const results = this.guard.searchTempEmailDomains(pattern);
    
    if (results.length === 0) {
      console.log('No domains found');
    } else {
      console.log(`Found ${results.length} domains:`);
      results.slice(0, 20).forEach(domain => console.log(`  - ${domain}`));
      
      if (results.length > 20) {
        console.log(`  ... and ${results.length - 20} more`);
      }
    }
  }

  async testEmail(email, ip = '203.0.113.1') {
    if (!email) {
      console.log('❌ Please specify an email to test');
      return;
    }

    console.log(`🧪 Testing email: ${email}\n`);
    
    const result = await this.guard.checkUser(email, ip);
    const emoji = result.factors.tempEmail.detected ? '🚫' : '✅';
    
    console.log(`${emoji} Result: ${result.factors.tempEmail.detected ? 'TEMP EMAIL' : 'LEGITIMATE'}`);
    console.log(`Risk Score: ${result.overall}/100`);
    console.log(`Recommendation: ${result.recommendation.toUpperCase()}`);
    
    if (result.details.length > 0) {
      console.log('\nDetails:');
      result.details.forEach(detail => console.log(`  - ${detail}`));
    }
  }

  async updateDomains() {
    console.log('🔄 Updating domains from external sources...');
    await this.guard.updateTempEmailDomains();
    console.log('✅ Domains updated successfully');
    await this.showStats();
  }

  async exportDomains(format = 'json', filename) {
    const validFormats = ['json', 'txt'];
    if (!validFormats.includes(format)) {
      console.log(`❌ Invalid format. Use: ${validFormats.join(', ')}`);
      return;
    }

    const file = filename || `temp-domains.${format}`;
    console.log(`💾 Exporting domains to ${file}...`);
    
    await this.guard.exportTempEmailDomains(file, format);
    console.log('✅ Export completed');
  }

  async importDomains(filename) {
    if (!filename) {
      console.log('❌ Please specify a file to import');
      return;
    }

    try {
      await fs.access(filename);
    } catch {
      console.log(`❌ File not found: ${filename}`);
      return;
    }

    console.log(`📥 Importing domains from ${filename}...`);
    const count = await this.guard.importTempEmailDomains(filename);
    console.log(`✅ Imported ${count} domains`);
  }

  async resetDomains() {
    console.log('⚠️  This will reset all domains to defaults. Continue? (y/N)');
    
    // Simple confirmation (in a real CLI, you'd use a proper prompt library)
    process.stdout.write('> ');
    
    return new Promise((resolve) => {
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          console.log('🔄 Resetting domains...');
          await this.guard.getTempEmailDetector().resetDomains();
          console.log('✅ Domains reset to defaults');
        } else {
          console.log('❌ Reset cancelled');
        }
        resolve();
      });
    });
  }

  showHelp() {
    console.log(`
🛡️  Trial Abuse Guard CLI

Usage: node cli-tool.js <command> [options]

Commands:
  stats                           Show domain statistics
  add <domain1> [domain2...]      Add domains to blacklist
  remove <domain1> [domain2...]   Remove domains from blacklist
  search <pattern>                Search domains by pattern
  test <email> [ip]              Test email for temp domain detection
  update                          Force update from external sources
  export [format] [filename]     Export domains (json/txt)
  import <filename>               Import domains from file
  reset                           Reset domains to defaults

Examples:
  node cli-tool.js stats
  node cli-tool.js add suspicious.com fake-email.org
  node cli-tool.js search "temp"
  node cli-tool.js test user@10minutemail.com
  node cli-tool.js export txt my-domains.txt
  node cli-tool.js import custom-domains.txt
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new TrialAbuseGuardCLI();
  cli.run().then(() => process.exit(0));
}

module.exports = TrialAbuseGuardCLI;