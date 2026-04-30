#!/usr/bin/env node
// Signs a Ghost Admin API JWT using HS256.
// Usage: node sign-jwt.js <key-id> <key-secret-hex>
// Prints "Ghost <jwt>" to stdout.

const crypto = require('crypto');

const [,, id, secretHex] = process.argv;
if (!id || !secretHex) {
  process.stderr.write('Usage: sign-jwt.js <key-id> <key-secret-hex>\n');
  process.exit(1);
}

const secret = Buffer.from(secretHex, 'hex');
const b64url = buf => buf.toString('base64url');

const header  = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })));
const now     = Math.floor(Date.now() / 1000);
const payload = b64url(Buffer.from(JSON.stringify({ iat: now, exp: now + 18000, aud: '/admin/' })));

const sig = crypto.createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64url');

process.stdout.write(`Ghost ${header}.${payload}.${sig}`);
