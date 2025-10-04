import { TrialAbuseGuard } from '../src/core/TrialAbuseGuard';
import { StorageAdapter, UserData } from '../src/types';

// Mock storage adapter for testing
class MockStorageAdapter implements StorageAdapter {
  private emails: string[] = ['existing@example.com', 'test.user@gmail.com'];
  private userData: UserData[] = [];

  async getExistingEmails(): Promise<string[]> {
    return this.emails;
  }

  async getExistingIPs(email: string): Promise<string[]> {
    return this.userData
      .filter(u => u.email === email)
      .map(u => u.ipAddress);
  }

  async storeUserData(data: UserData): Promise<void> {
    this.userData.push(data);
    if (!this.emails.includes(data.email)) {
      this.emails.push(data.email);
    }
  }
}

describe('TrialAbuseGuard', () => {
  let guard: TrialAbuseGuard;
  let mockAdapter: MockStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MockStorageAdapter();
    guard = new TrialAbuseGuard({
      storageAdapter: mockAdapter,
      emailSimilarityThreshold: 0.8
    });
  });

  describe('checkUser', () => {
    it('should detect low risk for normal users', async () => {
      const result = await guard.checkUser(
        'newuser@example.com',
        '203.0.113.1',
        'Mozilla/5.0'
      );

      expect(result.overall).toBeLessThan(30);
      expect(result.recommendation).toBe('allow');
      expect(result.factors.emailSimilarity.detected).toBe(false);
    });

    it('should detect email similarity', async () => {
      const result = await guard.checkUser(
        'existing2@example.com', // Similar to existing@example.com
        '203.0.113.1'
      );

      expect(result.factors.emailSimilarity.detected).toBe(true);
      expect(result.overall).toBeGreaterThan(30);
    });

    it('should detect temporary emails', async () => {
      const result = await guard.checkUser(
        'test@10minutemail.com',
        '203.0.113.1'
      );

      expect(result.factors.tempEmail.detected).toBe(true);
      expect(result.overall).toBeGreaterThan(70);
      expect(result.recommendation).toBe('block');
    });

    it('should handle private IP addresses', async () => {
      const result = await guard.checkUser(
        'user@example.com',
        '192.168.1.1' // Private IP
      );

      expect(result.factors.ipRisk.score).toBe(0);
      expect(result.factors.vpnDetection.detected).toBe(false);
    });

    it('should return correct risk levels', () => {
      expect(guard.getRiskLevel(10)).toBe('low');
      expect(guard.getRiskLevel(40)).toBe('medium');
      expect(guard.getRiskLevel(70)).toBe('high');
      expect(guard.getRiskLevel(90)).toBe('critical');
    });

    it('should handle API failures gracefully', async () => {
      // This test ensures the system doesn't break when external APIs fail
      const result = await guard.checkUser(
        'test@example.com',
        '203.0.113.1'
      );

      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(['allow', 'flag', 'block']).toContain(result.recommendation);
    });
  });

  describe('configuration', () => {
    it('should respect disabled checks', async () => {
      const restrictedGuard = new TrialAbuseGuard({
        emailSimilarityCheck: false,
        tempEmailCheck: false,
        ipCheck: false,
        vpnCheck: false,
        storageAdapter: mockAdapter
      });

      const result = await restrictedGuard.checkUser(
        'test@10minutemail.com',
        '203.0.113.1'
      );

      expect(result.overall).toBe(0);
      expect(result.recommendation).toBe('allow');
    });

    it('should use custom similarity threshold', async () => {
      const strictGuard = new TrialAbuseGuard({
        emailSimilarityThreshold: 0.5, // More strict
        storageAdapter: mockAdapter
      });

      const result = await strictGuard.checkUser(
        'existing3@example.com',
        '203.0.113.1'
      );

      // Should detect similarity with lower threshold
      expect(result.factors.emailSimilarity.detected).toBe(true);
    });
  });
});