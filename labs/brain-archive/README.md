# brain-archive lab

`brain-archive`는 책의 Archive Agent 파이프라인을 작게 재현하는 Node.js CLI다. 외부 LLM이나 embedding 없이도 다음 흐름을 확인할 수 있게 만든다.

```text
Daily Note
  -> section parser
  -> action planner
  -> dry-run diff
  -> optional apply
```

## 실행

```bash
npm test
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --json
```

`--apply`를 붙이면 계획된 파일 변경을 실제 vault에 반영한다. 기본값은 dry-run이다.

## 범위

이 lab은 production-ready 도구가 아니다. 의도적으로 다음 네 가지만 다룬다.

- Daily Note의 H2 section 추출
- heading 기반 action planning
- 생성/append diff 출력
- apply 후 파일 생성 또는 append

본문에서 설명한 semantic search, graph quality, confidence scoring은 이후 확장 지점으로 남긴다.
