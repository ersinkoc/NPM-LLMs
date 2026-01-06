#!/usr/bin/env node
/**
 * CLI entry point for npm-llms
 * @module cli
 */

import { parseArgs } from './args.js';
import { executeCommand } from './commands.js';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    // Parse arguments (skip node and script path)
    const args = parseArgs(process.argv.slice(2));

    // Execute command
    await executeCommand(args);
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI
main();
