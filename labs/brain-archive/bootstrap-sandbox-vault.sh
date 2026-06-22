#!/usr/bin/env bash
set -euo pipefail

VAULT="${1:-sandbox-vault}"
DATE="${2:-2026-06-22}"

mkdir -p "$VAULT"/{inbox/manual-review,daily,notes/frontend,notes/backend,notes/architecture,notes/learning,notes/references,projects,questions,decisions,meetings,moc,reviews,reports,templates,archive/daily}

cat > "$VAULT/templates/daily.md" <<'EOF'
---
type: daily
date: {{date}}
archive_status: pending
---

# {{date}}

## Insight

## Learn

## Project

## Question

## Decision

## Meeting

## Reference
EOF

cat > "$VAULT/templates/note.md" <<'EOF'
---
type: concept
status: active
created: {{date}}
updated: {{date}}
source: []
aliases: []
---

# {{title}}

## Observation

## Related
EOF

cat > "$VAULT/daily/$DATE.md" <<EOF
---
type: daily
date: $DATE
archive_status: pending
---

# $DATE

## Insight

React Query invalidateQueries는 생각보다 범위가 넓다.

## Project

검색 API latency 조사.
원인 후보는 Redis miss와 DB index.

## Question

Server Component에서 cache 범위는 어디까지인가?
EOF

echo "Created $VAULT"
echo "Next:"
echo "node src/brain-archive.mjs archive $VAULT/daily/$DATE.md --vault $VAULT --dry-run"
