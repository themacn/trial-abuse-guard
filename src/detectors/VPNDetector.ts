import axios from 'axios';
import { TrialAbuseConfig, IPAnalysisResult } from '../types';

export class VPNDetector {
  private config: TrialAbuseConfig;
  private knownVPNRanges: string[] = [];

  constructor(config: TrialAbuseConfig) {
    this.config = config;
    this.loadKnownVPNRanges();
  }

  async detectVPN(ipAddress: string): Promise<IPAnalysisResult> {
    // Try multiple VPN detection services
    const results = await Promise.allSettled([
      this.detectWithVPNAPI(ipAddress),
      this.detectWithProxyCheck(ipAddress),
      this.detectWithIPHub(ipAddress),
      this.detectLocally(ipAddress)
    ]);

    // Combine results from multiple sources
    let isVPN = false;
    let isProxy = false;
    let isTor = false;
    let maxRiskScore = 0;
    let bestResult: Partial<IPAnalysisResult> = {};

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const detection = result.value;
        isVPN = isVPN || detection.isVPN;
        isProxy = isProxy || detection.isProxy;
        isTor = isTor || detection.isTor;
        maxRiskScore = Math.max(maxRiskScore, detection.riskScore);
        
        if (detection.country && !bestResult.country) {
          bestResult = { ...detection };
        }
      }
    }

    return {
      ip: ipAddress,
      country: bestResult.country,
      region: bestResult.region,
      city: bestResult.city,
      isVPN,
      isProxy,
      isTor,
      riskScore: maxRiskScore,
      isp: bestResult.isp,
      asn: bestResult.asn
    };
  }

  private async detectWithVPNAPI(ipAddress: string): Promise<IPAnalysisResult | null> {
    const apiKey = this.config.apiKeys?.vpnapi;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://vpnapi.io/api/${ipAddress}?key=${apiKey}`,
        { timeout: 5000 }
      );

      const data = response.data;

      return {
        ip: ipAddress,
        country: data.location?.country_code,
        region: data.location?.region,
        city: data.location?.city,
        isVPN: data.security?.vpn || false,
        isProxy: data.security?.proxy || false,
        isTor: data.security?.tor || false,
        riskScore: this.calculateVPNRiskScore(data.security),
        isp: data.network?.autonomous_system_organization,
        asn: data.network?.autonomous_system_number?.toString()
      };
    } catch (error) {
      console.warn('VPNAPI failed:', error);
      return null;
    }
  }

  private async detectWithProxyCheck(ipAddress: string): Promise<IPAnalysisResult | null> {
    const apiKey = this.config.apiKeys?.proxyCheck;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `https://proxycheck.io/v2/${ipAddress}?key=${apiKey}&vpn=1&asn=1&risk=1`,
        { timeout: 5000 }
      );

      const data = response.data[ipAddress];
      if (!data) return null;

      return {
        ip: ipAddress,
        country: data.country,
        region: data.region,
        city: data.city,
        isVPN: data.proxy === 'yes' && data.type?.includes('VPN'),
        isProxy: data.proxy === 'yes',
        isTor: data.proxy === 'yes' && data.type?.includes('TOR'),
        riskScore: data.risk || 0,
        isp: data.isp,
        asn: data.asn
      };
    } catch (error) {
      console.warn('ProxyCheck failed:', error);
      return null;
    }
  }

  private async detectWithIPHub(ipAddress: string): Promise<IPAnalysisResult | null> {
    try {
      // IPHub.info free tier
      const response = await axios.get(
        `http://v2.api.iphub.info/ip/${ipAddress}`,
        {
          headers: {
            'X-Key': 'free' // Free tier key
          },
          timeout: 5000
        }
      );

      const data = response.data;

      return {
        ip: ipAddress,
        country: data.countryCode,
        isVPN: data.block === 1 || data.block === 2,
        isProxy: data.block === 1,
        isTor: false, // IPHub doesn't specifically detect Tor
        riskScore: data.block === 1 ? 80 : data.block === 2 ? 60 : 0,
        isp: data.isp
      };
    } catch (error) {
      console.warn('IPHub failed:', error);
      return null;
    }
  }

  private async detectLocally(ipAddress: string): Promise<IPAnalysisResult> {
    // Local detection based on known patterns
    const isVPN = this.checkKnownVPNRanges(ipAddress);
    const isHosting = this.isHostingProvider(ipAddress);

    return {
      ip: ipAddress,
      isVPN: isVPN || isHosting,
      isProxy: isHosting,
      isTor: false,
      riskScore: isVPN ? 70 : isHosting ? 50 : 0
    };
  }

  private loadKnownVPNRanges(): void {
    // Common VPN provider IP ranges (simplified list)
    this.knownVPNRanges = [
      // NordVPN ranges (examples)
      '89.187.160.0/19',
      '193.29.104.0/22',
      
      // ExpressVPN ranges (examples)
      '103.231.88.0/23',
      '149.248.0.0/16',
      
      // Popular hosting providers often used for VPNs
      '104.16.0.0/12', // Cloudflare
      '162.158.0.0/15', // Cloudflare
      '192.81.128.0/17', // DigitalOcean
      '167.71.0.0/16', // DigitalOcean
      '134.195.0.0/16', // OVH
      '51.254.0.0/15' // OVH
    ];
  }

  private checkKnownVPNRanges(ipAddress: string): boolean {
    // Simple IP range checking (in production, use a proper CIDR library)
    const ipParts = ipAddress.split('.').map(Number);
    
    for (const range of this.knownVPNRanges) {
      if (this.isIPInRange(ipAddress, range)) {
        return true;
      }
    }

    return false;
  }

  private isIPInRange(ip: string, cidr: string): boolean {
    // Simplified CIDR checking (use ip-range-check library in production)
    const [rangeIP, prefixLength] = cidr.split('/');
    const rangeParts = rangeIP.split('.').map(Number);
    const ipParts = ip.split('.').map(Number);
    const prefix = parseInt(prefixLength);

    const mask = 0xFFFFFFFF << (32 - prefix);
    
    const rangeInt = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
    const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];

    return (rangeInt & mask) === (ipInt & mask);
  }

  private isHostingProvider(ipAddress: string): boolean {
    // Check for common hosting provider IP patterns
    const ipParts = ipAddress.split('.').map(Number);
    
    // Common hosting provider ranges (simplified)
    const hostingRanges = [
      { start: [192, 81, 128, 0], end: [192, 81, 255, 255] }, // DigitalOcean
      { start: [167, 71, 0, 0], end: [167, 71, 255, 255] },   // DigitalOcean
      { start: [104, 16, 0, 0], end: [104, 31, 255, 255] },   // Cloudflare
      { start: [13, 52, 0, 0], end: [13, 57, 255, 255] },     // AWS
      { start: [52, 0, 0, 0], end: [52, 95, 255, 255] }       // AWS
    ];

    for (const range of hostingRanges) {
      if (this.isIPInHostingRange(ipParts, range.start, range.end)) {
        return true;
      }
    }

    return false;
  }

  private isIPInHostingRange(ip: number[], start: number[], end: number[]): boolean {
    for (let i = 0; i < 4; i++) {
      if (ip[i] < start[i] || ip[i] > end[i]) {
        return false;
      }
    }
    return true;
  }

  private calculateVPNRiskScore(security: any): number {
    let score = 0;

    if (security?.vpn) score += 70;
    if (security?.proxy) score += 60;
    if (security?.tor) score += 90;
    if (security?.relay) score += 50;

    return Math.min(score, 100);
  }

  /**
   * Add custom VPN IP ranges
   */
  addVPNRange(cidr: string): void {
    this.knownVPNRanges.push(cidr);
  }

  /**
   * Bulk add VPN ranges
   */
  addVPNRanges(cidrs: string[]): void {
    this.knownVPNRanges.push(...cidrs);
  }
}