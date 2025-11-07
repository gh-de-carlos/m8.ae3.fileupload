#!/usr/bin/env node
/**
 * Stop Script - Gracefully shutdown the server using COOL logger
 */

import { log } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function stopServer() {
  try {
    log.stop('Stopping server...');
    
    // Try to kill the server process
    const { stdout } = await execAsync('pgrep -f "node.*server.js"');
    
    if (stdout.trim()) {
      // Server is running, kill it
      await execAsync('pkill -f "node.*server.js"');
      log.ok('Server stopped successfully');
      
      // Wait a moment to ensure cleanup
      setTimeout(() => {
        log.pass('Graceful shutdown completed');
        process.exit(0);
      }, 1000);
    }
    
  } catch (error) {
    // No process found or already stopped
    log.ok('Server already stopped');
    process.exit(0);
  }
}

stopServer();