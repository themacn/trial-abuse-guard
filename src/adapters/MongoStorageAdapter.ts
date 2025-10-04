import { StorageAdapter, UserData } from '../types';

export interface MongoConfig {
  connectionString: string;
  databaseName: string;
  collectionName?: string;
}

export class MongoStorageAdapter implements StorageAdapter {
  private config: MongoConfig;
  private db: any;
  private collection: any;

  constructor(config: MongoConfig) {
    this.config = {
      collectionName: 'trial_abuse_users',
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(this.config.connectionString);
      await client.connect();
      this.db = client.db(this.config.databaseName);
      this.collection = this.db.collection(this.config.collectionName);
      
      // Create indexes for performance
      await this.collection.createIndex({ email: 1 });
      await this.collection.createIndex({ ipAddress: 1 });
      await this.collection.createIndex({ timestamp: 1 });
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  async getExistingEmails(): Promise<string[]> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    const users = await this.collection.distinct('email');
    return users;
  }

  async getExistingIPs(email: string): Promise<string[]> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    const users = await this.collection.find(
      { email },
      { projection: { ipAddress: 1 } }
    ).toArray();

    return users.map((user: any) => user.ipAddress);
  }

  async storeUserData(data: UserData): Promise<void> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    await this.collection.insertOne({
      ...data,
      createdAt: new Date()
    });
  }

  async getUserHistory(email: string, limit: number = 10): Promise<UserData[]> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    const history = await this.collection.find(
      { email },
      { 
        sort: { timestamp: -1 },
        limit 
      }
    ).toArray();

    return history.map((doc: any) => ({
      email: doc.email,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      timestamp: doc.timestamp
    }));
  }

  async getIPHistory(ipAddress: string, limit: number = 10): Promise<UserData[]> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    const history = await this.collection.find(
      { ipAddress },
      { 
        sort: { timestamp: -1 },
        limit 
      }
    ).toArray();

    return history.map((doc: any) => ({
      email: doc.email,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      timestamp: doc.timestamp
    }));
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    if (!this.collection) {
      throw new Error('Not connected to database');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.collection.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }
}