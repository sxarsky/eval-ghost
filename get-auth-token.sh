#!/usr/bin/env bash
# Get a Ghost Admin session cookie for eval use.
#
# Flow:
#   1. POST /ghost/api/admin/authentication/setup  — create the first owner user
#   2. POST /ghost/api/admin/session               — login, capture SESSION cookie
#
# Outputs "ghost-admin-api-session=<value>" to stdout for use as SKYRAMP_TEST_TOKEN.
# The workspace.yml sets authType: cookie so the executor sends:
#   Cookie: ghost-admin-api-session=<value>
#
# Session cookies are long-lived (unlike integration JWTs which expire in 5 min)
# and provide full admin access including analytics endpoints.
#
# Note: Ghost is configured with security__staffDeviceVerification=false so no
# 2FA / mailpit is needed.
set -euo pipefail

GHOST_HOST="${GHOST_HOST:-http://localhost:2368}"
ADMIN_EMAIL="${SKYRAMP_UI_USERNAME:-eval@ghost.local}"
ADMIN_PASSWORD="${SKYRAMP_UI_PASSWORD:-Skyramp!Eval2024#}"
ADMIN_NAME="Eval Admin"
BLOG_TITLE="Ghost Eval"

echo "  [get-auth-token] Ghost: ${GHOST_HOST}" >&2
echo "  [get-auth-token] User:  ${ADMIN_EMAIL}" >&2

# ---- 1. Setup first owner (idempotent: 422/400/403 = already set up) ----
SETUP_BODY=$(mktemp)
trap 'rm -f "$SETUP_BODY"' EXIT
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
LOGIN_BODY=$(mktemp)
LOGIN_HEADERS=$(mktemp)
trap 'rm -f "$SETUP_BODY" "$LOGIN_BODY" "$LOGIN_HEADERS"' EXIT

curl -sS -D "$LOGIN_HEADERS" -o "$LOGIN_BODY" \
  -X POST "${GHOST_HOST}/ghost/api/admin/session" \
  -H "Content-Type: application/json" \
  -H "Origin: ${GHOST_HOST}" \
  -d "{\"username\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"

SESSION_COOKIE=$(grep -i '^set-cookie:' "$LOGIN_HEADERS" \
  | grep -oi 'ghost-admin-api-session=[^;]*' \
  | head -1 || true)

echo "  [get-auth-token] Session cookie: ${SESSION_COOKIE:0:40}..." >&2

if [[ -z "$SESSION_COOKIE" ]]; then
  echo "  [get-auth-token] ERROR: login failed — no session cookie in response headers" >&2
  cat "$LOGIN_HEADERS" >&2
  exit 1
fi

echo "$SESSION_COOKIE"
