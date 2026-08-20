#!/usr/bin/env node
// Reads a Ghost integrations API response from stdin and prints the admin API key
// as "id:secret" to stdout.
//
// Ghost returns admin api_key.secret as "<id>:<64-char-hex>" (colon-separated).
// sign-jwt.cjs expects exactly that format: KEY_ID="${API_KEY%%:*}", KEY_SECRET="${API_KEY#*:}".
// So output key.secret directly — do NOT prepend key.id again.
//
// Usage: echo "$INTEGRATION_RESP" | node extract-api-key.js

const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const resp = JSON.parse(Buffer.concat(chunks).toString());
  const INTEGRATION_NAME = process.env.INTEGRATION_NAME || 'Skyramp Eval';
  // When the response contains multiple integrations (e.g. after a 422 fallback GET),
  // find by name so we don't accidentally pick a built-in Ghost integration.
  const integration = resp.integrations.find(i => i.name === INTEGRATION_NAME)
    || resp.integrations[0];
  const key = integration.api_keys.find(k => k.type === 'admin');
  if (!key) {
    process.stderr.write(`ERROR: no admin API key in integration "${integration.name}"\n`);
    process.exit(1);
  }
  // key.secret is already "id:hex" — output as-is so get-auth-token.sh can split on ':'
  process.stdout.write(key.secret);
});
