// Clerk integration examples

// 1. Basic setup with Clerk webhooks
// app/api/webhooks/clerk/route.ts

import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

// Initialize the Clerk adapter
const clerkAdapter = new ClerkTrialAbuseAdapter({
  blockHighRisk: true,
  blockThreshold: 80,
  flagThreshold: 50,
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  
  // Custom callbacks
  onUserBlocked: async (email, riskData) => {
    console.log(`🚫 Blocked and deleted user: ${email} (Risk: ${riskData.overall})`);
    // Send admin notification
    await sendAdminAlert('High-risk user blocked', { email, risk: riskData.overall });
  },
  
  onUserFlagged: async (userId, email, riskData) => {
    console.log(`⚠️ Flagged user: ${email} (Risk: ${riskData.overall})`);
    // Add to review queue
    await addToReviewQueue(userId, email, riskData);
  },
  
  // Domain management
  tempEmailAutoUpdate: true,
  customDisposableDomains: ['company-temp.com']
});

export async function POST(request: NextRequest) {
  try {
    // Create webhook handler
    const webhookHandler = clerkAdapter.createWebhookHandler();
    const result = await webhookHandler(request);
    
    return Response.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

// 2. Pre-signup risk checking API route
// app/api/check-signup-risk/route.ts

import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';
import { NextRequest } from 'next/server';

const clerkAdapter = new ClerkTrialAbuseAdapter();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const userAgent = request.headers.get('user-agent');

    // Check risk before signup
    const result = await clerkAdapter.preSignUpCheck(email, ip, userAgent);

    if (!result.allowed) {
      return Response.json({
        allowed: false,
        message: 'Sign-up not available at this time'
      }, { status: 403 });
    }

    return Response.json({
      allowed: true,
      risk: result.risk.overall,
      action: result.action
    });

  } catch (error) {
    console.error('Risk check failed:', error);
    return Response.json({ error: 'Risk check failed' }, { status: 500 });
  }
}

// 3. Custom signup component with risk checking
// components/ProtectedSignUp.tsx

'use client';

import { SignUp } from '@clerk/nextjs';
import { useState } from 'react';

export function ProtectedSignUp() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkEmailRisk = async (email: string) => {
    if (!email || !email.includes('@')) return;

    setIsChecking(true);
    
    try {
      const response = await fetch('/api/check-signup-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!result.allowed) {
        setIsBlocked(true);
      }
    } catch (error) {
      console.error('Risk check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Sign-up Not Available
          </h2>
          <p className="text-red-600 text-sm">
            We're unable to process your registration at this time. 
            Please contact our support team if you believe this is an error.
          </p>
          <button 
            onClick={() => setIsBlocked(false)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      {isChecking && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Validating email...</span>
          </div>
        </div>
      )}
      
      <SignUp 
        appearance={{
          elements: {
            formFieldInput: 'focus:ring-2 focus:ring-blue-500',
            footerActionLink: 'text-blue-600 hover:text-blue-800'
          }
        }}
        afterSignUpUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}

// 4. Middleware for protecting routes based on risk
// middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';

const clerkAdapter = new ClerkTrialAbuseAdapter({
  blockThreshold: 75,
  clerkSecretKey: process.env.CLERK_SECRET_KEY
});

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/user(.*)',
  '/admin(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  // Apply Clerk authentication
  if (isProtectedRoute(request)) {
    auth().protect();
  }

  // Apply trial abuse protection
  const trialAbuseMiddleware = clerkAdapter.createMiddleware();
  const response = await trialAbuseMiddleware(request, null);
  
  if (response) {
    return response; // User blocked due to high risk
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

// 5. User dashboard with risk awareness
// app/dashboard/page.tsx

import { currentUser } from '@clerk/nextjs/server';

export default async function Dashboard() {
  const user = await currentUser();
  
  if (!user) {
    return <div>Please sign in</div>;
  }

  const riskScore = user.unsafeMetadata?.riskScore as number;
  const riskLevel = user.unsafeMetadata?.riskLevel as string;
  const flagged = riskScore >= 50;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Welcome, {user.firstName}!</h2>
        <p className="text-gray-600">Email: {user.emailAddresses[0]?.emailAddress}</p>
        
        {/* Security status */}
        <div className="mt-4 p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="font-medium">Account Security Status</span>
            <span className={`px-2 py-1 rounded text-sm ${
              riskLevel === 'low' ? 'bg-green-100 text-green-800' :
              riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {riskLevel || 'verified'}
            </span>
          </div>
          
          {flagged && (
            <div className="mt-2 text-sm text-yellow-700">
              ⚠️ Your account is under security review. Some features may be limited.
            </div>
          )}
        </div>
      </div>

      {/* Features with conditional access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard 
          title="Basic Features" 
          available={true}
          description="Access to core functionality"
        />
        <FeatureCard 
          title="Premium Features" 
          available={!flagged}
          description="Advanced tools and integrations"
          blocked={flagged}
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, available, description, blocked = false }) {
  return (
    <div className={`p-4 rounded-lg border ${
      available ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{title}</h3>
        {available ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-red-600">✗</span>
        )}
      </div>
      <p className="text-sm text-gray-600">{description}</p>
      {blocked && (
        <p className="text-xs text-red-600 mt-2">
          Temporarily restricted due to security review
        </p>
      )}
    </div>
  );
}

// 6. Admin panel for managing user risks
// app/admin/users/page.tsx

import { clerkClient } from '@clerk/nextjs/server';
import { ClerkTrialAbuseAdapter } from 'trial-abuse-guard/clerk';

const clerkAdapter = new ClerkTrialAbuseAdapter();

export default async function AdminUsers() {
  // Get users with metadata
  const users = await clerkClient.users.getUserList({
    limit: 50,
    orderBy: '-created_at'
  });

  const flaggedUsers = users.data.filter(user => 
    (user.unsafeMetadata?.riskScore as number) >= 50
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Risk Management</h1>
      
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={users.data.length} />
        <StatCard label="Flagged Users" value={flaggedUsers.length} color="red" />
        <StatCard label="Domain Count" value={clerkAdapter.getDomainManager().getStats().totalDomains} />
        <StatCard label="Auto-Update" value={clerkAdapter.getDomainManager().getStats().autoUpdateEnabled ? "ON" : "OFF"} />
      </div>

      {/* Flagged Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Flagged Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flagged At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flaggedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.emailAddresses[0]?.emailAddress}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      (user.unsafeMetadata?.riskScore as number) >= 80 ? 'bg-red-100 text-red-800' :
                      (user.unsafeMetadata?.riskScore as number) >= 60 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.unsafeMetadata?.riskScore || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.unsafeMetadata?.flaggedAt ? 
                      new Date(user.unsafeMetadata.flaggedAt as string).toLocaleDateString() : 
                      'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-green-600 hover:text-green-900">
                      Approve
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Block
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'blue' }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

// Helper functions
async function sendAdminAlert(message: string, data: any) {
  // Implement your admin notification system
  console.log('Admin Alert:', message, data);
}

async function addToReviewQueue(userId: string, email: string, riskData: any) {
  // Add user to manual review queue
  console.log('Added to review queue:', { userId, email, risk: riskData.overall });
}