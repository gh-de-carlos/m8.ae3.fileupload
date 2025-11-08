/**
 * File Storage Service
 * 
 * Handles file storage operations including unique filename generation,
 * file writing, and cleanup operations. Implements transactional approach
 * with rollback capability.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger.js';

// ES Modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileStorageService {
  static UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

  /**
   * Generate unique filename using timestamp + UUID
   */
  static generateUniqueFilename(originalExtension) {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const filename = `${timestamp}_${uuid}${originalExtension}`;
    
    log.info(`Generated unique filename: ${filename}`);
    return filename;
  }

  /**
   * Save file to disk with transactional approach
   */
  static async saveFile(buffer, filename) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    
    try {
      // Ensure upload directory exists
      await this.ensureUploadDirectory();
      
      log.info(`Saving file to: ${filePath}`);
      await fs.writeFile(filePath, buffer);
      
      // Verify file was written correctly
      const stats = await fs.stat(filePath);
      if (stats.size !== buffer.length) {
        throw new Error('File size mismatch after write');
      }
      
      log.pass(`File saved successfully: ${filename} (${stats.size} bytes)`);
      return {
        success: true,
        filePath,
        size: stats.size
      };
      
    } catch (error) {
      log.error(`Failed to save file ${filename}: ${error.message}`);
      
      // Attempt cleanup if partial write occurred
      try {
        await this.deleteFile(filename);
      } catch (cleanupError) {
        log.warn(`Failed to cleanup partial file: ${cleanupError.message}`);
      }
      
      const storageError = new Error(`File storage failed: ${error.message}`);
      storageError.statusCode = 500;
      throw storageError;
    }
  }

  /**
   * Delete file from disk
   */
  static async deleteFile(filename) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    
    try {
      log.info(`Deleting file: ${filePath}`);
      await fs.unlink(filePath);
      log.pass(`File deleted successfully: ${filename}`);
      return true;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        log.warn(`File not found for deletion: ${filename}`);
        return false; // File doesn't exist, consider it "deleted"
      }
      
      log.error(`Failed to delete file ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filename) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(filename) {
    const filePath = path.join(this.UPLOAD_DIR, filename);
    
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        size: 0,
        createdAt: null,
        modifiedAt: null
      };
    }
  }

  /**
   * Ensure upload directory exists
   */
  static async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        log.error(`Failed to create upload directory: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Generate relative path for database storage
   */
  static getRelativePath(filename) {
    return `/uploads/${filename}`;
  }

  /**
   * Get full file path
   */
  static getFullPath(filename) {
    return path.join(this.UPLOAD_DIR, filename);
  }

  /**
   * Get upload directory path
   */
  static getUploadDirectory() {
    return this.UPLOAD_DIR;
  }

  /**
   * Cleanup orphaned files (files not in database)
   * This would typically be called by a scheduled job
   */
  static async cleanupOrphanedFiles(validFilenames) {
    try {
      log.info('Starting orphaned file cleanup');
      
      const files = await fs.readdir(this.UPLOAD_DIR);
      let cleanedCount = 0;
      
      for (const file of files) {
        // Skip .gitkeep and other system files
        if (file.startsWith('.')) continue;
        
        if (!validFilenames.includes(file)) {
          await this.deleteFile(file);
          cleanedCount++;
        }
      }
      
      log.info(`Orphaned file cleanup completed: ${cleanedCount} files removed`);
      return cleanedCount;
      
    } catch (error) {
      log.error(`Orphaned file cleanup failed: ${error.message}`);
      throw error;
    }
  }
}

export default FileStorageService;