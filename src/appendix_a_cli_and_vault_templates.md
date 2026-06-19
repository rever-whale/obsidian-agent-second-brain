# A. CLI와 Vault 템플릿

이 부록은 책에서 사용할 CLI와 vault 구조의 초기 템플릿을 모은다.

## Vault 구조

```text
vault/
  inbox/
  daily/
  notes/
    frontend/
    backend/
    architecture/
    productivity/
  projects/
  questions/
  moc/
  reviews/
  reports/
  archive/
```

## CLI 초안

```bash
brain archive today --dry-run
brain archive today --apply --commit
brain suggest-links notes/frontend/react-query.md
brain review weekly
brain graph doctor
```

## Lab CLI

이 책의 로컬 lab은 다음 경로에 있다.

```text
labs/brain-archive/
```

실행:

```bash
cd labs/brain-archive
npm test
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --json
```

`--dry-run`은 diff만 출력한다. `--json`은 action plan을 JSON으로 출력한다. `--apply`는 실제 파일을 쓴다.

## 기본 note properties

```yaml
---
type: concept
status: active
created: 2026-06-19
updated: 2026-06-19
source:
  - "[[2026-06-19]]"
aliases: []
---
```

## 출처

- [jwhonce/obsidian-cli](https://github.com/jwhonce/obsidian-cli)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Local lab: brain-archive](../labs/brain-archive/README.md)
