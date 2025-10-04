# Trial Abuse Guard - Complete Documentation

A comprehensive npm package for preventing SaaS trial abuse through intelligent detection of suspicious sign-up patterns.

## 📚 Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Installation & Setup](./INSTALLATION.md)
3. [Core Features](./CORE_FEATURES.md)
4. [Authentication Integrations](./INTEGRATIONS.md)
5. [Domain Management](./DOMAIN_MANAGEMENT.md)
6. [API Reference](./API_REFERENCE.md)
7. [Configuration Guide](./CONFIGURATION.md)
8. [Examples & Recipes](./EXAMPLES.md)
9. [Best Practices](./BEST_PRACTICES.md)
10. [Troubleshooting](./TROUBLESHOOTING.md)

## 🚀 Quick Start Guide

### Basic Usage (30 seconds)

```bash
npm install trial-abuse-guard
```

```javascript
const { TrialAbuseGuard } = require('trial-abuse-guard');

const guard = new TrialAbuseGuard();

// Check any user for trial abuse
const result = await guard.checkUser('user@example.com', '192.168.1.100');

if (result.recommendation === 'block') {
  console.log('🚫 High-risk user blocked');
} else if (result.recommendation === 'flag') {
  console.log('⚠️ Suspicious user flagged for review');
} else {
  console.log('✅ User allowed');
}
```

### NextAuth Integration (60 seconds)

```javascript
import NextAuth from 'next-auth';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard';

const trialGuard = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  onUserBlocked: async (email, risk) => {
    console.log(`Blocked: ${email} (Risk: ${risk.overall})`);
  }
});

export const { handlers, auth } = NextAuth(
  trialGuard.getNextAuthConfig({
    providers: [/* your providers */]
  })
);
```

### Clerk Integration (60 seconds)

```javascript
// app/api/webhooks/clerk/route.ts
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard';

const clerkGuard = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

export async function POST(request) {
  const handler = clerkGuard.createWebhookHandler();
  return Response.json(await handler(request));
}
```

## 🎯 Key Features

- **🔍 Email Similarity Detection** - Catches users creating multiple accounts
- **🚫 Temporary Email Blocking** - Blocks 30,000+ disposable email services
- **🌐 IP Risk Analysis** - Detects suspicious IP patterns and hosting providers
- **🛡️ VPN/Proxy Detection** - Identifies connections from anonymization services
- **📊 Risk Scoring** - Provides 0-100 risk scores with clear recommendations
- **🔌 Easy Integration** - Works seamlessly with NextAuth, Clerk, and custom auth
- **🗂️ Persistent Domain Management** - Auto-updating blacklists with manual control
- **⚡ Zero Configuration** - Works out-of-the-box with intelligent defaults

## 🔧 Core Concepts

### Risk Assessment

Every user check returns a comprehensive risk assessment:

```javascript
{
  overall: 75,                    // Risk score 0-100
  recommendation: 'flag',         // 'allow', 'flag', or 'block'
  factors: {
    emailSimilarity: { score: 85, detected: true },
    tempEmail: { score: 0, detected: false },
    ipRisk: { score: 60, detected: true },
    vpnDetection: { score: 80, detected: true }
  },
  details: [
    "Similar to existing emails: user1@example.com",
    "VPN/Proxy detected"
  ]
}
```

### Risk Levels

| Score | Level | Recommendation | Typical Action |
|-------|-------|---------------|----------------|
| 0-29  | Low | Allow | Normal registration |
| 30-59 | Medium | Flag | Manual review |
| 60-79 | High | Flag | Enhanced monitoring |
| 80-100 | Critical | Block | Deny registration |

### Domain Management

The package maintains a persistent, auto-updating list of temporary email domains:

- **30,000+ domains** from multiple sources
- **Automatic updates** every 24 hours (configurable)
- **Custom domain management** - add your own suspicious domains
- **Search and export** functionality for domain analysis

## 🔌 Integration Options

### 1. Standalone Usage
Perfect for custom authentication systems or manual integration.

### 2. NextAuth/Auth.js Integration
Drop-in enhancement for NextAuth with automatic risk assessment and session enhancement.

### 3. Clerk Integration
Webhook-based integration with automatic user management and metadata enrichment.

### 4. Middleware Integration
Protect any route or API endpoint with risk-based access control.

## 📈 Performance & Scale

- **Lightweight** - Minimal dependencies, efficient algorithms
- **Async Operations** - Non-blocking risk assessment
- **Caching** - Intelligent caching for repeated checks
- **Fallback Systems** - Graceful degradation when external services fail
- **Rate Limiting** - Built-in protection against API rate limits

## 🛡️ Security & Privacy

- **No Data Storage** - Only stores domain lists, not user data
- **Configurable Persistence** - Choose what data to persist locally
- **API Key Protection** - Optional external API integration
- **Error Handling** - Fails open to prevent blocking legitimate users

## 📊 Monitoring & Analytics

Track the effectiveness of your trial abuse prevention:

```javascript
const stats = guard.getTempEmailStats();
console.log(`Protecting against ${stats.totalDomains} temp email domains`);

// Get risk distribution
const riskAssessment = await guard.checkUser(email, ip);
analytics.track('trial_signup_risk', {
  risk_score: riskAssessment.overall,
  risk_level: guard.getRiskLevel(riskAssessment.overall),
  factors_detected: Object.keys(riskAssessment.factors).filter(
    factor => riskAssessment.factors[factor].detected
  )
});
```

## 🚀 Getting Started

Choose your integration path:

1. **[Quick Integration](./INSTALLATION.md)** - Get started in 5 minutes
2. **[NextAuth Setup](./INTEGRATIONS.md#nextauth)** - Enhance your NextAuth flow
3. **[Clerk Setup](./INTEGRATIONS.md#clerk)** - Add to your Clerk application
4. **[Custom Integration](./EXAMPLES.md#custom)** - Build your own integration

## 📖 Learn More

- **[Core Features Guide](./CORE_FEATURES.md)** - Deep dive into detection methods
- **[Configuration Options](./CONFIGURATION.md)** - Customize for your needs
- **[API Reference](./API_REFERENCE.md)** - Complete method documentation
- **[Best Practices](./BEST_PRACTICES.md)** - Production deployment guide
- **[Examples & Recipes](./EXAMPLES.md)** - Real-world implementation examples

## 💡 Need Help?

- 📖 [Documentation](./TROUBLESHOOTING.md)
- 🐛 [Issues](https://github.com/themacn/trial-abuse-guard/issues)
- 💬 [Discussions](https://github.com/themacn/trial-abuse-guard/discussions)
- 📧 Email: support@trial-abuse-guard.com

## 🗣️ Also by the Creators: Jotchats

<p align="center">
  <img src="jotchats.ico" alt="Jotchats Logo" width="100">
</p>

Transform your web forms into engaging, AI-powered conversations with [Jotchats](https://jotchats.com). Instead of static fields, guide users through natural, full-screen dialogues that feel like chatting with a helpful assistant.

**Why Jotchats?**
- 🚀 **Higher Conversion Rates** - See significant improvements in response rates vs. traditional forms
- 🎯 **Better Data Collection** - Collect more accurate, detailed information through conversational flows
- 🎨 **Brand Integration** - Customize the experience to match your brand perfectly
- 📊 **Smart Analytics** - Track engagement and optimize your forms
- 🔗 **Easy Integration** - Embed seamlessly into websites, apps, or existing workflows

Perfect for lead capture, onboarding, surveys, feedback, and more. Replace clunky forms with something that actually drives results!

[Learn more about Jotchats](https://jotchats.com) | [Jotchats vs Typeform Comparison](https://jotchats.com/blogs/jotchats-vs-typeform-comparison)

---

**Made with ❤️ for the developer community**