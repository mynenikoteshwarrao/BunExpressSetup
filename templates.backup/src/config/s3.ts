import AWS from 'aws-sdk';
import { logger } from './logger';

interface S3Config {
  enabled: boolean;
  client?: AWS.S3;
  bucket?: string;
}

class S3ConfigManager {
  private config: S3Config = {
    enabled: false
  };

  constructor() {
    this.initializeS3();
  }

  private initializeS3(): void {
    const isS3Enabled = process.env.ENABLE_S3_UPLOADS === 'true';
    
    if (!isS3Enabled) {
      logger.info('S3 uploads disabled via environment variable');
      return;
    }

    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_S3_BUCKET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.warn(`S3 uploads disabled - Missing environment variables: ${missingVars.join(', ')}`);
      return;
    }

    try {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      });

      const s3Client = new AWS.S3({
        apiVersion: '2006-03-01'
      });

      this.config = {
        enabled: true,
        client: s3Client,
        bucket: process.env.AWS_S3_BUCKET
      };

      logger.info(`S3 uploads enabled - Bucket: ${process.env.AWS_S3_BUCKET}`);
    } catch (error) {
      logger.error('Failed to initialize S3 client:', error);
      this.config.enabled = false;
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getClient(): AWS.S3 | undefined {
    return this.config.client;
  }

  public getBucket(): string | undefined {
    return this.config.bucket;
  }

  public async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.isEnabled() || !this.config.client || !this.config.bucket) {
      throw new Error('S3 is not properly configured');
    }

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256'
    };

    try {
      const result = await this.config.client.upload(params).promise();
      return result.Location;
    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  public async deleteFile(key: string): Promise<void> {
    if (!this.isEnabled() || !this.config.client || !this.config.bucket) {
      throw new Error('S3 is not properly configured');
    }

    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.config.bucket,
      Key: key
    };

    try {
      await this.config.client.deleteObject(params).promise();
    } catch (error) {
      logger.error('S3 delete failed:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  public async getSignedUrl(key: string, expires: number = 3600): Promise<string> {
    if (!this.isEnabled() || !this.config.client || !this.config.bucket) {
      throw new Error('S3 is not properly configured');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: key,
      Expires: expires
    };

    try {
      return await this.config.client.getSignedUrlPromise('getObject', params);
    } catch (error) {
      logger.error('S3 signed URL generation failed:', error);
      throw new Error('Failed to generate signed URL');
    }
  }
}

export const s3Config = new S3ConfigManager();
export default s3Config;