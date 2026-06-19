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
