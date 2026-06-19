# 11. Dry-run, Diff, Rollback

Agent가 vault를 직접 고치는 순간 운영 문제가 생긴다. 잘못된 병합, 과도한 링크, MOC 재정렬, properties 손상은 사용자의 신뢰를 빠르게 무너뜨린다. 그래서 기본 실행은 dry-run이어야 한다.

권장 명령은 다음과 같다.

```bash
brain archive today --dry-run
brain archive today --apply
brain archive today --apply --commit
```

`--dry-run`은 plan과 diff만 만든다. `--apply`는 파일을 수정하지만 Git commit은 만들지 않는다. `--commit`은 적용 결과를 되돌릴 수 있는 단위로 저장한다.

## Dry-run이 기본값이어야 하는 이유

개인 vault는 코드 저장소보다 모호하다. 코드에서는 테스트가 실패하면 변경이 잘못되었음을 빠르게 알 수 있다. 하지만 지식 vault에서는 잘못된 링크나 부적절한 병합이 몇 주 뒤에야 드러난다. 따라서 archive 자동화의 기본값은 보수적이어야 한다.

Dry-run은 단순 preview가 아니다. Agent와 사용자 사이의 계약이다.

```text
Agent:
  이 Daily Note에서 5개의 action을 찾았다.
  2개는 새 노트 생성, 1개는 project append, 2개는 related link 추가다.
  기존 본문 삭제나 note move는 없다.

User:
  diff를 보고 apply 여부를 결정한다.
```

이 루프가 반복되면 사용자는 Agent의 판단 기준을 이해하게 되고, Agent는 사용자의 승인/거절 패턴을 다음 planning에 반영할 수 있다.

## 안전장치

- 모든 변경은 source daily note를 provenance로 남긴다.
- confidence가 낮은 병합은 manual queue로 보낸다.
- 파일 전체 rewrite보다 heading-level patch를 우선한다.
- 적용 전후 graph quality를 비교한다.
- apply 후 Git diff가 비어 있지 않으면 report에 요약한다.

## Diff report 예시

```diff
diff --git a/notes/frontend/react-query-invalidation.md b/notes/frontend/react-query-invalidation.md
new file mode 100644
--- /dev/null
+++ b/notes/frontend/react-query-invalidation.md
@@
+---
+type: concept
+status: active
+source:
+  - "[[2026-06-19]]"
+aliases:
+  - React Query invalidateQueries
+---
+
+# React Query Invalidation
+
+## Observation
+
+`invalidateQueries`는 query key prefix matching 때문에 예상보다 넓은 범위의 query를 stale 처리할 수 있다.
+
+## Related
+
+- [[React Query]]
+- [[Server State]]
+- [[Cache Invalidation]]
```

diff는 사람이 읽을 수 있어야 한다. Agent가 "좋은 방향으로 정리했다"고 주장하는 것보다, 사용자가 직접 변경을 판단할 수 있는 diff가 훨씬 강하다.

## Rollback 전략

rollback은 Git에만 맡기지 않는다. Git은 최종 안전망이고, Agent도 자체 transaction log를 남겨야 한다.

```json
{
  "run_id": "2026-06-19T22-10-00+09-00",
  "source": "daily/2026-06-19.md",
  "commit": "abc1234",
  "actions": [
    {
      "id": "act-001",
      "kind": "create_note",
      "target": "notes/frontend/react-query-invalidation.md"
    }
  ]
}
```

사용자가 `brain archive rollback <run_id>`를 실행하면 Agent는 commit revert 또는 inverse patch를 제안한다. 이미 다른 변경이 겹쳤다면 자동 revert 대신 conflict report를 만든다.

## Confidence threshold

자동 적용 범위는 confidence와 risk의 조합으로 정한다.

| Risk | Confidence | 기본 동작 |
| --- | --- | --- |
| low | >= 0.85 | 자동 적용 가능 |
| low | < 0.85 | dry-run |
| medium | any | dry-run |
| high | any | 승인 필수 |

초기에는 모든 쓰기 작업을 dry-run으로 두고, 몇 주간 report를 검토한 뒤 low-risk action만 자동화하는 편이 좋다.

## 출처

- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
