// Next.js API route with trial abuse protection
// pages/api/auth/register.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { TrialAbuseGuard, MongoStorageAdapter } from 'trial-abuse-guard';

let guard: TrialAbuseGuard | null = null;

async function getGuard() {
  if (!guard) {
    const mongoAdapter = new MongoStorageAdapter({
      connectionString: process.env.MONGODB_URI!,
      databaseName: process.env.DB_NAME!
    });
    
    await mongoAdapter.connect();
    
    guard = new TrialAbuseGuard({
      storageAdapter: mongoAdapter,
      apiKeys: {
        ipQualityScore: process.env.IPQS_API_KEY,
        vpnapi: process.env.VPNAPI_KEY
      }
    });
  }
  return guard;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
  return ip || '127.0.0.1';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check for trial abuse
    const guard = await getGuard();
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];

    const riskAssessment = await guard.checkUser(email, ipAddress, userAgent);

    // Block high-risk registrations
    if (riskAssessment.recommendation === 'block') {
      return res.status(403).json({
        error: 'Registration blocked for security reasons',
        code: 'SECURITY_BLOCK'
      });
    }

    // Create user (your logic here)
    const user = await createUser({ email, password, name });

    // Apply restrictions for flagged users
    if (riskAssessment.recommendation === 'flag') {
      await applySecurityRestrictions(user.id, riskAssessment);
    }

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      security: {
        riskLevel: guard.getRiskLevel(riskAssessment.overall),
        flagged: riskAssessment.recommendation === 'flag'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// React component for handling registration
// components/RegistrationForm.tsx

import React, { useState } from 'react';

interface RegistrationFormProps {
  onSuccess: (user: any) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'SECURITY_BLOCK') {
          setError('Registration is not available at this time. Please contact support if you believe this is an error.');
        } else {
          setError(data.error || 'Registration failed');
        }
        return;
      }

      // Show security notice for flagged users
      if (data.security?.flagged) {
        console.log('User flagged for security review');
        // You might want to show a notice or apply restrictions
      }

      onSuccess(data.user);
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full p-2 border rounded"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
};

// Helper functions (implement based on your user system)
async function createUser(userData: any) {
  // Your user creation logic
  return { id: 'user_' + Date.now(), ...userData };
}

async function applySecurityRestrictions(userId: string, riskData: any) {
  // Apply restrictions like:
  // - Manual approval required
  // - Limited trial period
  // - Enhanced monitoring
  console.log(`Applying security restrictions to user ${userId}`, riskData);
}