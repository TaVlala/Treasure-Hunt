// Password hashing and comparison using bcryptjs.
// Always use these helpers — never call bcrypt directly in route handlers.

import bcrypt from 'bcryptjs';

// 12 rounds: ~250ms on modern hardware — strong enough without being too slow
const SALT_ROUNDS = 12;

// Hashes a plaintext password for storage
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Returns true if the plaintext password matches the stored hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
