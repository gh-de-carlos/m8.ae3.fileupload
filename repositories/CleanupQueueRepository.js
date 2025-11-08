/**
 * Cleanup Queue Repository
 * 
 * Data access layer for cleanup_queue table.
 * Manages files that need cleanup due to failed transactions or inconsistent states.
 * Supports the sophisticated cleanup mechanism described in requirements.
 */

import db from '../config/database.js';
import { log } from '../utils/logger.js';

export class CleanupQueueRepository {
  /**
   * Add file to cleanup queue
   */
  static async add(filename) {
    const query = `
      INSERT INTO cleanup_queue (name, fail_time, delete_state)
      VALUES ($1, CURRENT_TIMESTAMP, FALSE)
      ON CONFLICT (name) 
      DO UPDATE SET 
        fail_time = CURRENT_TIMESTAMP,
        delete_state = FALSE
      RETURNING *
    `;
    
    try {
      log.warn(`Adding to cleanup queue: ${filename}`);
      const result = await db.pool.query(query, [filename]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to add to cleanup queue');
      }
      
      log.info(`Added to cleanup queue successfully: ${filename}`);
      return result.rows[0];
      
    } catch (error) {
      log.error(`Failed to add to cleanup queue: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get all pending cleanup items (delete_state = FALSE)
   */
  static async getPending(limit = 100) {
    const query = `
      SELECT * FROM cleanup_queue 
      WHERE delete_state = FALSE 
      ORDER BY fail_time ASC 
      LIMIT $1
    `;
    
    try {
      log.info(`Retrieving pending cleanup items (limit: ${limit})`);
      const result = await db.pool.query(query, [limit]);
      
      log.info(`Found ${result.rows.length} pending cleanup items`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to get pending cleanup items: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get all cleanup items (processed and pending)
   */
  static async getAll(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM cleanup_queue 
      ORDER BY fail_time DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      log.info(`Retrieving all cleanup items (limit: ${limit}, offset: ${offset})`);
      const result = await db.pool.query(query, [limit, offset]);
      
      log.info(`Found ${result.rows.length} cleanup items`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to get all cleanup items: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Mark cleanup item as processed (success or failure)
   */
  static async markAsProcessed(filename, success = true) {
    const query = `
      UPDATE cleanup_queue 
      SET delete_state = $1
      WHERE name = $2
      RETURNING *
    `;
    
    try {
      log.info(`Marking cleanup item as processed: ${filename} (success: ${success})`);
      const result = await db.pool.query(query, [success, filename]);
      
      if (result.rows.length === 0) {
        log.warn(`Cleanup item not found: ${filename}`);
        return null;
      }
      
      log.info(`Cleanup item marked as processed: ${filename}`);
      return result.rows[0];
      
    } catch (error) {
      log.error(`Failed to mark cleanup item as processed: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Check if file is in cleanup queue
   */
  static async isInQueue(filename) {
    const query = `
      SELECT * FROM cleanup_queue 
      WHERE name = $1
    `;
    
    try {
      const result = await db.pool.query(query, [filename]);
      return result.rows.length > 0 ? result.rows[0] : null;
      
    } catch (error) {
      log.error(`Failed to check cleanup queue: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Remove file from cleanup queue (for successful cleanup)
   */
  static async remove(filename) {
    const query = `
      DELETE FROM cleanup_queue 
      WHERE name = $1
      RETURNING *
    `;
    
    try {
      log.info(`Removing from cleanup queue: ${filename}`);
      const result = await db.pool.query(query, [filename]);
      
      if (result.rows.length === 0) {
        log.warn(`Cleanup item not found for removal: ${filename}`);
        return null;
      }
      
      log.info(`Removed from cleanup queue successfully: ${filename}`);
      return result.rows[0];
      
    } catch (error) {
      log.error(`Failed to remove from cleanup queue: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get cleanup queue statistics
   */
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN delete_state = FALSE THEN 1 ELSE 0 END) as pending_items,
        SUM(CASE WHEN delete_state = TRUE THEN 1 ELSE 0 END) as processed_items,
        MIN(fail_time) as oldest_failure,
        MAX(fail_time) as newest_failure
      FROM cleanup_queue
    `;
    
    try {
      log.info('Retrieving cleanup queue statistics');
      const result = await db.pool.query(query);
      
      const stats = result.rows[0];
      log.info(`Cleanup queue stats: ${stats.total_items} total, ${stats.pending_items} pending`);
      return stats;
      
    } catch (error) {
      log.error(`Failed to get cleanup queue stats: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get old processed items for archival (items processed more than X days ago)
   */
  static async getOldProcessedItems(daysOld = 30, limit = 100) {
    const query = `
      SELECT * FROM cleanup_queue 
      WHERE delete_state = TRUE 
      AND fail_time < NOW() - INTERVAL '${daysOld} days'
      ORDER BY fail_time ASC 
      LIMIT $1
    `;
    
    try {
      log.info(`Retrieving old processed items (${daysOld} days old, limit: ${limit})`);
      const result = await db.pool.query(query, [limit]);
      
      log.info(`Found ${result.rows.length} old processed items`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to get old processed items: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Archive old processed items (delete them from cleanup_queue)
   * This would typically be called by a scheduled maintenance job
   */
  static async archiveOldProcessedItems(daysOld = 30) {
    const query = `
      DELETE FROM cleanup_queue 
      WHERE delete_state = TRUE 
      AND fail_time < NOW() - INTERVAL '${daysOld} days'
    `;
    
    try {
      log.info(`Archiving processed items older than ${daysOld} days`);
      const result = await db.pool.query(query);
      
      const archivedCount = result.rowCount;
      log.info(`Archived ${archivedCount} old processed items`);
      return archivedCount;
      
    } catch (error) {
      log.error(`Failed to archive old processed items: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }

  /**
   * Get items that have failed multiple times (for alerting)
   */
  static async getRepeatedFailures(failureThreshold = 5) {
    // This would require additional tracking, but for now we'll identify
    // items that have been in the queue for a long time
    const query = `
      SELECT * FROM cleanup_queue 
      WHERE delete_state = FALSE 
      AND fail_time < NOW() - INTERVAL '1 hour'
      ORDER BY fail_time ASC
    `;
    
    try {
      log.info('Retrieving items with repeated failures');
      const result = await db.pool.query(query);
      
      log.info(`Found ${result.rows.length} items with potential repeated failures`);
      return result.rows;
      
    } catch (error) {
      log.error(`Failed to get repeated failures: ${error.message}`);
      const dbError = new Error(`Database error: ${error.message}`);
      dbError.statusCode = 500;
      throw dbError;
    }
  }
}

export default CleanupQueueRepository;