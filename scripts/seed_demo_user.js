#!/usr/bin/env node
/**
 * Seed a demo operator for development/testing.
 * Run after "npm run dev" is started to enable login: flood_officer_01 / demo
 * Uses POST /api/auth/users — server must be running.
 */
const http = require('http');

const DEMO_OPERATOR = 'flood_officer_01';
const DEMO_PASSPHRASE = 'demo';
const PORT = parseInt(process.env.PORT || '3000', 10);

function createUser() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      operatorId: DEMO_OPERATOR,
      passphrase: DEMO_PASSPHRASE,
      role: 'water_authority',
    });
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.user || json.operatorId) {
              resolve({ created: true });
            } else if (json.error && json.error.toLowerCase().includes('already exists')) {
              resolve({ existing: true });
            } else {
              reject(new Error(json.error || data || 'Unknown error'));
            }
          } catch {
            reject(new Error(data || 'Invalid response'));
          }
        });
      }
    );
    req.on('error', (e) => reject(new Error(`Connection failed: ${e.message}. Is "npm run dev" running?`)));
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Seeding demo operator...');
  try {
    const result = await createUser();
    if (result.existing) {
      console.log(`Demo operator already exists: ${DEMO_OPERATOR}`);
    } else {
      console.log(`Created demo operator: ${DEMO_OPERATOR}`);
    }
    console.log(`Login: ${DEMO_OPERATOR} / ${DEMO_PASSPHRASE}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    console.error('Ensure the dev server is running: npm run dev');
    process.exit(1);
  }
}

main();
