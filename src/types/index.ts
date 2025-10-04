export interface TrialAbuseConfig {
  /** Enable email similarity detection */
  emailSimilarityCheck?: boolean;
  /** Threshold for email similarity (0-1, where 1 is identical) */
  emailSimilarityThreshold?: number;
  /** Enable temporary/disposable email detection */
  tempEmailCheck?: boolean;
  /** Enable IP-based detection */
  ipCheck?: boolean;
  /** Enable VPN/Proxy detection */
  vpnCheck?: boolean;
  /** Custom disposable email domains list */
  customDisposableDomains?: string[];
  /** API keys for external services */
  apiKeys?: {
    ipQualityScore?: string;
    vpnapi?: string;
    proxyCheck?: string;
  };
  /** Database/storage adapter for checking existing users */
  storageAdapter?: StorageAdapter;
}

export interface StorageAdapter {
  /** Get all existing user emails for similarity comparison */
  getExistingEmails(): Promise<string[]>;
  /** Get existing IP addresses for the user */
  getExistingIPs(email: string): Promise<string[]>;
  /** Store user data for future comparisons */
  storeUserData(data: UserData): Promise<void>;
}

export interface UserData {
  email: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
}

export interface RiskScore {
  /** Overall risk score (0-100, where 100 is highest risk) */
  overall: number;
  /** Individual risk factors */
  factors: {
    emailSimilarity: RiskFactor;
    tempEmail: RiskFactor;
    ipRisk: RiskFactor;
    vpnDetection: RiskFactor;
  };
  /** Recommended action based on risk score */
  recommendation: 'allow' | 'flag' | 'block';
  /** Detailed explanation of the risk assessment */
  details: string[];
}

export interface RiskFactor {
  score: number; // 0-100
  detected: boolean;
  confidence: number; // 0-1
  details?: string;
}

export interface EmailSimilarityResult {
  similarEmails: Array<{
    email: string;
    similarity: number;
  }>;
  highestSimilarity: number;
  suspicious: boolean;
}

export interface IPAnalysisResult {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskScore: number;
  isp?: string;
  asn?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';