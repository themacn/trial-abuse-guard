import { TrialAbuseGuard } from '../../core/TrialAbuseGuard';
import { TrialAbuseConfig, RiskScore } from '../../types';

export interface ClerkTrialAbuseConfig extends TrialAbuseConfig {
  /** Block high-risk sign-ups */
  blockHighRisk?: boolean;
  /** Risk threshold for blocking (0-100) */
  blockThreshold?: number;
  /** Risk threshold for flagging (0-100) */
  flagThreshold?: number;
  /** Custom callback for handling flagged users */
  onUserFlagged?: (userId: string, email: string, riskData: RiskScore) => Promise<void>;
  /** Custom callback for handling blocked users */
  onUserBlocked?: (email: string, riskData: RiskScore) => Promise<void>;
  /** Clerk secret key for API access */
  clerkSecretKey?: string;
}

export class ClerkTrialAbuseAdapter {
  private guard: TrialAbuseGuard;
  private config: ClerkTrialAbuseConfig;

  constructor(config: ClerkTrialAbuseConfig = {}) {
    this.config = {
      blockHighRisk: true,
      blockThreshold: 80,
      flagThreshold: 50,
      ...config
    };

    this.guard = new TrialAbuseGuard(config);
  }

  /**
   * Webhook handler for Clerk events
   */
  createWebhookHandler() {
    return async (request: any) => {
      const event = await this.parseWebhookEvent(request);
      
      switch (event.type) {
        case 'user.created':
          return await this.handleUserCreated(event.data);
        case 'session.created':
          return await this.handleSessionCreated(event.data);
        default:
          return { success: true };
      }
    };
  }

  /**
   * Handle user creation event
   */
  private async handleUserCreated(userData: any) {
    const email = userData.email_addresses?.[0]?.email_address;
    const ipAddress = userData.last_sign_in_at ? this.extractIPFromClerkData(userData) : '127.0.0.1';

    if (!email) {
      return { success: true };
    }

    try {
      const riskAssessment = await this.guard.checkUser(email, ipAddress);

      // Handle high-risk users
      if (this.config.blockHighRisk && riskAssessment.overall >= this.config.blockThreshold!) {
        if (this.config.onUserBlocked) {
          await this.config.onUserBlocked(email, riskAssessment);
        }

        // Delete the user if they're high risk
        await this.deleteClerkUser(userData.id);
        
        console.warn(`Blocked and deleted high-risk user: ${email} (Risk: ${riskAssessment.overall})`);
        return { 
          success: true, 
          action: 'blocked',
          risk: riskAssessment.overall 
        };
      }

      // Handle medium-risk users
      if (riskAssessment.overall >= this.config.flagThreshold!) {
        if (this.config.onUserFlagged) {
          await this.config.onUserFlagged(userData.id, email, riskAssessment);
        }

        // Add metadata to Clerk user
        await this.updateClerkUserMetadata(userData.id, {
          riskScore: riskAssessment.overall,
          riskLevel: this.guard.getRiskLevel(riskAssessment.overall),
          flaggedAt: new Date().toISOString(),
          flaggedReason: riskAssessment.details.join(', ')
        });

        console.log(`Flagged medium-risk user: ${email} (Risk: ${riskAssessment.overall})`);
        return { 
          success: true, 
          action: 'flagged',
          risk: riskAssessment.overall 
        };
      }

      // Low-risk user - add basic metadata
      await this.updateClerkUserMetadata(userData.id, {
        riskScore: riskAssessment.overall,
        riskLevel: this.guard.getRiskLevel(riskAssessment.overall),
        checkedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        action: 'allowed',
        risk: riskAssessment.overall 
      };

    } catch (error) {
      console.error('Risk assessment failed for Clerk user:', error);
      return { success: true, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Handle session creation event
   */
  private async handleSessionCreated(sessionData: any) {
    // You can implement additional checks here for each sign-in
    return { success: true };
  }

  /**
   * Middleware for Clerk-protected routes
   */
  createMiddleware() {
    return async (request: any, response: any, next?: any) => {
      try {
        // Get user from Clerk session
        // @ts-ignore - Clerk may not be installed
        const { getAuth } = await import('@clerk/nextjs/server');
        const { userId } = getAuth(request);

        if (userId) {
          const user = await this.getClerkUser(userId);
          const riskScore = user?.unsafeMetadata?.riskScore;

          if (riskScore && riskScore >= this.config.blockThreshold!) {
            return response.status(403).json({
              error: 'Access denied due to security restrictions',
              code: 'HIGH_RISK_USER'
            });
          }

          // Add risk data to request
          request.userRisk = {
            score: riskScore || 0,
            level: user?.unsafeMetadata?.riskLevel || 'low',
            flagged: riskScore >= this.config.flagThreshold!
          };
        }

        if (next) {
          return next();
        }

      } catch (error) {
        console.error('Clerk middleware error:', error);
        if (next) {
          return next();
        }
      }
    };
  }

  /**
   * Check user before sign-up (for custom flows)
   */
  async preSignUpCheck(email: string, ipAddress: string, userAgent?: string): Promise<{
    allowed: boolean;
    risk: RiskScore;
    action: 'allow' | 'block' | 'flag';
  }> {
    const risk = await this.guard.checkUser(email, ipAddress, userAgent);
    
    let action: 'allow' | 'block' | 'flag' = 'allow';
    let allowed = true;

    if (risk.overall >= this.config.blockThreshold!) {
      action = 'block';
      allowed = false;
    } else if (risk.overall >= this.config.flagThreshold!) {
      action = 'flag';
    }

    return { allowed, risk, action };
  }

  /**
   * Get configuration for sign-up protection (use with your React components)
   */
  getSignUpProtection() {
    return {
      checkRisk: async (email: string, ipAddress: string) => {
        const result = await this.preSignUpCheck(email, ipAddress);
        return {
          allowed: result.allowed,
          risk: result.risk.overall,
          action: result.action
        };
      },
      
      createApiEndpoint: () => {
        return async (request: any, response: any) => {
          const { email } = request.body || {};
          const ipAddress = this.extractIPFromRequest(request);
          
          if (!email) {
            return response.status(400).json({ error: 'Email required' });
          }

          try {
            const result = await this.preSignUpCheck(email, ipAddress);
            return response.json({
              allowed: result.allowed,
              risk: result.risk.overall,
              action: result.action
            });
          } catch (error) {
            return response.status(500).json({ error: 'Risk check failed' });
          }
        };
      }
    };
  }

  /**
   * Parse Clerk webhook event
   */
  private async parseWebhookEvent(request: any) {
    // Verify webhook signature here in production
    const body = await request.json();
    return body;
  }

  /**
   * Extract IP from Clerk user data
   */
  private extractIPFromClerkData(userData: any): string {
    // Clerk doesn't provide IP directly, use a fallback
    return userData.last_sign_in_ip || '127.0.0.1';
  }

  /**
   * Extract IP from request headers
   */
  private extractIPFromRequest(request: any): string {
    return request.headers?.['x-forwarded-for']?.split(',')[0] ||
           request.headers?.['x-real-ip'] ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           '127.0.0.1';
  }

  /**
   * Delete Clerk user
   */
  private async deleteClerkUser(userId: string) {
    if (!this.config.clerkSecretKey) {
      console.warn('Clerk secret key not provided, cannot delete user');
      return;
    }

    try {
      const response = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.clerkSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete Clerk user:', error);
    }
  }

  /**
   * Update Clerk user metadata
   */
  private async updateClerkUserMetadata(userId: string, metadata: any) {
    if (!this.config.clerkSecretKey) {
      console.warn('Clerk secret key not provided, cannot update metadata');
      return;
    }

    try {
      const response = await fetch(`https://api.clerk.dev/v1/users/${userId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.clerkSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          unsafe_metadata: metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update metadata: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update Clerk user metadata:', error);
    }
  }

  /**
   * Get Clerk user
   */
  private async getClerkUser(userId: string): Promise<any> {
    if (!this.config.clerkSecretKey) {
      return null;
    }

    try {
      const response = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.clerkSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get Clerk user:', error);
    }

    return null;
  }

  /**
   * Get domain management methods
   */
  getDomainManager() {
    return {
      addDomains: (domains: string[]) => this.guard.addTempEmailDomains(domains),
      removeDomains: (domains: string[]) => this.guard.removeTempEmailDomains(domains),
      searchDomains: (pattern: string) => this.guard.searchTempEmailDomains(pattern),
      getStats: () => this.guard.getTempEmailStats(),
      exportDomains: (path: string, format: 'json' | 'txt' = 'json') => 
        this.guard.exportTempEmailDomains(path, format),
      importDomains: (path: string) => this.guard.importTempEmailDomains(path)
    };
  }

  /**
   * Manual risk check
   */
  async checkUser(email: string, ipAddress: string, userAgent?: string): Promise<RiskScore> {
    return await this.guard.checkUser(email, ipAddress, userAgent);
  }
}