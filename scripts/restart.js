#!/usr/bin/env node
/**
 * Restart Script - Stop and start server using COOL logger
 */

import { log } from '../utils/logger.js';
import { exec } from 'child_process';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function restartServer() {
  try {
    log.info('Restarting server...');
    
    // First, stop the server
    log.stop('Stopping current server instance...');
    
    try {
      const { stdout } = await execAsync('pgrep -f "node.*server.js"');
      if (stdout.trim()) {
        await execAsync('pkill -f "node.*server.js"');
        log.ok('Server stopped');
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch {
      log.info('No running server found');
    }
    
    // Start the server
    log.info('Starting server...');
    
    // Spawn new server process
    const serverProcess = spawn('npm', ['start'], {
      stdio: 'inherit',
      detached: true,
      cwd: process.cwd()
    });
    
    // Detach the process so it continues running
    serverProcess.unref();
    
    log.pass('Server restart initiated');
    log.info('Check status with: npm run status');
    
  } catch (error) {
    log.error(`Restart failed: ${error.message}`);
    process.exit(1);
  }
}

restartServer();