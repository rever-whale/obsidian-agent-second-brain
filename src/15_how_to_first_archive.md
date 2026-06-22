# 15. 빈 Vault에서 첫 Archive까지

이 장은 앞의 설명을 몰라도 그대로 따라 할 수 있는 최소 절차다. 목표는 완벽한 Second Brain을 설계하는 것이 아니라, 빈 폴더 하나에서 시작해 Daily Note를 쓰고, Archive Agent lab을 실행하고, diff와 결과물을 눈으로 확인하는 것이다.

완료하면 다음 네 가지가 생긴다.

- `daily/2026-06-22.md`: 오늘 적은 원본 기록
- `notes/`, `projects/`, `questions/`: Agent가 만들거나 갱신할 목적지
- `templates/`: 앞으로 계속 복사해 쓸 Daily Note와 note property 템플릿
- dry-run diff, apply 결과, graph doctor report, similar note report

## Step 0. 작업 위치 정하기

책 repo 안에서 lab을 실행한다고 가정한다.

```bash
cd obsidian-agent-second-brain/labs/brain-archive
```

이 장에서는 실제 개인 vault를 바로 건드리지 않는다. 먼저 `sandbox-vault/`라는 연습용 vault를 만든다. 명령이 익숙해진 뒤에만 자기 Obsidian vault 경로로 바꾼다.

## Step 1. 폴더 만들기

아래 명령을 그대로 실행한다.

```bash
mkdir -p sandbox-vault/{inbox,daily,notes/frontend,notes/backend,notes/architecture,projects,questions,moc,reviews,reports,templates,archive}
```

완성된 구조는 이렇게 보면 된다.

```text
sandbox-vault/
  inbox/
  daily/
  notes/
    frontend/
    backend/
    architecture/
  projects/
  questions/
  moc/
  reviews/
  reports/
  templates/
  archive/
```

처음에는 폴더가 비어 있어도 괜찮다. 사람이 처음부터 정확한 위치를 고르는 시스템이 아니라, Daily Note에 대충 적고 archive 단계에서 목적지를 제안받는 시스템이기 때문이다.

## Step 2. 템플릿 만들기

Daily Note 템플릿을 만든다.

```bash
cat > sandbox-vault/templates/daily.md <<'EOF'
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
```

새 노트용 property 템플릿도 만든다.

```bash
cat > sandbox-vault/templates/note.md <<'EOF'
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
```

템플릿의 핵심은 세 가지다.

- `type`: daily, concept, project, question처럼 Agent가 분류하기 쉬운 값
- `archive_status`: 오늘 노트가 아직 처리되지 않았다는 신호
- `source`: 나중에 생성된 노트가 어떤 Daily Note에서 왔는지 추적하는 자리. 템플릿에서는 비워 두고, Agent가 만든 노트에는 `[[2026-06-22]]` 같은 값이 들어간다.

## Step 3. 오늘의 Daily Note 쓰기

오늘 파일을 하나 만든다. 날짜는 필요하면 바꿔도 된다.

```bash
cat > sandbox-vault/daily/2026-06-22.md <<'EOF'
---
type: daily
date: 2026-06-22
archive_status: pending
---

# 2026-06-22

## Insight

React Query invalidateQueries는 생각보다 범위가 넓다.

## Project

검색 API latency 조사.
원인 후보는 Redis miss와 DB index.

## Question

Server Component에서 cache 범위는 어디까지인가?
EOF
```

작성 규칙은 단순하다. 제목은 `Insight`, `Project`, `Question`처럼 고정하고, 본문은 자연어로 쓴다. 폴더, 태그, 링크는 지금 고민하지 않는다.

처음에는 아래 세 가지만 써도 충분하다.

```md
## Insight
오늘 깨달은 것

## Project
진행 중인 일

## Question
나중에 조사할 질문
```

현실의 하루는 보통 이렇게 깔끔하지 않다. 오전에는 스탠드업, 점심 전에는 장애 회고, 오후에는 설계 리뷰, 그 사이에는 작은 결정이 여러 번 생긴다. 이때도 원칙은 같다. 모든 것을 완벽한 문서로 만들지 말고, Daily Note 안에서 시간과 종류만 구분해 둔다.

예를 들어 하루에 회의가 여러 번 있고 결정도 여러 번 있었다면 이렇게 쓴다.

```md
---
type: daily
date: 2026-06-22
archive_status: pending
---

# 2026-06-22

## Meeting

### 09:30 Standup

- Search API p95 latency가 어제 배포 이후 420ms에서 780ms로 상승했다.
- 민준: Redis hit ratio 먼저 확인.
- 서연: DB index 변경 이력 확인.
- 내 작업: `/search/products` slow query sample 20개 추출.

### 11:00 Incident Review: Search Latency

- 원인 후보 1: Redis key prefix 변경으로 cache miss 증가.
- 원인 후보 2: `products.category_id` index가 새 query 조건과 맞지 않음.
- 오늘 안에 hotfix 여부를 결정해야 한다.
- Follow-up: latency dashboard에 cache hit ratio panel 추가.

### 15:00 Design Review: Saved Search

- Saved Search 알림은 MVP에서 email만 지원한다.
- Slack notification은 다음 iteration으로 미룬다.
- Query serialization format은 URLSearchParams 기반으로 시작한다.

## Decision

### D1. Search latency hotfix는 cache prefix rollback으로 간다

- Context: DB index를 바로 바꾸면 migration risk가 크다.
- Decision: 오늘은 cache key prefix를 이전 버전으로 되돌린다.
- Owner: 민준
- Review: 내일 오전 p95 latency와 cache hit ratio 확인.

### D2. Saved Search notification은 email-only로 제한한다

- Context: Slack OAuth까지 넣으면 MVP scope가 커진다.
- Decision: v1은 email notification만 구현한다.
- Trade-off: Slack 요청은 많지만 onboarding 복잡도를 줄인다.
- Revisit: beta user 10명 이상이 Slack을 요청하면 다시 검토.

## Project

### Search API latency

- slow query sample 추출 완료.
- Redis miss가 급증한 시점은 10:42 배포 직후.
- 내일 할 일: rollback 후 p95 변화 확인.

### Saved Search

- notification scope가 email-only로 정리됨.
- 다음 작업: email template 초안 작성.

## Question

- Redis key prefix 변경을 배포 전에 잡을 수 있는 regression test를 어떻게 만들까?
- URLSearchParams 기반 serialization이 filter versioning에 충분할까?

## Insight

회의록을 별도 문서로 완성하려고 하면 기록이 밀린다. Daily Note에는 회의의 결론, owner, follow-up만 남기고, archive 단계에서 project note와 decision log로 나누는 편이 더 현실적이다.
```

여기서 중요한 것은 `Meeting`과 `Decision`을 억지로 하나씩만 쓰지 않는 것이다. 같은 section 안에 `### 09:30 Standup`, `### D1...`처럼 작은 제목을 여러 개 둔다. Agent는 나중에 이 덩어리들을 읽고 다음 목적지로 보낼 수 있다.

- 회의에서 나온 사실과 액션은 `Meeting`에 적는다.
- 이미 정해진 방향은 `Decision`에 적는다.
- 특정 기능이나 장애 대응의 진행 상황은 `Project`에 적는다.
- 아직 답이 없는 것은 `Question`에 적는다.
- 다음에도 써먹을 수 있는 깨달음은 `Insight`에 적는다.

결정이 회의 중에 나왔더라도 한 번 더 `Decision`에 따로 적는 편이 좋다. 회의록은 시간순 기록이고, decision note는 나중에 "왜 그렇게 했는가"를 찾기 위한 기록이다. 중복처럼 보여도 목적이 다르다.

## Step 4. 먼저 dry-run 실행하기

아직 파일을 쓰지 않고 diff만 본다.

```bash
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --dry-run
```

예상되는 출력은 Markdown diff다. 대략 이런 파일 변경 제안이 나온다.

```text
notes/frontend/react-query-invalidation.md
projects/search-api.md
questions/rsc-cache-scope.md
```

여기서 멈춰서 세 가지만 확인한다.

- target path가 말이 되는가?
- 새로 만들 note 제목이 이상하지 않은가?
- project note에 append될 내용이 너무 위험하지 않은가?

괜찮으면 다음 단계로 간다. 이상하면 Daily Note 표현을 조금 더 명확하게 고친 뒤 dry-run을 다시 실행한다.

## Step 5. JSON 계획 보기

Agent가 어떤 action으로 이해했는지 보고 싶으면 JSON으로 출력한다.

```bash
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --json
```

출력에서 볼 것은 많지 않다. 초반에는 아래 필드만 확인한다.

- `kind`: create인지 append인지
- `target`: 어느 파일을 바꾸려는지
- `risk`: low, medium, high 중 무엇인지
- `confidence`: Agent가 얼마나 확신하는지

실무에서는 `risk: high`이거나 `confidence`가 낮은 action은 바로 apply하지 않고 수동 검토 큐로 보낸다. 이 lab에서는 흐름을 익히는 것이 목적이므로 dry-run을 보고 직접 판단한다.

## Step 6. 실제 적용하기

diff가 괜찮다면 파일을 쓴다.

```bash
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --apply
```

성공하면 이런 식의 결과가 나온다.

```text
Applied 3 change(s):
- notes/frontend/react-query-invalidation.md
- projects/search-api.md
- questions/rsc-cache-scope.md
```

생성된 파일을 확인한다.

```bash
ls sandbox-vault/notes/frontend
ls sandbox-vault/projects
ls sandbox-vault/questions
```

중요한 감각은 이것이다. Daily Note는 원본 기록으로 남고, Agent가 만든 concept/project/question note는 나중에 다시 읽고 다듬을 작업물이다. 첫 apply 결과가 완벽할 필요는 없다.

## Step 7. graph doctor 실행하기

이제 vault 전체의 링크 상태를 본다.

```bash
node src/brain-archive.mjs graph doctor --vault sandbox-vault
```

처음에는 orphan note가 많을 수 있다. 정상이다. 방금 만든 노트가 아직 다른 노트와 충분히 연결되지 않았기 때문이다. 이 report는 "망했다"가 아니라 "다음 weekly review에서 연결할 후보"를 알려주는 점검표다.

자동화에 붙이고 싶으면 JSON으로 본다.

```bash
node src/brain-archive.mjs graph doctor --vault sandbox-vault --json
```

## Step 8. 비슷한 노트 찾기

유사 노트 검색은 중복 생성을 줄이는 데 쓴다. 방금 만든 React Query 노트를 기준으로 비슷한 노트를 찾아 본다.

```bash
node src/brain-archive.mjs search similar sandbox-vault/notes/frontend/react-query-invalidation.md --vault sandbox-vault --limit 3
```

연습용 vault에는 아직 후보가 적어서 결과가 빈약할 수 있다. 실제 vault에서는 이 단계가 "새 노트를 만들지, 기존 노트에 병합할지"를 판단하는 근거가 된다.

## Step 9. 오늘의 report 남기기

마지막으로 사람이 읽을 report를 남긴다.

```bash
cat > sandbox-vault/reports/2026-06-22-archive.md <<'EOF'
# Archive Report: 2026-06-22

## Input

- daily/2026-06-22.md

## Created or Updated

- notes/frontend/react-query-invalidation.md
- projects/search-api.md
- questions/rsc-cache-scope.md

## Review Notes

- React Query 관련 노트는 기존 Server State 노트와 연결할 수 있는지 확인한다.
- Search API project note는 다음 조사 항목을 추가한다.
- RSC cache 질문은 공식 문서 확인 후 Research Notes를 채운다.

## Next

- graph doctor에서 orphan note 확인
- similar search로 중복 후보 확인
- weekly review 때 MOC에 연결
EOF
```

report는 길 필요가 없다. "무엇을 입력했고, 무엇이 바뀌었고, 다음에 무엇을 볼지"만 남기면 된다.

## Step 10. 매일 반복하는 최소 루틴

매일 할 일은 네 줄이다.

```bash
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --dry-run
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --apply
node src/brain-archive.mjs graph doctor --vault sandbox-vault
node src/brain-archive.mjs search similar sandbox-vault/notes/frontend/react-query-invalidation.md --vault sandbox-vault --limit 3
```

실제 개인 vault에 적용할 때는 `sandbox-vault`만 자기 vault 경로로 바꾼다.

```bash
node src/brain-archive.mjs archive ~/Documents/MyVault/daily/2026-06-22.md --vault ~/Documents/MyVault --dry-run
```

처음 일주일은 `--apply`보다 `--dry-run`을 더 자주 본다. target path와 title이 자주 틀리면 Daily Note의 section 제목이나 표현을 조금 더 고정한다.

## Dashboard로 실행하기

터미널에서 매번 명령을 직접 치는 것이 피곤하면 lab dashboard를 띄운다.

```bash
npm run dashboard
```

브라우저에서 `http://127.0.0.1:8787`을 열면 같은 과정을 버튼으로 실행할 수 있다.

- `Bootstrap`: `sandbox-vault/` 폴더, 템플릿, Daily Note를 만든다.
- `Dry-run`: 실제 파일을 쓰지 않고 archive diff를 보여준다.
- `Apply`: dry-run에서 본 변경을 vault에 적용한다.
- `Graph Doctor`: orphan note, broken link, hub 후보를 확인한다.
- `Similar`: 기준 노트와 비슷한 노트 후보를 찾는다.
- `Write Report`: 오늘 archive 결과를 `reports/` 아래에 남긴다.

화면 오른쪽의 Run Log에는 실행한 버튼, 요약, 상세 출력이 계속 쌓인다. 처음 익힐 때는 `Bootstrap -> Dry-run -> Graph Doctor`까지만 눌러도 된다. 결과가 납득될 때만 `Apply`를 누른다.

## 한 번에 만드는 보일러플레이트

위 과정을 한 번에 준비하고 싶으면 lab에 들어 있는 bootstrap 스크립트를 실행한다.

```bash
bash bootstrap-sandbox-vault.sh
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --dry-run
```

`./bootstrap-sandbox-vault.sh`로 실행했을 때 `permission denied`가 나오면 실행 권한이 없다는 뜻이다. 이때는 둘 중 하나를 쓰면 된다.

```bash
chmod +x bootstrap-sandbox-vault.sh
./bootstrap-sandbox-vault.sh
```

또는 실행 권한을 바꾸지 않고 `bash`로 직접 실행한다.

```bash
bash bootstrap-sandbox-vault.sh
```

스크립트 내용은 다음과 같다.

```bash
#!/usr/bin/env bash
set -euo pipefail

VAULT="${1:-sandbox-vault}"
DATE="${2:-2026-06-22}"

mkdir -p "$VAULT"/{inbox,daily,notes/frontend,notes/backend,notes/architecture,projects,questions,moc,reviews,reports,templates,archive}

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
```

실행:

```bash
bash bootstrap-sandbox-vault.sh
node src/brain-archive.mjs archive sandbox-vault/daily/2026-06-22.md --vault sandbox-vault --dry-run
```

## 끝났는지 확인하는 체크리스트

아래 항목이 모두 참이면 첫 archive 실습은 끝난 것이다.

- `daily/2026-06-22.md`에 원본 기록이 남아 있다.
- dry-run에서 어떤 파일이 생성 또는 갱신될지 확인했다.
- `--apply` 후 `notes/`, `projects/`, `questions/` 중 하나 이상에 파일이 생겼다.
- `graph doctor` report를 실행했다.
- `reports/2026-06-22-archive.md`에 오늘 archive 결과를 남겼다.

이제부터는 더 많이 자동화하는 것이 아니라, 먼저 더 예측 가능하게 반복하는 것이 중요하다. Daily Note 제목을 안정시키고, dry-run을 보고, 작은 단위로 apply하고, weekly review에서 링크와 MOC를 다듬는다. 그 루틴이 쌓이면 Second Brain은 정리 프로젝트가 아니라 매일 돌아가는 운영 시스템이 된다.

## 출처

- [Local lab: brain-archive](../labs/brain-archive/README.md)
- [A. CLI와 Vault 템플릿](./appendix_a_cli_and_vault_templates.md)
- [3. Daily Note를 Capture Protocol로 설계하기](./03_daily_note_capture_protocol.md)
- [11. dry-run, diff, rollback](./11_dry_run_diff_rollback.md)
