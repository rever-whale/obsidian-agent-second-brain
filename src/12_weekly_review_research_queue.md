# 12. Weekly Review와 Research Queue

Daily archive가 지식 조각을 정리한다면 Weekly Review는 방향을 정리한다. 일주일 동안 생성된 노트, 가장 많이 성장한 영역, 반복 질문, 고립 노트, 추천 학습 주제를 보고한다.

```bash
brain review weekly
```

출력은 다음 질문에 답해야 한다.

- 이번 주 어떤 주제 cluster가 성장했는가?
- 아직 답하지 못한 질문은 무엇인가?
- 여러 번 등장했지만 concept note가 없는 키워드는 무엇인가?
- project note와 concept note가 충분히 연결되어 있는가?
- 다음 주 학습 또는 정리 우선순위는 무엇인가?

Research Queue는 `Question` 타입에서 시작한다. Agent는 질문을 바로 답하려고 하기보다, 기존 vault에서 답의 후보를 찾고, 부족하면 외부 research task로 남긴다.

## Weekly Review 입력

Weekly Review는 LLM에게 "이번 주를 요약해줘"라고 맡기는 작업이 아니다. 먼저 구조화된 입력을 만든다.

```json
{
  "period": "2026-W25",
  "created_notes": 18,
  "updated_notes": 42,
  "open_questions": 7,
  "closed_questions": 3,
  "top_clusters": [
    {"name": "React Server Components", "delta": 8},
    {"name": "Search API", "delta": 6}
  ],
  "graph": {
    "orphan_ratio": 0.079,
    "broken_links": 14
  }
}
```

LLM은 이 구조화된 입력을 바탕으로 해석과 제안을 만든다. 이렇게 해야 review가 감상문이 아니라 운영 리포트가 된다.

## Weekly Review 템플릿

```md
# Weekly Review 2026-W25

## Summary

이번 주 vault는 React Server Components와 Search API latency 중심으로 성장했다.

## Created

- [[RSC Cache Scope]]
- [[React Query Invalidation]]

## Updated Clusters

### React Server Components

- 새 질문 2개
- concept note 1개 생성
- 아직 공식 문서 확인 필요

### Search API

- latency investigation 기록 추가
- Redis miss와 DB index 후보 연결

## Open Questions

- [[RSC Cache Scope]]
- [[Query Invalidation Boundary]]

## Graph Health

- Orphan ratio: 8.1% -> 7.9%
- Broken links: 14

## Next Actions

- RSC cache 공식 문서 확인
- Search API execution plan 결과를 project note에 추가
```

이 템플릿은 사람이 다음 주 행동을 결정할 수 있게 만드는 것이 목적이다. 완벽한 요약보다 actionable한 queue가 중요하다.

## Research Queue lifecycle

Question note는 lifecycle을 가진다.

```yaml
---
type: question
status: open
created: 2026-06-19
source:
  - "[[2026-06-19]]"
related:
  - "[[React Server Components]]"
---
```

상태는 최소 네 가지면 충분하다.

| status | 의미 |
| --- | --- |
| `open` | 아직 답이 없다 |
| `researching` | 자료를 모으는 중이다 |
| `answered` | 답변 또는 concept note로 정리되었다 |
| `dropped` | 더 이상 추적하지 않는다 |

Agent는 weekly review에서 `open` 질문을 그대로 나열하지 말고 cluster별로 묶는다. 질문이 많다는 것은 나쁜 일이 아니다. 문제는 질문이 concept note로 전환되지 않는 것이다.

## 질문을 답으로 바꾸는 방식

질문이 해결되면 두 가지 작업을 한다.

1. question note의 `status`를 `answered`로 바꾼다.
2. 답을 담은 concept note 또는 project note를 연결한다.

```yaml
---
type: question
status: answered
answered_by:
  - "[[RSC Cache Scope]]"
---
```

질문 노트를 삭제하지 않는다. 질문은 지식이 생성된 경로를 보여주는 provenance다. 나중에 같은 질문이 다시 나타나면 Agent는 기존 question note와 answered concept note를 함께 제안할 수 있다.

## 출처

- [How People Manage Knowledge in their Second Brains](https://arxiv.org/abs/2509.20187)
- [Obsidian Help: Bases](https://obsidian.md/help/bases)
- [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
