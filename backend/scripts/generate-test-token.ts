/**
 * backend/scripts/generate-test-token.ts
 * 
 * Generates a test JWT token for QA testing without OIDC
 * 
 * Usage:
 *   bun run scripts/generate-test-token.ts
 * 
 * Or with custom user:
 *   USER_EMAIL=test@example.com USER_ID=custom-id bun run scripts/generate-test-token.ts
 */

import { SignJWT } from 'jose';

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-min-32-characters-long-for-testing!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Test user configuration
const TEST_USER = {
  id: process.env.USER_ID || 'test-user-' + Date.now(),
  email: process.env.USER_EMAIL || 'tester@fammail.local',
  emailVerified: true,
  firstName: process.env.USER_FIRST_NAME || 'Test',
  lastName: process.env.USER_LAST_NAME || 'User',
  oidcSub: 'test-sub-' + Date.now(),
  oidcIssuer: 'test-issuer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function generateToken(userId: string, secret: string, expiresIn: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return await new SignJWT({ sub: userId, email: TEST_USER.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

async function main() {
  console.log('==============================================');
  console.log('  FamMail Test Token Generator');
  console.log('==============================================');
  console.log('');

  // Generate access token
  const accessToken = await generateToken(TEST_USER.id, JWT_SECRET, JWT_EXPIRES_IN);
  
  // Generate refresh token
  const refreshToken = await generateToken(TEST_USER.id, JWT_SECRET, JWT_REFRESH_EXPIRES_IN);

  // Calculate expiration
  const expiresAt = new Date(Date.now() + parseExpiry(JWT_EXPIRES_IN));
  const refreshExpiresAt = new Date(Date.now() + parseExpiry(JWT_REFRESH_EXPIRES_IN));

  console.log('Test User:');
  console.log('-----------');
  console.log(`  ID:             ${TEST_USER.id}`);
  console.log(`  Email:          ${TEST_USER.email}`);
  console.log(`  Name:           ${TEST_USER.firstName} ${TEST_USER.lastName}`);
  console.log(`  Email Verified: ${TEST_USER.emailVerified}`);
  console.log('');

  console.log('Token Details:');
  console.log('--------------');
  console.log(`  Access Token Expires:  ${JWT_EXPIRES_IN} (${expiresAt.toISOString()})`);
  console.log(`  Refresh Token Expires: ${JWT_REFRESH_EXPIRES_IN} (${refreshExpiresAt.toISOString()})`);
  console.log('');

  console.log('Access Token (JWT):');
  console.log('-------------------');
  console.log(accessToken);
  console.log('');

  console.log('Refresh Token:');
  console.log('--------------');
  console.log(refreshToken);
  console.log('');

  console.log('Usage Instructions:');
  console.log('-------------------');
  console.log('');
  console.log('1. Browser Console (paste and press Enter):');
  console.log('');
  console.log('   localStorage.setItem("auth_token", "' + accessToken + '");');
  console.log('   location.reload();');
  console.log('');
  console.log('2. Authorization Header (for API calls):');
  console.log('');
  console.log('   Authorization: Bearer ' + accessToken);
  console.log('');
  console.log('3. Fetch Example:');
  console.log('');
  console.log('   fetch("http://localhost:8484/api/drafts", {');
  console.log('     headers: { "Authorization": "Bearer ' + accessToken + '" }');
  console.log('   })');
  console.log('');
  console.log('4. curl Example:');
  console.log('');
  console.log('   curl -H "Authorization: Bearer ' + accessToken + '" \\');
  console.log('        http://localhost:8484/api/drafts');
  console.log('');

  // Output in JSON format for programmatic use
  console.log('JSON Output (for scripts):');
  console.log('--------------------------');
  console.log(JSON.stringify({
    user: TEST_USER,
    accessToken: accessToken,
    refreshToken: refreshToken,
    expiresAt: expiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
    header: `Authorization: Bearer ${accessToken}`,
  }, null, 2));
  console.log('');

  console.log('==============================================');
  console.log('  Token Generation Complete!');
  console.log('==============================================');
}

function parseExpiry(expiresIn: string): number {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);
  
  const multipliers: Record<string, number> = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
  };
  
  return value * (multipliers[unit] || multipliers['h']);
}

main().catch(console.error);
