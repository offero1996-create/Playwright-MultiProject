/**
 * File utility functions for BloomLink tests.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Calculate MD5 hash of a file for comparison.
 * @param filePath - Absolute path to the file
 * @returns MD5 hash string
 */
export function getFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

/**
 * Compare two files by their MD5 hash.
 * @param filePath1 - Path to first file
 * @param filePath2 - Path to second file
 * @returns True if files have matching hashes
 */
export function compareFiles(filePath1: string, filePath2: string): boolean {
  return getFileHash(filePath1) === getFileHash(filePath2);
}

/**
 * Get file size in bytes.
 * @param filePath - Path to the file
 * @returns File size in bytes
 */
export function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Check if a file exists.
 * @param filePath - Path to the file
 * @returns True if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Delete a file if it exists.
 * @param filePath - Path to the file
 * @returns True if file was deleted
 */
export function deleteFile(filePath: string): boolean {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Ensure a directory exists, creating it if necessary.
 * @param dirPath - Path to the directory
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
