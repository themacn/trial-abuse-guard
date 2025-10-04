// Static list of common disposable email domains
const disposableEmailDomains = [
  '10minutemail.com', '20minutemail.com', '33mail.com', 'guerrillamail.com',
  'mailinator.com', 'tempmail.org', 'temp-mail.org', 'throwaway.email',
  'yopmail.com', 'maildrop.cc', 'sharklasers.com', 'getnada.com',
  'tempail.com', 'dispostable.com', 'fakeinbox.com', 'spambox.us',
  'tempr.email', 'mohmal.com', 'emkei.cf', 'crazymailing.com'
];
import { TrialAbuseConfig } from '../types';

export class TempEmailDetector {
  private config: TrialAbuseConfig;
  private disposableDomains: Set<string>;
  private suspiciousPatterns: RegExp[];

  constructor(config: TrialAbuseConfig) {
    this.config = config;
    
    // Load disposable email domains
    this.disposableDomains = new Set([
      ...disposableEmailDomains,
      ...(config.customDisposableDomains || [])
    ]);

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
    if (this.disposableDomains.has(domain)) {
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
  addCustomDisposableDomains(domains: string[]): void {
    domains.forEach(domain => {
      this.disposableDomains.add(domain.toLowerCase());
    });
  }

  /**
   * Check if a domain is in the disposable list
   */
  isDomainDisposable(domain: string): boolean {
    return this.disposableDomains.has(domain.toLowerCase());
  }
}