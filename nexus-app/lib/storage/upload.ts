/**
 * File Upload Service
 * 
 * Handles file uploads to S3 or Cloudinary
 * 
 * TODO: Choose storage provider (S3 or Cloudinary)
 * TODO: Add credentials to .env:
 * - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET (for S3)
 * - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (for Cloudinary)
 * 
 * TODO: Implement file validation
 * TODO: Implement virus scanning
 * TODO: Implement file size limits
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type StorageProvider = 's3' | 'cloudinary'

export interface UploadResult {
  url: string
  key: string
  size: number
  mimeType: string
}

class StorageService {
  private provider: StorageProvider
  private s3Client: S3Client | null = null

  constructor() {
    // TODO: Make configurable via env var
    this.provider = (process.env.STORAGE_PROVIDER as StorageProvider) || 's3'

    if (this.provider === 's3') {
      this.initializeS3()
    }
  }

  private initializeS3() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || 'us-east-1'

    if (!accessKeyId || !secretAccessKey) {
      console.warn('⚠️  AWS credentials not configured. File uploads will not work.')
      return
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadResult> {
    if (this.provider === 's3') {
      return this.uploadToS3(file, fileName, mimeType, folder)
    } else if (this.provider === 'cloudinary') {
      return this.uploadToCloudinary(file, fileName, mimeType, folder)
    }

    throw new Error(`Storage provider ${this.provider} not implemented`)
  }

  private async uploadToS3(
    file: Buffer | Uint8Array,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized')
    }

    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET not configured')
    }

    // Generate unique key
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = folder ? `${folder}/${timestamp}-${sanitizedFileName}` : `${timestamp}-${sanitizedFileName}`

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
        // TODO: Add ACL and encryption settings
        // ACL: 'private',
        // ServerSideEncryption: 'AES256',
      })

      await this.s3Client.send(command)

      // Generate public URL or presigned URL
      const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

      return {
        url,
        key,
        size: file.length,
        mimeType,
      }
    } catch (error) {
      console.error('S3 upload error:', error)
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async uploadToCloudinary(
    file: Buffer | Uint8Array,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadResult> {
    // TODO: Implement Cloudinary upload
    // const cloudinary = require('cloudinary').v2
    // cloudinary.config({
    //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    //   api_key: process.env.CLOUDINARY_API_KEY,
    //   api_secret: process.env.CLOUDINARY_API_SECRET,
    // })
    // 
    // const result = await cloudinary.uploader.upload(file, {
    //   folder: folder || 'skill-passport',
    //   resource_type: 'auto',
    // })
    // 
    // return {
    //   url: result.secure_url,
    //   key: result.public_id,
    //   size: result.bytes,
    //   mimeType: result.format,
    // }

    throw new Error('Cloudinary upload not yet implemented')
  }

  /**
   * Generate presigned URL for file access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.provider !== 's3' || !this.s3Client) {
      throw new Error('Presigned URLs only supported for S3')
    }

    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET not configured')
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    return getSignedUrl(this.s3Client, command, { expiresIn })
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    // TODO: Implement file deletion
    throw new Error('File deletion not yet implemented')
  }
}

export const storageService = new StorageService()
