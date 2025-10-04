import { 
  TrialAbuseConfig, 
  UserData, 
  RiskScore, 
  RiskFactor, 
  EmailSimilarityResult, 
  IPAnalysisResult,
  RiskLevel 
} from '../types';
import { EmailSimilarityDetector } from '../detectors/EmailSimilarityDetector';
import { TempEmailDetector } from '../detectors/TempEmailDetector';
import { IPAnalyzer } from '../detectors/IPAnalyzer';
import { VPNDetector } from '../detectors/VPNDetector';

export class TrialAbuseGuard {
  private config: Required<TrialAbuseConfig>;
  private emailDetector: EmailSimilarityDetector;
  private tempEmailDetector: TempEmailDetector;
  private ipAnalyzer: IPAnalyzer;
  private vpnDetector: VPNDetector;

  constructor(config: TrialAbuseConfig = {}) {
    this.config = {
      emailSimilarityCheck: true,
      emailSimilarityThreshold: 0.8,
      tempEmailCheck: true,
      ipCheck: true,
      vpnCheck: true,
      customDisposableDomains: [],
      tempEmailAutoUpdate: false,
      tempEmailUpdateInterval: 24,
      tempEmailStoragePath: './temp-domains.json',
      apiKeys: {},
      storageAdapter: new InMemoryStorageAdapter(),
      ...config
    };

    this.emailDetector = new EmailSimilarityDetector(this.config);
    this.tempEmailDetector = new TempEmailDetector(this.config);
    this.ipAnalyzer = new IPAnalyzer(this.config);
    this.vpnDetector = new VPNDetector(this.config);
  }

  /**
   * Main method to check for trial abuse
   */
  async checkTrialAbuse(userData: UserData): Promise<RiskScore> {
    const factors = await this.analyzeAllFactors(userData);
    const overall = this.calculateOverallRisk(factors);
    const recommendation = this.getRecommendation(overall);
    const details = this.generateRiskDetails(factors);

    // Store user data for future comparisons
    if (this.config.storageAdapter) {
      await this.config.storageAdapter.storeUserData(userData);
    }

    return {
      overall,
      factors,
      recommendation,
      details
    };
  }

  /**
   * Convenience method that matches the requested API: user.checkTrialAbuse()
   */
  async checkUser(email: string, ipAddress: string, userAgent?: string): Promise<RiskScore> {
    const userData: UserData = {
      email,
      ipAddress,
      userAgent,
      timestamp: new Date()
    };

    return this.checkTrialAbuse(userData);
  }

  private async analyzeAllFactors(userData: UserData) {
    const results = await Promise.allSettled([
      this.config.emailSimilarityCheck ? this.checkEmailSimilarity(userData.email) : Promise.resolve(null),
      this.config.tempEmailCheck ? this.checkTempEmail(userData.email) : Promise.resolve(null),
      this.config.ipCheck ? this.checkIPRisk(userData.ipAddress) : Promise.resolve(null),
      this.config.vpnCheck ? this.checkVPN(userData.ipAddress) : Promise.resolve(null)
    ]);

    return {
      emailSimilarity: this.processResult(results[0], 'emailSimilarity'),
      tempEmail: this.processResult(results[1], 'tempEmail'),
      ipRisk: this.processResult(results[2], 'ipRisk'),
      vpnDetection: this.processResult(results[3], 'vpnDetection')
    };
  }

  private async checkEmailSimilarity(email: string): Promise<RiskFactor> {
    try {
      const result = await this.emailDetector.checkSimilarity(email);
      return {
        score: result.suspicious ? Math.round(result.highestSimilarity * 100) : 0,
        detected: result.suspicious,
        confidence: result.highestSimilarity,
        details: result.suspicious ? 
          `Similar to existing emails: ${result.similarEmails.map(e => e.email).join(', ')}` : 
          'No similar emails found'
      };
    } catch (error) {
      return this.createErrorFactor('Email similarity check failed');
    }
  }

  private async checkTempEmail(email: string): Promise<RiskFactor> {
    try {
      const isTemp = this.tempEmailDetector.isTemporaryEmail(email);
      return {
        score: isTemp ? 90 : 0,
        detected: isTemp,
        confidence: isTemp ? 0.95 : 0.05,
        details: isTemp ? 'Temporary/disposable email detected' : 'Email appears legitimate'
      };
    } catch (error) {
      return this.createErrorFactor('Temporary email check failed');
    }
  }

  private async checkIPRisk(ipAddress: string): Promise<RiskFactor> {
    try {
      const result = await this.ipAnalyzer.analyzeIP(ipAddress);
      return {
        score: result.riskScore,
        detected: result.riskScore > 50,
        confidence: result.riskScore / 100,
        details: `IP Risk Score: ${result.riskScore}, Country: ${result.country || 'Unknown'}`
      };
    } catch (error) {
      return this.createErrorFactor('IP risk check failed');
    }
  }

  private async checkVPN(ipAddress: string): Promise<RiskFactor> {
    try {
      const result = await this.vpnDetector.detectVPN(ipAddress);
      const detected = result.isVPN || result.isProxy || result.isTor;
      const score = detected ? 80 : 0;
      
      return {
        score,
        detected,
        confidence: detected ? 0.9 : 0.1,
        details: detected ? 
          `VPN/Proxy detected: VPN=${result.isVPN}, Proxy=${result.isProxy}, Tor=${result.isTor}` : 
          'No VPN/Proxy detected'
      };
    } catch (error) {
      return this.createErrorFactor('VPN detection failed');
    }
  }

  private processResult(result: PromiseSettledResult<any>, factorName: string): RiskFactor {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
    return this.createErrorFactor(`${factorName} check failed`);
  }

  private createErrorFactor(details: string): RiskFactor {
    return {
      score: 0,
      detected: false,
      confidence: 0,
      details
    };
  }

  private calculateOverallRisk(factors: any): number {
    const weights = {
      emailSimilarity: 0.3,
      tempEmail: 0.25,
      ipRisk: 0.25,
      vpnDetection: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      if (factors[factor].confidence > 0) {
        totalScore += factors[factor].score * weight * factors[factor].confidence;
        totalWeight += weight * factors[factor].confidence;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  private getRecommendation(score: number): 'allow' | 'flag' | 'block' {
    if (score >= 80) return 'block';
    if (score >= 50) return 'flag';
    return 'allow';
  }

  private generateRiskDetails(factors: any): string[] {
    const details: string[] = [];
    
    Object.values(factors).forEach((factor: any) => {
      if (factor.detected) {
        details.push(factor.details);
      }
    });

    if (details.length === 0) {
      details.push('No significant risk factors detected');
    }

    return details;
  }

  /**
   * Get risk level as human-readable string
   */
  getRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Get temp email detector for domain management
   */
  getTempEmailDetector(): TempEmailDetector {
    return this.tempEmailDetector;
  }

  /**
   * Add domains to temp email blacklist
   */
  async addTempEmailDomains(domains: string[]): Promise<void> {
    await this.tempEmailDetector.addCustomDisposableDomains(domains);
  }

  /**
   * Remove domains from temp email blacklist
   */
  async removeTempEmailDomains(domains: string[]): Promise<void> {
    await this.tempEmailDetector.removeDisposableDomains(domains);
  }

  /**
   * Get all temp email domains
   */
  getTempEmailDomains(): string[] {
    return this.tempEmailDetector.getAllDisposableDomains();
  }

  /**
   * Get temp email domain statistics
   */
  getTempEmailStats() {
    return this.tempEmailDetector.getDomainStats();
  }

  /**
   * Force update temp email domains from external sources
   */
  async updateTempEmailDomains(): Promise<void> {
    await this.tempEmailDetector.updateDomains();
  }

  /**
   * Search temp email domains
   */
  searchTempEmailDomains(pattern: string): string[] {
    return this.tempEmailDetector.searchDomains(pattern);
  }

  /**
   * Export temp email domains to file
   */
  async exportTempEmailDomains(filePath: string, format: 'json' | 'txt' = 'json'): Promise<void> {
    await this.tempEmailDetector.exportDomains(filePath, format);
  }

  /**
   * Import temp email domains from file
   */
  async importTempEmailDomains(filePath: string): Promise<number> {
    return await this.tempEmailDetector.importDomains(filePath);
  }
}

// Default in-memory storage adapter for basic usage
class InMemoryStorageAdapter {
  private emails: string[] = [];
  private userData: Map<string, UserData[]> = new Map();

  async getExistingEmails(): Promise<string[]> {
    return [...this.emails];
  }

  async getExistingIPs(email: string): Promise<string[]> {
    const data = this.userData.get(email) || [];
    return data.map(d => d.ipAddress);
  }

  async storeUserData(data: UserData): Promise<void> {
    if (!this.emails.includes(data.email)) {
      this.emails.push(data.email);
    }

    const existing = this.userData.get(data.email) || [];
    existing.push(data);
    this.userData.set(data.email, existing);
  }
}