// @ts-ignore - NextAuth may not be installed
import { NextAuthConfig, DefaultSession } from 'next-auth';
import { TrialAbuseGuard } from '../../core/TrialAbuseGuard';
import { TrialAbuseConfig, RiskScore } from '../../types';

// Extend NextAuth session type to include risk data
// @ts-ignore - NextAuth may not be installed
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      riskScore?: number;
      riskLevel?: string;
      flagged?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    riskScore?: number;
    riskLevel?: string;
    flagged?: boolean;
  }
}

export interface NextAuthTrialAbuseConfig extends TrialAbuseConfig {
  /** Block high-risk sign-ups */
  blockHighRisk?: boolean;
  /** Flag medium-risk users for review */
  flagMediumRisk?: boolean;
  /** Risk threshold for blocking (0-100) */
  blockThreshold?: number;
  /** Risk threshold for flagging (0-100) */
  flagThreshold?: number;
  /** Custom callback for handling flagged users */
  onUserFlagged?: (email: string, riskData: RiskScore) => Promise<void>;
  /** Custom callback for handling blocked users */
  onUserBlocked?: (email: string, riskData: RiskScore) => Promise<void>;
}

export class NextAuthTrialAbuseAdapter {
  private guard: TrialAbuseGuard;
  private config: NextAuthTrialAbuseConfig;

  constructor(config: NextAuthTrialAbuseConfig = {}) {
    this.config = {
      blockHighRisk: true,
      flagMediumRisk: true,
      blockThreshold: 80,
      flagThreshold: 50,
      ...config
    };

    this.guard = new TrialAbuseGuard(config);
  }

  /**
   * Get enhanced NextAuth configuration with trial abuse protection
   */
  getNextAuthConfig(baseConfig: NextAuthConfig): NextAuthConfig {
    return {
      ...baseConfig,
      callbacks: {
        ...baseConfig.callbacks,
        signIn: this.enhanceSignInCallback(baseConfig.callbacks?.signIn),
        session: this.enhanceSessionCallback(baseConfig.callbacks?.session),
        jwt: this.enhanceJWTCallback(baseConfig.callbacks?.jwt)
      },
      events: {
        ...baseConfig.events,
        signIn: this.enhanceSignInEvent(baseConfig.events?.signIn),
        createUser: this.enhanceCreateUserEvent(baseConfig.events?.createUser)
      }
    };
  }

  /**
   * Enhanced sign-in callback with trial abuse checking
   */
  private enhanceSignInCallback(originalCallback?: any) {
    return async (params: any) => {
      const { user, account, profile, email, credentials } = params;
      
      // Get IP address from request
      const request = params.request || (global as any).request;
      const ipAddress = this.extractIPFromRequest(request);
      
      // Check for trial abuse
      const userEmail = user?.email || email?.verificationRequest?.identifier || profile?.email;
      
      if (userEmail && ipAddress) {
        try {
          const riskAssessment = await this.guard.checkUser(
            userEmail, 
            ipAddress,
            request?.headers?.get('user-agent')
          );

          // Store risk data in user object
          user.riskScore = riskAssessment.overall;
          user.riskLevel = this.guard.getRiskLevel(riskAssessment.overall);
          user.flagged = riskAssessment.recommendation !== 'allow';

          // Handle high-risk users
          if (this.config.blockHighRisk && riskAssessment.overall >= this.config.blockThreshold!) {
            if (this.config.onUserBlocked) {
              await this.config.onUserBlocked(userEmail, riskAssessment);
            }
            
            console.warn(`Blocked high-risk sign-in: ${userEmail} (Risk: ${riskAssessment.overall})`);
            return false; // Block sign-in
          }

          // Handle medium-risk users
          if (this.config.flagMediumRisk && riskAssessment.overall >= this.config.flagThreshold!) {
            if (this.config.onUserFlagged) {
              await this.config.onUserFlagged(userEmail, riskAssessment);
            }
            
            console.log(`Flagged medium-risk sign-in: ${userEmail} (Risk: ${riskAssessment.overall})`);
          }

        } catch (error) {
          console.error('Trial abuse check failed:', error);
          // Continue with sign-in on error (don't block legitimate users)
        }
      }

      // Call original callback if provided
      if (originalCallback) {
        return await originalCallback(params);
      }

      return true;
    };
  }

  /**
   * Enhanced session callback to include risk data
   */
  private enhanceSessionCallback(originalCallback?: any) {
    return async (params: any) => {
      const { session, token, user } = params;

      // Add risk data to session
      if (token?.riskScore !== undefined) {
        session.user.riskScore = token.riskScore;
        session.user.riskLevel = token.riskLevel;
        session.user.flagged = token.flagged;
      } else if (user?.riskScore !== undefined) {
        session.user.riskScore = user.riskScore;
        session.user.riskLevel = user.riskLevel;
        session.user.flagged = user.flagged;
      }

      // Call original callback if provided
      if (originalCallback) {
        return await originalCallback(params);
      }

      return session;
    };
  }

  /**
   * Enhanced JWT callback to persist risk data
   */
  private enhanceJWTCallback(originalCallback?: any) {
    return async (params: any) => {
      const { token, user, account } = params;

      // Store risk data in JWT token
      if (user?.riskScore !== undefined) {
        token.riskScore = user.riskScore;
        token.riskLevel = user.riskLevel;
        token.flagged = user.flagged;
      }

      // Call original callback if provided
      if (originalCallback) {
        return await originalCallback(params);
      }

      return token;
    };
  }

  /**
   * Enhanced sign-in event for logging
   */
  private enhanceSignInEvent(originalEvent?: any) {
    return async (params: any) => {
      const { user, account, profile, isNewUser } = params;

      if (user?.flagged) {
        console.log(`Risk assessment - User: ${user.email}, Risk: ${user.riskScore}, Level: ${user.riskLevel}`);
      }

      // Call original event if provided
      if (originalEvent) {
        await originalEvent(params);
      }
    };
  }

  /**
   * Enhanced create user event for new registrations
   */
  private enhanceCreateUserEvent(originalEvent?: any) {
    return async (params: any) => {
      const { user } = params;

      if (user?.flagged) {
        console.log(`New user flagged for review: ${user.email} (Risk: ${user.riskScore})`);
      }

      // Call original event if provided
      if (originalEvent) {
        await originalEvent(params);
      }
    };
  }

  /**
   * Extract IP address from request
   */
  private extractIPFromRequest(request: any): string {
    if (!request) return '127.0.0.1';

    // Try various headers
    const forwardedFor = request.headers?.get?.('x-forwarded-for') || 
                        request.headers?.['x-forwarded-for'];
    const realIP = request.headers?.get?.('x-real-ip') || 
                   request.headers?.['x-real-ip'];
    const cfConnectingIP = request.headers?.get?.('cf-connecting-ip') || 
                          request.headers?.['cf-connecting-ip'];

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip || request.connection?.remoteAddress || '127.0.0.1';
  }

  /**
   * Middleware for API routes to check risk
   */
  createMiddleware() {
    return async (request: any, response: any, next?: any) => {
      const email = request.body?.email || request.query?.email;
      const ipAddress = this.extractIPFromRequest(request);

      if (email) {
        try {
          const riskAssessment = await this.guard.checkUser(
            email, 
            ipAddress,
            request.headers?.['user-agent']
          );

          // Add risk data to request
          request.riskAssessment = riskAssessment;

          // Block high-risk requests
          if (this.config.blockHighRisk && riskAssessment.overall >= this.config.blockThreshold!) {
            return response.status(403).json({
              error: 'Access denied for security reasons',
              code: 'TRIAL_ABUSE_DETECTED'
            });
          }

        } catch (error) {
          console.error('Risk assessment failed:', error);
          request.riskAssessment = null;
        }
      }

      if (next) {
        return next();
      }
    };
  }

  /**
   * Check user risk manually
   */
  async checkUser(email: string, ipAddress: string, userAgent?: string): Promise<RiskScore> {
    return await this.guard.checkUser(email, ipAddress, userAgent);
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
}