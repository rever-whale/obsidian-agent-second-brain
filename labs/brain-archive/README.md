# brain-archive lab

`brain-archive`는 책의 Archive Agent 파이프라인을 작게 재현하는 Node.js CLI다. 외부 LLM이나 embedding 없이도 다음 흐름을 확인할 수 있게 만든다.

```text
Daily Note
  -> section parser
  -> action planner
  -> dry-run diff
  -> optional apply
  -> graph doctor
  -> similar note search
```

## 실행

```bash
npm test
npm run dashboard
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --json
node src/brain-archive.mjs graph doctor --vault fixtures/vault
node src/brain-archive.mjs graph doctor --vault fixtures/vault --json
node src/brain-archive.mjs search similar fixtures/vault/notes/frontend/react-query.md --vault fixtures/vault --limit 2
node src/brain-archive.mjs search similar fixtures/vault/notes/frontend/react-query.md --vault fixtures/vault --limit 2 --json
```

`--apply`를 붙이면 계획된 파일 변경을 실제 vault에 반영한다. 기본값은 dry-run이다.
`graph doctor`는 read-only 명령이다. Markdown 파일을 훑어 wikilink를 해석하고, orphan note, broken link, hub 후보를 리포트한다.
`search similar`도 read-only 명령이다. 외부 embedding 없이 토큰 벡터와 cosine similarity로 유사 노트 후보를 찾는다.

## Dashboard

CLI를 매번 직접 실행하기 번거로울 때는 dashboard를 띄운다.

```bash
npm run dashboard
```

브라우저에서 `http://127.0.0.1:8787`을 열면 다음 작업을 버튼으로 실행할 수 있다.

- sandbox vault bootstrap
- archive dry-run
- archive apply
- graph doctor
- similar note search
- archive report 작성

각 실행 결과는 Latest Output과 Run Log에 함께 쌓인다.

## Daily Note project 입력 규칙

프로젝트를 Daily Note 작성 전에 미리 만들 필요는 없다. 처음 쓰는 주제는 텍스트로 바로 적는다.

```md
## Decision

### 위자드 > MW > fallback 정책

- 에러 fallback은 /profiles가 아니라 /dashboard로 보낸다.
```

archive 단계에서는 위 입력을 다음 구조로 해석한다.

```text
projects/위자드/index.md
projects/위자드/mw/index.md
decisions/위자드/mw/fallback-정책.md
```

이미 project index가 있고 Obsidian 자동완성으로 정확히 고르고 싶을 때만 wikilink를 쓴다.

```md
### [[projects/위자드/mw/index|MW]] > fallback 정책
```

두 방식은 같은 project hierarchy로 처리된다.

## 범위

이 lab은 production-ready 도구가 아니다. 의도적으로 다음 여섯 가지만 다룬다.

- Daily Note의 H2 section과 H3 topic 추출
- heading 기반 action planning
- 생성/append diff 출력
- apply 후 파일 생성 또는 append
- vault graph health report
- lexical vector 기반 유사 노트 후보 검색

본문에서 설명한 production embedding index, confidence scoring, approval queue는 이후 확장 지점으로 남긴다.
