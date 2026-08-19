#!/usr/bin/env bash
# Get a Ghost Admin API JWT for eval use.
#
# Flow:
#   1. POST /ghost/api/admin/authentication/setup  — create the first owner user
#   2. POST /ghost/api/admin/session               — login, capture SESSION cookie
#   3. POST /ghost/api/admin/integrations          — create "Skyramp Eval" integration
#      (422 = already exists → GET /ghost/api/admin/integrations to find it)
#   4. Extract admin API key id:secret via extract-api-key.cjs
#   5. Sign HS256 JWT via sign-jwt.cjs
#
# Outputs a raw JWT (no "Ghost " prefix) to stdout for use as SKYRAMP_TEST_TOKEN.
# workspace.yml authType: bearer + authScheme: Ghost causes the executor to send:
#   Authorization: Ghost <jwt>
# The pre-seeded admin_posts_list_integration_test.spec.ts hardcodes
#   "Ghost " + SKYRAMP_TEST_TOKEN, which also produces: Authorization: Ghost <jwt>
# JWTs are signed with exp=now+18000s (5h), matching Ghost's server maxAge: '5h'.
set -euo pipefail

GHOST_HOST="${GHOST_HOST:-http://localhost:2368}"
ADMIN_EMAIL="${SKYRAMP_UI_USERNAME:-eval@ghost.local}"
ADMIN_PASSWORD="${SKYRAMP_UI_PASSWORD:-Skyramp!Eval2024#}"
ADMIN_NAME="Eval Admin"
BLOG_TITLE="Ghost Eval"
INTEGRATION_NAME="Skyramp Eval"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "  [get-auth-token] Ghost: ${GHOST_HOST}" >&2
echo "  [get-auth-token] User:  ${ADMIN_EMAIL}" >&2

# Temp files
SETUP_BODY=$(mktemp)
LOGIN_HEADERS=$(mktemp)
LOGIN_BODY=$(mktemp)
INT_BODY=$(mktemp)
trap 'rm -f "$SETUP_BODY" "$LOGIN_HEADERS" "$LOGIN_BODY" "$INT_BODY"' EXIT

# ---- 1. Setup first owner (idempotent: 422/400/403 = already set up) ----
SETUP_STATUS=$(
  curl -sS -o "$SETUP_BODY" -w '%{http_code}' \
    -X POST "${GHOST_HOST}/ghost/api/admin/authentication/setup" \
    -H "Content-Type: application/json" \
    -H "Origin: ${GHOST_HOST}" \
    -d "{\"setup\":[{\"name\":\"${ADMIN_NAME}\",\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"blogTitle\":\"${BLOG_TITLE}\"}]}"
)
echo "  [get-auth-token] Setup HTTP status: ${SETUP_STATUS}" >&2
case "${SETUP_STATUS}" in
  2??) ;;
  403|422|400) ;;  # already set up
  *)
    echo "  [get-auth-token] ERROR: setup failed (HTTP ${SETUP_STATUS})" >&2
    cat "$SETUP_BODY" >&2
    exit 1
    ;;
esac

# ---- 2. Login and capture SESSION cookie ----
LOGIN_STATUS=$(
  curl -sS -D "$LOGIN_HEADERS" -o "$LOGIN_BODY" -w '%{http_code}' \
    -X POST "${GHOST_HOST}/ghost/api/admin/session" \
    -H "Content-Type: application/json" \
    -H "Origin: ${GHOST_HOST}" \
    -d "{\"username\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"
)
echo "  [get-auth-token] Login HTTP status: ${LOGIN_STATUS}" >&2

SESSION_COOKIE=$(grep -i '^set-cookie:' "$LOGIN_HEADERS" \
  | grep -oi 'ghost-admin-api-session=[^;]*' \
  | head -1 || true)

if [[ -z "$SESSION_COOKIE" ]]; then
  echo "  [get-auth-token] ERROR: login failed — no session cookie in response headers" >&2
  echo "  [get-auth-token] Response headers:" >&2
  cat "$LOGIN_HEADERS" >&2
  echo "  [get-auth-token] Response body:" >&2
  cat "$LOGIN_BODY" >&2
  exit 1
fi

echo "  [get-auth-token] Session obtained (used to create integration)" >&2

# ---- 3. Create integration (idempotent) ----
# include=api_keys ensures the secret is present in the create response.
INT_STATUS=$(
  curl -sS -o "$INT_BODY" -w '%{http_code}' \
    -X POST "${GHOST_HOST}/ghost/api/admin/integrations/?include=api_keys" \
    -H "Content-Type: application/json" \
    -H "Origin: ${GHOST_HOST}" \
    -H "Cookie: ${SESSION_COOKIE}" \
    -d "{\"integrations\":[{\"name\":\"${INTEGRATION_NAME}\"}]}"
)
echo "  [get-auth-token] Integration create HTTP status: ${INT_STATUS}" >&2

if [[ "$INT_STATUS" == "422" ]]; then
  # Integration already exists — fetch it with api_keys included
  echo "  [get-auth-token] Integration exists, fetching..." >&2
  INT_STATUS=$(
    curl -sS -o "$INT_BODY" -w '%{http_code}' \
      "${GHOST_HOST}/ghost/api/admin/integrations/?limit=all&include=api_keys" \
      -H "Origin: ${GHOST_HOST}" \
      -H "Cookie: ${SESSION_COOKIE}"
  )
  echo "  [get-auth-token] Integration fetch HTTP status: ${INT_STATUS}" >&2
fi

case "${INT_STATUS}" in
  2??) ;;
  *)
    echo "  [get-auth-token] ERROR: integration request failed (HTTP ${INT_STATUS})" >&2
    cat "$INT_BODY" >&2
    exit 1
    ;;
esac

# ---- 4. Extract admin API key id:secret ----
API_KEY=$(node "$SCRIPT_DIR/scripts/extract-api-key.cjs" < "$INT_BODY")
KEY_ID="${API_KEY%%:*}"
KEY_SECRET="${API_KEY#*:}"
echo "  [get-auth-token] API key id: ${KEY_ID}" >&2

# ---- 5. Sign JWT ----
# Output raw JWT only (no "Ghost " prefix).
# workspace.yml authType: bearer + authScheme: Ghost causes the executor to send:
#   Authorization: Ghost <jwt>
# The pre-seeded test hardcodes "Ghost " + SKYRAMP_TEST_TOKEN, which also produces:
#   Authorization: Ghost <jwt>
JWT=$(node "$SCRIPT_DIR/scripts/sign-jwt.cjs" "$KEY_ID" "$KEY_SECRET")
RAW_JWT="${JWT#Ghost }"
echo "  [get-auth-token] JWT signed" >&2

echo "$RAW_JWT"
