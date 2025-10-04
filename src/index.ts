// Main exports
export { TrialAbuseGuard } from './core/TrialAbuseGuard';

// Type exports
export {
  TrialAbuseConfig,
  StorageAdapter,
  UserData,
  RiskScore,
  RiskFactor,
  EmailSimilarityResult,
  IPAnalysisResult,
  RiskLevel
} from './types';

// Storage adapters
export { MongoStorageAdapter } from './adapters/MongoStorageAdapter';
export { PostgreSQLStorageAdapter } from './adapters/PostgreSQLStorageAdapter';
export { RedisStorageAdapter } from './adapters/RedisStorageAdapter';

// Individual detectors (for advanced usage)
export { EmailSimilarityDetector } from './detectors/EmailSimilarityDetector';
export { TempEmailDetector } from './detectors/TempEmailDetector';
export { IPAnalyzer } from './detectors/IPAnalyzer';
export { VPNDetector } from './detectors/VPNDetector';

// Services
export { TempDomainService } from './services/TempDomainService';

// Integrations
export { NextAuthTrialAbuseAdapter } from './integrations/nextauth/NextAuthAdapter';
export { ClerkTrialAbuseAdapter } from './integrations/clerk/ClerkAdapter';

// Import types and class for convenience function
import { TrialAbuseGuard } from './core/TrialAbuseGuard';
import { TrialAbuseConfig } from './types';

// Convenience function for quick setup
export function createTrialGuard(config?: TrialAbuseConfig) {
  return new TrialAbuseGuard(config);
}

// Default export
export { TrialAbuseGuard as default };