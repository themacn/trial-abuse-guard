// NextAuth/Auth.js integration examples

// 1. Basic auth.ts configuration with trial abuse protection
// auth.ts (or pages/api/auth/[...nextauth].ts)

import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

// Initialize the trial abuse adapter
const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  // Trial abuse detection settings
  blockHighRisk: true,
  flagMediumRisk: true,
  blockThreshold: 80,    // Block users with risk score >= 80
  flagThreshold: 50,     // Flag users with risk score >= 50
  
  // Domain management
  tempEmailAutoUpdate: true,
  customDisposableDomains: ['company-spam.com'],
  
  // API keys for enhanced detection
  apiKeys: {
    ipQualityScore: process.env.IPQS_API_KEY,
    vpnapi: process.env.VPNAPI_KEY
  },
  
  // Custom callbacks
  onUserBlocked: async (email, riskData) => {
    console.log(`🚫 Blocked user: ${email} (Risk: ${riskData.overall})`);
    // Log to your analytics, send alert, etc.
  },
  
  onUserFlagged: async (email, riskData) => {
    console.log(`⚠️ Flagged user: ${email} (Risk: ${riskData.overall})`);
    // Add to admin review queue, send notification, etc.
  }
});

// Get enhanced NextAuth configuration
export const { handlers, auth, signIn, signOut } = NextAuth(
  trialAbuseAdapter.getNextAuthConfig({
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      }),
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    
    callbacks: {
      // Your existing callbacks will be preserved and enhanced
      session: async ({ session, token }) => {
        // Risk data is automatically added to session.user
        if (session.user.flagged) {
          console.log(`Flagged user signed in: ${session.user.email}`);
        }
        return session;
      }
    },
    
    pages: {
      error: '/auth/error', // Custom error page for blocked users
    }
  })
);

// 2. Custom middleware for API routes
// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 75
});

export async function middleware(request: NextRequest) {
  // Apply trial abuse protection to API routes
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    const middleware = trialAbuseAdapter.createMiddleware();
    const response = await middleware(request, NextResponse);
    
    if (response) {
      return response; // Blocked request
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/protected/:path*']
};

// 3. React components with risk awareness
// components/UserProfile.tsx

import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session } = useSession();
  
  if (!session?.user) {
    return <div>Please sign in</div>;
  }

  return (
    <div className="p-4">
      <h2>Welcome, {session.user.name}!</h2>
      <p>Email: {session.user.email}</p>
      
      {/* Show risk information for flagged users */}
      {session.user.flagged && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm">
            ⚠️ Your account is under security review. 
            Some features may be limited until verification is complete.
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Risk Level: {session.user.riskLevel} | Score: {session.user.riskScore}
          </p>
        </div>
      )}
    </div>
  );
}

// 4. Admin dashboard for managing flagged users
// pages/admin/users.tsx

import { useState, useEffect } from 'react';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter();

export default function AdminUsers() {
  const [stats, setStats] = useState(null);
  const [flaggedUsers, setFlaggedUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get domain statistics
    const domainStats = trialAbuseAdapter.getDomainManager().getStats();
    setStats(domainStats);

    // Get flagged users from your database
    const response = await fetch('/api/admin/flagged-users');
    const users = await response.json();
    setFlaggedUsers(users);
  };

  const addDomain = async (domain) => {
    await trialAbuseAdapter.getDomainManager().addDomains([domain]);
    alert('Domain added successfully');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Trial Abuse Management</h1>
      
      {/* Domain Statistics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Domain Statistics</h2>
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalDomains}</div>
              <div className="text-sm text-gray-600">Total Domains</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {stats.autoUpdateEnabled ? 'ON' : 'OFF'}
              </div>
              <div className="text-sm text-gray-600">Auto Update</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.updateInterval}h</div>
              <div className="text-sm text-gray-600">Update Interval</div>
            </div>
          </div>
        )}
      </div>

      {/* Flagged Users */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Flagged Users</h2>
        <div className="space-y-3">
          {flaggedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{user.email}</div>
                <div className="text-sm text-gray-600">
                  Risk: {user.riskScore} | Level: {user.riskLevel}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  onClick={() => approveUser(user.id)}
                >
                  Approve
                </button>
                <button 
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                  onClick={() => blockUser(user.id)}
                >
                  Block
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. API route for manual risk checking
// pages/api/check-risk.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { NextAuthTrialAbuseAdapter } from 'trial-abuse-guard/nextauth';

const trialAbuseAdapter = new NextAuthTrialAbuseAdapter();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    // Get client IP
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || '127.0.0.1';
    
    // Check risk
    const riskAssessment = await trialAbuseAdapter.checkUser(
      email, 
      ip, 
      req.headers['user-agent']
    );

    res.json({
      risk: riskAssessment.overall,
      level: riskAssessment.recommendation,
      details: riskAssessment.details
    });

  } catch (error) {
    console.error('Risk check failed:', error);
    res.status(500).json({ error: 'Risk assessment failed' });
  }
}

// 6. Environment variables (.env.local)
/*
# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# OAuth providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Trial Abuse Guard API keys (optional but recommended)
IPQS_API_KEY=your-ipqualityscore-api-key
VPNAPI_KEY=your-vpnapi-key
PROXYCHECK_KEY=your-proxycheck-key
*/