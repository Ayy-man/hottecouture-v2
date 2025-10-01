import { createClient } from '@/lib/supabase/client'

export type StorageBucket = 'photos' | 'labels' | 'receipts' | 'docs'

export interface StorageFile {
  name: string
  bucket: StorageBucket
  path: string
  size?: number
  mimeType?: string
  lastModified?: string
}

export interface UploadOptions {
  bucket: StorageBucket
  path: string
  file: File
  options?: {
    cacheControl?: string
    upsert?: boolean
  }
}

export interface SignedUrlOptions {
  bucket: StorageBucket
  path: string
  expiresIn?: number
}

export class StorageService {
  private supabase = createClient()

  /**
   * Upload a file to storage
   */
  async uploadFile({ bucket, path, file, options }: UploadOptions) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    return data
  }

  /**
   * Get a signed URL for a file
   */
  async getSignedUrl({ bucket, path, expiresIn = 3600 }: SignedUrlOptions) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Get public URL for a file (if bucket is public)
   */
  getPublicUrl(bucket: StorageBucket, path: string) {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * List files in a bucket
   */
  async listFiles(bucket: StorageBucket, path?: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(path)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: StorageBucket, path: string) {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  /**
   * Download a file from storage
   */
  async downloadFile(bucket: StorageBucket, path: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    return data
  }

  /**
   * Generate a unique file path with timestamp
   */
  generateFilePath(bucket: StorageBucket, originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    
    const fileName = `${baseName}_${timestamp}_${randomId}.${extension}`
    
    if (prefix) {
      return `${prefix}/${fileName}`
    }
    
    return fileName
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Validate file type for specific bucket
   */
  validateFileType(file: File, bucket: StorageBucket): boolean {
    const allowedTypes: Record<StorageBucket, string[]> = {
      photos: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      labels: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      receipts: ['image/jpeg', 'image/png', 'application/pdf'],
      docs: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    }

    return allowedTypes[bucket].includes(file.type)
  }

  /**
   * Get maximum file size for bucket (in bytes)
   */
  getMaxFileSize(bucket: StorageBucket): number {
    const maxSizes: Record<StorageBucket, number> = {
      photos: 10 * 1024 * 1024, // 10MB
      labels: 5 * 1024 * 1024,  // 5MB
      receipts: 5 * 1024 * 1024, // 5MB
      docs: 20 * 1024 * 1024,   // 20MB
    }

    return maxSizes[bucket]
  }
}

export const storageService = new StorageService()
