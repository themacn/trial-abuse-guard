import { StorageAdapter, UserData } from '../types';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export class RedisStorageAdapter implements StorageAdapter {
  private config: RedisConfig;
  private client: any;

  constructor(config: RedisConfig) {
    this.config = {
      keyPrefix: 'trial_abuse:',
      db: 0,
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      const Redis = require('redis');
      this.client = Redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db
      });

      await this.client.connect();
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  async getExistingEmails(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const pattern = `${this.config.keyPrefix}email:*`;
    const keys = await this.client.keys(pattern);
    
    return keys.map((key: string) => 
      key.replace(`${this.config.keyPrefix}email:`, '')
    );
  }

  async getExistingIPs(email: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const key = `${this.config.keyPrefix}user_ips:${email}`;
    const ips = await this.client.sMembers(key);
    
    return ips || [];
  }

  async storeUserData(data: UserData): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const pipeline = this.client.multi();
    
    // Store email existence
    const emailKey = `${this.config.keyPrefix}email:${data.email}`;
    pipeline.set(emailKey, '1');
    pipeline.expire(emailKey, 60 * 60 * 24 * 90); // 90 days

    // Store user-IP mapping
    const userIPsKey = `${this.config.keyPrefix}user_ips:${data.email}`;
    pipeline.sAdd(userIPsKey, data.ipAddress);
    pipeline.expire(userIPsKey, 60 * 60 * 24 * 90); // 90 days

    // Store IP-user mapping
    const ipUsersKey = `${this.config.keyPrefix}ip_users:${data.ipAddress}`;
    pipeline.sAdd(ipUsersKey, data.email);
    pipeline.expire(ipUsersKey, 60 * 60 * 24 * 90); // 90 days

    // Store detailed user data
    const userDataKey = `${this.config.keyPrefix}user_data:${data.email}:${Date.now()}`;
    pipeline.hSet(userDataKey, {
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent || '',
      timestamp: data.timestamp.toISOString()
    });
    pipeline.expire(userDataKey, 60 * 60 * 24 * 90); // 90 days

    await pipeline.exec();
  }

  async getUserHistory(email: string, limit: number = 10): Promise<UserData[]> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const pattern = `${this.config.keyPrefix}user_data:${email}:*`;
    const keys = await this.client.keys(pattern);
    
    // Sort by timestamp (embedded in key) and limit
    const sortedKeys = keys
      .sort((a: string, b: string) => {
        const timestampA = parseInt(a.split(':').pop() || '0');
        const timestampB = parseInt(b.split(':').pop() || '0');
        return timestampB - timestampA; // Descending order
      })
      .slice(0, limit);

    const results: UserData[] = [];
    
    for (const key of sortedKeys) {
      const data = await this.client.hGetAll(key);
      if (data && data.email) {
        results.push({
          email: data.email,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent || undefined,
          timestamp: new Date(data.timestamp)
        });
      }
    }

    return results;
  }

  async getIPHistory(ipAddress: string, limit: number = 10): Promise<UserData[]> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    // Get all emails associated with this IP
    const ipUsersKey = `${this.config.keyPrefix}ip_users:${ipAddress}`;
    const emails = await this.client.sMembers(ipUsersKey);

    const results: UserData[] = [];

    for (const email of emails) {
      const history = await this.getUserHistory(email, limit);
      results.push(...history.filter(h => h.ipAddress === ipAddress));
    }

    // Sort by timestamp and limit
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return results.slice(0, limit);
  }

  async getEmailsByIP(ipAddress: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const key = `${this.config.keyPrefix}ip_users:${ipAddress}`;
    return await this.client.sMembers(key) || [];
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    if (!this.client) {
      throw new Error('Not connected to Redis');
    }

    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const pattern = `${this.config.keyPrefix}user_data:*`;
    const keys = await this.client.keys(pattern);
    
    let deletedCount = 0;

    for (const key of keys) {
      const timestamp = parseInt(key.split(':').pop() || '0');
      if (timestamp < cutoffTime) {
        await this.client.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}