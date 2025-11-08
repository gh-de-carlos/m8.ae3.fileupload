/**
 * File Utilities
 * 
 * Cross-cutting utility functions for file operations.
 * Provides reusable file-related functionality across the application.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { log } from './logger.js';

export class FileUtils {
  /**
   * Ensure directory exists, create if it doesn't
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        log.error(`Failed to create directory ${dirPath}: ${error.message}`);
        throw error;
      }
      return true;
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats safely
   */
  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch {
      return {
        exists: false,
        size: 0,
        isFile: false,
        isDirectory: false,
        createdAt: null,
        modifiedAt: null
      };
    }
  }

  /**
   * Delete file safely
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Move file from source to destination
   */
  static async moveFile(sourcePath, destPath) {
    try {
      await fs.rename(sourcePath, destPath);
      return true;
    } catch (error) {
      // If rename fails, try copy and delete
      try {
        await fs.copyFile(sourcePath, destPath);
        await fs.unlink(sourcePath);
        return true;
      } catch (copyError) {
        log.error(`Failed to move file from ${sourcePath} to ${destPath}: ${copyError.message}`);
        throw copyError;
      }
    }
  }

  /**
   * Copy file from source to destination
   */
  static async copyFile(sourcePath, destPath) {
    try {
      await fs.copyFile(sourcePath, destPath);
      return true;
    } catch (error) {
      log.error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read directory contents safely
   */
  static async readDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter(file => !file.startsWith('.')); // Exclude hidden files
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get directory size recursively
   */
  static async getDirectorySize(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      log.error(`Failed to get directory size for ${dirPath}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Clean up temporary files older than specified age
   */
  static async cleanupOldFiles(dirPath, maxAgeMinutes = 60) {
    try {
      const files = await fs.readdir(dirPath);
      const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.startsWith('.')) continue; // Skip hidden files
        
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      log.info(`Cleaned up ${cleanedCount} old files from ${dirPath}`);
      return cleanedCount;
    } catch (error) {
      log.error(`Failed to cleanup old files in ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate safe filename from string
   */
  static sanitizeFilename(filename) {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace unsafe chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Extract file extension with validation
   */
  static getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return '';
    }
    return filename.substring(lastDot).toLowerCase();
  }

  /**
   * Get filename without extension
   */
  static getFileNameWithoutExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return filename;
    }
    return filename.substring(0, lastDot);
  }

  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique filename with timestamp and random string
   */
  static generateUniqueFilename(originalName, extension) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseName = this.sanitizeFilename(this.getFileNameWithoutExtension(originalName));
    
    return `${timestamp}_${random}_${baseName}${extension}`;
  }

  /**
   * Validate file path security (prevent directory traversal)
   */
  static isSecureFilePath(filePath, allowedDir) {
    const normalizedPath = path.normalize(filePath);
    const normalizedAllowedDir = path.normalize(allowedDir);
    
    return normalizedPath.startsWith(normalizedAllowedDir) && 
           !normalizedPath.includes('..') &&
           !path.isAbsolute(normalizedPath.replace(normalizedAllowedDir, ''));
  }
}

export default FileUtils;