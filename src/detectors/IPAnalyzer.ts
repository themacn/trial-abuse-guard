import axios from 'axios';
import { TrialAbuseConfig, IPAnalysisResult } from '../types';

export class IPAnalyzer {
  private config: TrialAbuseConfig;

  constructor(config: TrialAbuseConfig) {
    this.config = config;
  }

  async analyzeIP(ipAddress: string): Promise<IPAnalysisResult> {
    // Basic IP validation
    if (!this.isValidIP(ipAddress)) {
      throw new Error('Invalid IP address format');
    }

    // Check for local/private IPs
    if (this.isPrivateIP(ipAddress)) {
      return {
        ip: ipAddress,
        isVPN: false,
        isProxy: false,
        isTor: false,
        riskScore: 0,
        country: 'Local/Private'
      };
    }

    // Try multiple IP analysis services
    const results = await Promise.allSettled([
      this.analyzeWithIPQualityScore(ipAddress),
      this.analyzeWithFreeService(ipAddress),
      this.analyzeWithBackupService(ipAddress)
    ]);

    // Use the first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }

    // Fallback to basic analysis
    return this.basicIPAnalysis(ipAddress);
  }

  private async analyzeWithIPQualityScore(ipAddress: string): Promise<IPAnalysisResult | null> {
    const apiKey = this.config.apiKeys?.ipQualityScore;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://ipqualityscore.com/api/json/ip/${apiKey}/${ipAddress}`,
        {
          params: {
            strictness: 1,
            allow_public_access_points: true,
            fast: true,
            lighter_penalties: true,
            mobile: true
          },
          timeout: 5000
        }
      );

      const data = response.data;

      return {
        ip: ipAddress,
        country: data.country_code,
        region: data.region,
        city: data.city,
        isVPN: data.vpn || false,
        isProxy: data.proxy || false,
        isTor: data.tor || false,
        riskScore: this.calculateRiskScore({
          fraud_score: data.fraud_score,
          vpn: data.vpn,
          proxy: data.proxy,
          tor: data.tor,
          bot_status: data.bot_status,
          recent_abuse: data.recent_abuse
        }),
        isp: data.ISP,
        asn: data.ASN
      };
    } catch (error) {
      console.warn('IPQualityScore API failed:', error);
      return null;
    }
  }

  private async analyzeWithFreeService(ipAddress: string): Promise<IPAnalysisResult | null> {
    try {
      // Using ip-api.com (free service with rate limits)
      const response = await axios.get(
        `http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,regionName,city,isp,org,as,proxy,hosting`,
        { timeout: 5000 }
      );

      const data = response.data;

      if (data.status !== 'success') {
        return null;
      }

      return {
        ip: ipAddress,
        country: data.countryCode,
        region: data.regionName,
        city: data.city,
        isVPN: false, // Free service doesn't detect VPN
        isProxy: data.proxy || false,
        isTor: false,
        riskScore: this.calculateBasicRiskScore(data),
        isp: data.isp,
        asn: data.as
      };
    } catch (error) {
      console.warn('Free IP service failed:', error);
      return null;
    }
  }

  private async analyzeWithBackupService(ipAddress: string): Promise<IPAnalysisResult | null> {
    try {
      // Using ipapi.co as backup
      const response = await axios.get(
        `https://ipapi.co/${ipAddress}/json/`,
        { timeout: 5000 }
      );

      const data = response.data;

      return {
        ip: ipAddress,
        country: data.country_code,
        region: data.region,
        city: data.city,
        isVPN: false,
        isProxy: false,
        isTor: false,
        riskScore: this.calculateBasicRiskScore(data),
        isp: data.org,
        asn: data.asn
      };
    } catch (error) {
      console.warn('Backup IP service failed:', error);
      return null;
    }
  }

  private basicIPAnalysis(ipAddress: string): IPAnalysisResult {
    return {
      ip: ipAddress,
      isVPN: false,
      isProxy: false,
      isTor: false,
      riskScore: 0,
      country: 'Unknown'
    };
  }

  private calculateRiskScore(data: any): number {
    let score = 0;

    // Base fraud score from service
    if (data.fraud_score) {
      score += Math.min(data.fraud_score, 50);
    }

    // VPN/Proxy/Tor penalties
    if (data.vpn) score += 30;
    if (data.proxy) score += 25;
    if (data.tor) score += 40;

    // Bot detection
    if (data.bot_status) score += 20;

    // Recent abuse
    if (data.recent_abuse) score += 15;

    return Math.min(score, 100);
  }

  private calculateBasicRiskScore(data: any): number {
    let score = 0;

    // Check for hosting providers (higher risk)
    const hostingKeywords = ['hosting', 'server', 'datacenter', 'cloud', 'vps', 'digital ocean', 'aws', 'azure'];
    const orgLower = (data.org || data.isp || '').toLowerCase();
    
    if (hostingKeywords.some(keyword => orgLower.includes(keyword))) {
      score += 30;
    }

    // Check for proxy indicators
    if (data.proxy || orgLower.includes('proxy')) {
      score += 40;
    }

    return Math.min(score, 100);
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    
    if (parts.length !== 4) return false;

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;

    return false;
  }
}