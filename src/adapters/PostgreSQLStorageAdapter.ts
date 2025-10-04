import { StorageAdapter, UserData } from '../types';

export interface PostgreSQLConfig {
  connectionString: string;
  tableName?: string;
}

export class PostgreSQLStorageAdapter implements StorageAdapter {
  private config: PostgreSQLConfig;
  private client: any;

  constructor(config: PostgreSQLConfig) {
    this.config = {
      tableName: 'trial_abuse_users',
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      const { Client } = require('pg');
      this.client = new Client({ connectionString: this.config.connectionString });
      await this.client.connect();
      
      // Create table if it doesn't exist
      await this.createTable();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  private async createTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address INET NOT NULL,
        user_agent TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_email ON ${this.config.tableName}(email);
      CREATE INDEX IF NOT EXISTS idx_ip_address ON ${this.config.tableName}(ip_address);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON ${this.config.tableName}(timestamp);
    `;

    await this.client.query(createTableQuery);
  }

  async getExistingEmails(): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `SELECT DISTINCT email FROM ${this.config.tableName}`;
    const result = await this.client.query(query);
    
    return result.rows.map((row: any) => row.email);
  }

  async getExistingIPs(email: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `SELECT DISTINCT ip_address FROM ${this.config.tableName} WHERE email = $1`;
    const result = await this.client.query(query, [email]);
    
    return result.rows.map((row: any) => row.ip_address);
  }

  async storeUserData(data: UserData): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `
      INSERT INTO ${this.config.tableName} (email, ip_address, user_agent, timestamp)
      VALUES ($1, $2, $3, $4)
    `;
    
    await this.client.query(query, [
      data.email,
      data.ipAddress,
      data.userAgent || null,
      data.timestamp
    ]);
  }

  async getUserHistory(email: string, limit: number = 10): Promise<UserData[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `
      SELECT email, ip_address, user_agent, timestamp 
      FROM ${this.config.tableName} 
      WHERE email = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    
    const result = await this.client.query(query, [email, limit]);
    
    return result.rows.map((row: any) => ({
      email: row.email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp
    }));
  }

  async getIPHistory(ipAddress: string, limit: number = 10): Promise<UserData[]> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `
      SELECT email, ip_address, user_agent, timestamp 
      FROM ${this.config.tableName} 
      WHERE ip_address = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    
    const result = await this.client.query(query, [ipAddress, limit]);
    
    return result.rows.map((row: any) => ({
      email: row.email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp
    }));
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    if (!this.client) {
      throw new Error('Not connected to database');
    }

    const query = `
      DELETE FROM ${this.config.tableName} 
      WHERE timestamp < NOW() - INTERVAL '${olderThanDays} days'
    `;
    
    const result = await this.client.query(query);
    return result.rowCount;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
    }
  }
}