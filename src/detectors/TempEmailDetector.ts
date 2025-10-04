import { TrialAbuseConfig } from '../types';
import { TempDomainService, TempDomainConfig } from '../services/TempDomainService';

export class TempEmailDetector {
  private config: TrialAbuseConfig;
  private domainService: TempDomainService;
  private suspiciousPatterns: RegExp[];

  constructor(config: TrialAbuseConfig) {
    this.config = config;
    
    // Initialize domain service with configuration
    const domainConfig: TempDomainConfig = {
      customDomains: config.customDisposableDomains || [],
      autoUpdate: config.tempEmailAutoUpdate !== false, // Default to true
      updateIntervalHours: config.tempEmailUpdateInterval || 24,
      localStoragePath: config.tempEmailStoragePath
    };
    
    this.domainService = new TempDomainService(domainConfig);

    // Common patterns for temporary emails
    this.suspiciousPatterns = [
      /temp/i,
      /disposable/i,
      /throwaway/i,
      /guerrilla/i,
      /mailinator/i,
      /10minute/i,
      /trash/i,
      /fake/i,
      /burner/i,
      /spam/i,
      /\d{10,}/i, // Long sequences of numbers
      /test.*mail/i,
      /no.*reply/i,
      /delete.*me/i
    ];
  }

  isTemporaryEmail(email: string): boolean {
    const domain = this.extractDomain(email);
    const localPart = this.extractLocalPart(email);

    // Check against known disposable domains
    if (this.domainService.isDomainTemporary(domain)) {
      return true;
    }

    // Check for suspicious patterns in domain
    if (this.hasSuspiciousPattern(domain)) {
      return true;
    }

    // Check for suspicious patterns in local part
    if (this.hasSuspiciousPattern(localPart)) {
      return true;
    }

    // Check for suspicious domain characteristics
    if (this.isDomainSuspicious(domain)) {
      return true;
    }

    return false;
  }

  private extractDomain(email: string): string {
    return email.toLowerCase().split('@')[1] || '';
  }

  private extractLocalPart(email: string): string {
    return email.toLowerCase().split('@')[0] || '';
  }

  private hasSuspiciousPattern(text: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private isDomainSuspicious(domain: string): boolean {
    // Check for suspicious domain characteristics
    
    // Very new TLDs commonly used for disposable emails
    const suspiciousTlds = [
      '.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.top', '.click',
      '.download', '.stream', '.science', '.racing', '.review',
      '.party', '.trade', '.webcam', '.win', '.bid', '.loan'
    ];

    if (suspiciousTlds.some(tld => domain.endsWith(tld))) {
      return true;
    }

    // Very short domains (often disposable)
    if (domain.length <= 6) {
      return true;
    }

    // Domains with many numbers or hyphens
    const numberCount = (domain.match(/\d/g) || []).length;
    const hyphenCount = (domain.match(/-/g) || []).length;
    
    if (numberCount > 3 || hyphenCount > 2) {
      return true;
    }

    // Check for random-looking domains
    if (this.looksRandom(domain)) {
      return true;
    }

    return false;
  }

  private looksRandom(domain: string): boolean {
    const domainName = domain.split('.')[0];
    
    // Check for alternating consonants/vowels pattern (often random)
    const vowels = 'aeiou';
    let alternatingPattern = 0;
    
    for (let i = 0; i < domainName.length - 1; i++) {
      const currentIsVowel = vowels.includes(domainName[i]);
      const nextIsVowel = vowels.includes(domainName[i + 1]);
      
      if (currentIsVowel !== nextIsVowel) {
        alternatingPattern++;
      }
    }

    // If more than 70% alternating, likely random
    if (alternatingPattern / (domainName.length - 1) > 0.7) {
      return true;
    }

    // Check for repeating character patterns
    const repeatingChars = domainName.match(/(.)\1{2,}/g);
    if (repeatingChars && repeatingChars.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Add custom disposable domains to the detector
   */
  async addCustomDisposableDomains(domains: string[]): Promise<void> {
    await this.domainService.addDomains(domains);
  }

  /**
   * Remove domains from the disposable list
   */
  async removeDisposableDomains(domains: string[]): Promise<void> {
    await this.domainService.removeDomains(domains);
  }

  /**
   * Check if a domain is in the disposable list
   */
  isDomainDisposable(domain: string): boolean {
    return this.domainService.isDomainTemporary(domain);
  }

  /**
   * Get all disposable domains
   */
  getAllDisposableDomains(): string[] {
    return this.domainService.getAllDomains();
  }

  /**
   * Get domain statistics
   */
  getDomainStats() {
    return this.domainService.getStats();
  }

  /**
   * Force update domain list from external sources
   */
  async updateDomains(): Promise<void> {
    await this.domainService.forceUpdate();
  }

  /**
   * Search domains by pattern
   */
  searchDomains(pattern: string): string[] {
    return this.domainService.searchDomains(pattern);
  }

  /**
   * Export domains to file
   */
  async exportDomains(filePath: string, format: 'json' | 'txt' = 'json'): Promise<void> {
    await this.domainService.exportDomains(filePath, format);
  }

  /**
   * Import domains from file
   */
  async importDomains(filePath: string): Promise<number> {
    return await this.domainService.importDomains(filePath);
  }

  /**
   * Reset to default domain list
   */
  async resetDomains(): Promise<void> {
    await this.domainService.reset();
  }
}