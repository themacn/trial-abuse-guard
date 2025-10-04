// Simple levenshtein distance implementation
function levenshtein(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}
import { TrialAbuseConfig, EmailSimilarityResult } from '../types';

export class EmailSimilarityDetector {
  private config: TrialAbuseConfig;

  constructor(config: TrialAbuseConfig) {
    this.config = config;
  }

  async checkSimilarity(email: string): Promise<EmailSimilarityResult> {
    if (!this.config.storageAdapter) {
      return {
        similarEmails: [],
        highestSimilarity: 0,
        suspicious: false
      };
    }

    const existingEmails = await this.config.storageAdapter.getExistingEmails();
    const normalizedEmail = this.normalizeEmail(email);
    const similarities: Array<{ email: string; similarity: number }> = [];

    for (const existingEmail of existingEmails) {
      const normalizedExisting = this.normalizeEmail(existingEmail);
      
      // Skip exact matches (legitimate re-registrations)
      if (normalizedEmail === normalizedExisting) {
        continue;
      }

      const similarity = this.calculateSimilarity(normalizedEmail, normalizedExisting);
      
      if (similarity > (this.config.emailSimilarityThreshold || 0.8)) {
        similarities.push({ email: existingEmail, similarity });
      }
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    const highestSimilarity = similarities.length > 0 ? similarities[0].similarity : 0;
    const suspicious = highestSimilarity > (this.config.emailSimilarityThreshold || 0.8);

    return {
      similarEmails: similarities.slice(0, 5), // Return top 5 similar emails
      highestSimilarity,
      suspicious
    };
  }

  private normalizeEmail(email: string): string {
    // Convert to lowercase and remove common variations
    const [localPart, domain] = email.toLowerCase().split('@');
    
    // Remove dots from Gmail addresses (gmail ignores them)
    let normalizedLocal = localPart;
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      normalizedLocal = localPart.replace(/\./g, '');
      // Remove everything after + (gmail alias)
      normalizedLocal = normalizedLocal.split('+')[0];
    }
    
    // Handle other common email providers
    if (domain === 'yahoo.com' || domain === 'hotmail.com' || domain === 'outlook.com') {
      normalizedLocal = localPart.split('+')[0];
    }

    return `${normalizedLocal}@${domain}`;
  }

  private calculateSimilarity(email1: string, email2: string): number {
    // Calculate similarity using multiple methods
    
    // 1. Levenshtein distance similarity
    const maxLength = Math.max(email1.length, email2.length);
    const levenshteinDistance = levenshtein(email1, email2);
    const levenshteinSimilarity = 1 - (levenshteinDistance / maxLength);

    // 2. Domain similarity check
    const domain1 = email1.split('@')[1];
    const domain2 = email2.split('@')[1];
    const domainMatch = domain1 === domain2 ? 1 : 0;

    // 3. Local part similarity (username part)
    const local1 = email1.split('@')[0];
    const local2 = email2.split('@')[0];
    const localMaxLength = Math.max(local1.length, local2.length);
    const localDistance = levenshtein(local1, local2);
    const localSimilarity = 1 - (localDistance / localMaxLength);

    // 4. Check for common patterns (sequential numbers, etc.)
    const patternSimilarity = this.checkPatternSimilarity(local1, local2);

    // Weighted combination
    const weights = {
      levenshtein: 0.3,
      domain: 0.3,
      local: 0.3,
      pattern: 0.1
    };

    return (
      levenshteinSimilarity * weights.levenshtein +
      domainMatch * weights.domain +
      localSimilarity * weights.local +
      patternSimilarity * weights.pattern
    );
  }

  private checkPatternSimilarity(local1: string, local2: string): number {
    // Remove numbers and compare base
    const base1 = local1.replace(/\d+/g, '');
    const base2 = local2.replace(/\d+/g, '');
    
    if (base1 === base2 && base1.length > 2) {
      // Same base with different numbers (e.g., john1, john2)
      return 0.9;
    }

    // Check for sequential patterns
    const nums1 = local1.match(/\d+/g) || [];
    const nums2 = local2.match(/\d+/g) || [];
    
    if (base1 === base2 && nums1.length === 1 && nums2.length === 1) {
      const num1 = parseInt(nums1[0]);
      const num2 = parseInt(nums2[0]);
      
      if (Math.abs(num1 - num2) <= 5) {
        // Sequential numbers within 5 (e.g., user1, user2, user3)
        return 0.8;
      }
    }

    return 0;
  }
}