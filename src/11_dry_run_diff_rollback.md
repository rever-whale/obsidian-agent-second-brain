# 11. Dry-run, Diff, Rollback

Agent가 vault를 직접 고치는 순간 운영 문제가 생긴다. 잘못된 병합, 과도한 링크, MOC 재정렬, properties 손상은 사용자의 신뢰를 빠르게 무너뜨린다. 그래서 기본 실행은 dry-run이어야 한다.

권장 명령은 다음과 같다.

```bash
brain archive today --dry-run
brain archive today --apply
brain archive today --apply --commit
```

`--dry-run`은 plan과 diff만 만든다. `--apply`는 파일을 수정하지만 Git commit은 만들지 않는다. `--commit`은 적용 결과를 되돌릴 수 있는 단위로 저장한다.

## 안전장치

- 모든 변경은 source daily note를 provenance로 남긴다.
- confidence가 낮은 병합은 manual queue로 보낸다.
- 파일 전체 rewrite보다 heading-level patch를 우선한다.
- 적용 전후 graph quality를 비교한다.
- apply 후 Git diff가 비어 있지 않으면 report에 요약한다.

## 출처

- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
