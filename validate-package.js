#!/usr/bin/env node

// Package validation script for trial-abuse-guard
const fs = require('fs');
const path = require('path');

function validatePackage() {
  console.log('🔍 Validating Trial Abuse Guard package configuration...\n');

  const errors = [];
  const warnings = [];

  // Check package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Required fields
    const requiredFields = ['name', 'version', 'description', 'main', 'types'];
    requiredFields.forEach(field => {
      if (!packageJson[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Check exports configuration
    if (!packageJson.exports) {
      errors.push('Missing exports configuration for npm package');
    } else {
      const requiredExports = ['.', './nextauth', './clerk'];
      requiredExports.forEach(exportPath => {
        if (!packageJson.exports[exportPath]) {
          errors.push(`Missing export configuration: ${exportPath}`);
        }
      });
    }

    // Check files array
    if (!packageJson.files || !Array.isArray(packageJson.files)) {
      errors.push('Missing or invalid files array');
    } else {
      const requiredFiles = ['dist/**/*', 'README.md', 'LICENSE'];
      requiredFiles.forEach(file => {
        if (!packageJson.files.includes(file)) {
          warnings.push(`Recommended file missing from files array: ${file}`);
        }
      });
    }

    // Check scripts
    const recommendedScripts = ['build', 'test', 'lint'];
    recommendedScripts.forEach(script => {
      if (!packageJson.scripts[script]) {
        warnings.push(`Recommended script missing: ${script}`);
      }
    });

    console.log('✅ Package.json validation complete');

  } catch (error) {
    errors.push(`Failed to read package.json: ${error.message}`);
  }

  // Check TypeScript configuration
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (!tsconfig.compilerOptions.declaration) {
      errors.push('TypeScript declaration files not enabled');
    }

    if (tsconfig.compilerOptions.outDir !== './dist') {
      warnings.push('Output directory should be ./dist for npm packages');
    }

    console.log('✅ TypeScript configuration validation complete');

  } catch (error) {
    warnings.push(`TypeScript config issue: ${error.message}`);
  }

  // Check required source files
  const requiredSrcFiles = [
    'src/index.ts',
    'src/core/TrialAbuseGuard.ts',
    'src/integrations/nextauth/NextAuthAdapter.ts',
    'src/integrations/clerk/ClerkAdapter.ts'
  ];

  requiredSrcFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      errors.push(`Missing required source file: ${file}`);
    }
  });

  console.log('✅ Source files validation complete');

  // Check build output (if exists)
  if (fs.existsSync('dist')) {
    const requiredDistFiles = [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/integrations/nextauth/NextAuthAdapter.js',
      'dist/integrations/clerk/ClerkAdapter.js'
    ];

    requiredDistFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        warnings.push(`Missing built file (run npm run build): ${file}`);
      }
    });

    console.log('✅ Build output validation complete');
  } else {
    warnings.push('Build output directory not found. Run: npm run build');
  }

  // Check documentation
  const requiredDocs = [
    'README.md',
    'LICENSE',
    'CHANGELOG.md'
  ];

  requiredDocs.forEach(doc => {
    if (!fs.existsSync(doc)) {
      if (doc === 'LICENSE') {
        errors.push(`Missing required file: ${doc}`);
      } else {
        warnings.push(`Missing recommended file: ${doc}`);
      }
    }
  });

  console.log('✅ Documentation validation complete');

  // Check .npmignore
  if (!fs.existsSync('.npmignore')) {
    warnings.push('Missing .npmignore file - all files will be published');
  }

  // Summary
  console.log('\n📋 Validation Summary:');
  
  if (errors.length === 0) {
    console.log('✅ No errors found!');
  } else {
    console.log(`❌ ${errors.length} error(s) found:`);
    errors.forEach(error => console.log(`   • ${error}`));
  }

  if (warnings.length === 0) {
    console.log('✅ No warnings!');
  } else {
    console.log(`⚠️  ${warnings.length} warning(s):`);
    warnings.forEach(warning => console.log(`   • ${warning}`));
  }

  // Pre-publish checklist
  console.log('\n📦 Pre-publish Checklist:');
  console.log('   □ Run: npm run build');
  console.log('   □ Run: npm run test');
  console.log('   □ Run: npm run lint');
  console.log('   □ Update version in package.json');
  console.log('   □ Update CHANGELOG.md');
  console.log('   □ Test installation: npm pack && npm install ./trial-abuse-guard-*.tgz');
  console.log('   □ Publish: npm publish');

  return errors.length === 0;
}

// Export usage examples
function showUsageExamples() {
  console.log('\n🎯 Usage Examples After Publishing:');
  
  console.log('\n1. Basic Installation:');
  console.log('   npm install trial-abuse-guard');
  
  console.log('\n2. Basic Usage:');
  console.log('   const { TrialAbuseGuard } = require("trial-abuse-guard");');
  console.log('   const guard = new TrialAbuseGuard();');
  console.log('   const result = await guard.checkUser(email, ip);');
  
  console.log('\n3. NextAuth Integration:');
  console.log('   import { NextAuthTrialAbuseAdapter } from "trial-abuse-guard/nextauth";');
  
  console.log('\n4. Clerk Integration:');
  console.log('   import { ClerkTrialAbuseAdapter } from "trial-abuse-guard/clerk";');
  
  console.log('\n5. TypeScript:');
  console.log('   import { TrialAbuseGuard, RiskScore } from "trial-abuse-guard";');
}

if (require.main === module) {
  const isValid = validatePackage();
  showUsageExamples();
  
  if (!isValid) {
    console.log('\n❌ Package validation failed. Please fix errors before publishing.');
    process.exit(1);
  } else {
    console.log('\n✅ Package validation passed! Ready for publishing.');
    process.exit(0);
  }
}

module.exports = { validatePackage };