/**
 * Evidence file storage on AWS S3.
 *
 * Needs AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and AWS_S3_BUCKET.
 * File type and size checks live in ./validate-upload.ts. Malware scanning is
 * done by AWS (GuardDuty Malware Protection for S3) on the bucket, not here.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface UploadResult {
  url: string
  key: string
  size: number
  mimeType: string
}

class StorageService {
  private s3Client: S3Client | null = null

  constructor() {
    this.initializeS3()
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
    const key = folder
      ? `${folder}/${timestamp}-${sanitizedFileName}`
      : `${timestamp}-${sanitizedFileName}`

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
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
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate presigned URL for file access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized')
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
    if (!this.s3Client) {
      throw new Error('S3 client not initialized')
    }

    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET not configured')
    }

    await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  }

  /**
   * Recover the object key from a URL produced by uploadToS3. Returns null for
   * URLs that don't point at our bucket (e.g. external evidence links).
   */
  keyFromUrl(url: string): string | null {
    const bucket = process.env.AWS_S3_BUCKET
    if (!bucket) return null
    try {
      const parsed = new URL(url)
      if (!parsed.hostname.startsWith(`${bucket}.s3.`)) return null
      return decodeURIComponent(parsed.pathname.replace(/^\//, '')) || null
    } catch {
      return null
    }
  }
}

export const storageService = new StorageService()
