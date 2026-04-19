/**
 * backend/scripts/seed-test-user.ts
 * 
 * Seeds a test user in the database for QA testing
 * 
 * Usage:
 *   bun run scripts/seed-test-user.ts
 */

import { Database } from '../src/database';

// Test user configuration
const TEST_USER = {
  id: process.env.USER_ID || 'test-user-123',
  oidcSub: process.env.USER_OIDC_SUB || 'test-sub-123',
  oidcIssuer: process.env.USER_OIDC_ISSUER || 'test-issuer',
  email: process.env.USER_EMAIL || 'tester@fammail.local',
  emailVerified: true,
  firstName: process.env.USER_FIRST_NAME || 'Test',
  lastName: process.env.USER_LAST_NAME || 'User',
  avatarUrl: undefined,
};

const DATABASE_PATH = process.env.DATABASE_PATH || './data/fammail.db';

async function main() {
  console.log('==============================================');
  console.log('  FamMail Test User Seeder');
  console.log('==============================================');
  console.log('');

  console.log('Database path:', DATABASE_PATH);
  console.log('');

  let db: Database;
  
  try {
    db = new Database(DATABASE_PATH);
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  console.log('');
  console.log('Test User to seed:');
  console.log('-------------------');
  console.log(`  ID:            ${TEST_USER.id}`);
  console.log(`  OIDC Sub:      ${TEST_USER.oidcSub}`);
  console.log(`  OIDC Issuer:   ${TEST_USER.oidcIssuer}`);
  console.log(`  Email:         ${TEST_USER.email}`);
  console.log(`  Name:          ${TEST_USER.firstName} ${TEST_USER.lastName}`);
  console.log('');

  try {
    // Try to insert the user
    db.insertUser({
      ...TEST_USER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ Test user created successfully!');
  } catch (error: any) {
    if (error.message?.includes('UNIQUE') || error.message?.includes('unique')) {
      console.log('⚠️  Test user already exists (this is OK)');
      
      // Try to get existing user
      const existingUser = db.getUserById(TEST_USER.id);
      if (existingUser) {
        console.log('');
        console.log('Existing user details:');
        console.log(JSON.stringify(existingUser, null, 2));
      }
    } else {
      console.error('❌ Failed to seed test user:', error);
      db.close();
      process.exit(1);
    }
  }

  // Verify user exists
  const user = db.getUserById(TEST_USER.id);
  if (user) {
    console.log('');
    console.log('✅ Verification: User found in database');
    console.log('');
    console.log('You can now:');
    console.log('  1. Generate a test token: bun run scripts/generate-test-token.ts');
    console.log('  2. Use the token in your API calls');
  } else {
    console.log('❌ Verification failed: User not found in database');
  }

  // Show existing tables
  console.log('');
  console.log('Database tables:');
  console.log('----------------');
  const tables = db.getTables();
  tables.forEach((table: string) => {
    console.log(`  - ${table}`);
  });

  db.close();
  console.log('');
  console.log('==============================================');
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
