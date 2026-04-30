#!/usr/bin/env node
// Reads a Ghost integrations API response from stdin and prints the admin API key
// as "id:secret" to stdout.
// Usage: echo "$INTEGRATION_RESP" | node extract-api-key.js

const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const resp = JSON.parse(Buffer.concat(chunks).toString());
  const key = resp.integrations[0].api_keys.find(k => k.type === 'admin');
  if (!key) {
    process.stderr.write('ERROR: no admin API key in integration response\n');
    process.exit(1);
  }
  process.stdout.write(`${key.id}:${key.secret}`);
});
