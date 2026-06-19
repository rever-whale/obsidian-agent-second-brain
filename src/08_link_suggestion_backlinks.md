# 8. 링크 추천과 Backlink 보강

링크 추천은 관련 노트 목록을 많이 붙이는 일이 아니다. 링크는 미래 검색과 탐색 비용을 낮추는 구조적 약속이다. Agent는 새 노트의 `## Related` 섹션을 만들고, 필요한 경우 기존 노트에도 backlink를 추가한다.

예시는 다음과 같다.

```md
## Related

- [[React Query]]
- [[Server State]]
- [[Cache Invalidation]]
- [[SWR]]
```

Backlink 보강은 더 조심해야 한다. 기존 노트의 의미를 바꿀 수 있기 때문이다. 기본 정책은 새 노트에는 자동으로 related link를 추가하되, 기존 노트에 역링크를 넣는 작업은 confidence threshold를 높게 둔다.

## 링크는 네 종류로 나눈다

모든 링크를 같은 의미로 다루면 graph가 빠르게 흐려진다. Agent는 링크 후보를 최소 네 종류로 분류해야 한다.

| Link type | 의미 | 예시 |
| --- | --- | --- |
| `is_about` | 이 노트의 핵심 주제 | `React Query Invalidation -> React Query` |
| `depends_on` | 이해에 필요한 선행 개념 | `RSC Cache Scope -> React Server Components` |
| `contrasts_with` | 비교하거나 대조할 개념 | `React Query -> SWR` |
| `came_from` | provenance 또는 원천 | `Concept Note -> 2026-06-19 Daily Note` |

Obsidian wikilink 자체에는 link type이 없다. 그래서 link type은 섹션으로 표현한다.

```md
## Related

### Core

- [[React Query]]
- [[Cache Invalidation]]

### Compare

- [[SWR]]

### Source

- [[2026-06-19]]
```

이 구조는 graph 분석에도 도움이 된다. 모든 edge가 같은 edge인 것처럼 보이더라도, Agent는 섹션 위치를 보고 edge의 의미를 추정할 수 있다.

## 링크 품질 기준

- 링크 대상이 실제로 존재해야 한다.
- alias가 필요한 경우 display text를 명시한다.
- 같은 섹션에 같은 링크를 중복 삽입하지 않는다.
- 너무 일반적인 hub note만 반복해서 연결하지 않는다.
- source daily note로 돌아갈 수 있는 provenance link를 남긴다.

## 링크 추천 알고리즘

링크 추천은 후보 생성과 후보 필터링으로 나눈다.

후보 생성은 넓게 한다.

- 현재 block의 keyword와 alias로 lexical 후보를 찾는다.
- embedding search로 semantic 후보를 찾는다.
- 같은 project note나 MOC 주변의 graph neighbor를 찾는다.
- 최근 30일 안에 자주 업데이트된 관련 노트를 찾는다.

후보 필터링은 엄격하게 한다.

- 이미 같은 섹션에 있는 링크는 제거한다.
- 너무 일반적인 hub note는 감점한다.
- source note와 target note의 type이 맞지 않으면 감점한다.
- 같은 folder에 있다는 이유만으로 연결하지 않는다.
- confidence가 낮으면 report에만 표시한다.

```text
Link candidate

Source: notes/frontend/react-query-invalidation.md
Target: notes/frontend/server-state.md
Why:
- semantic similarity 0.78
- both under Frontend MOC
- target already links to React Query
Action:
- add under Related/Core
```

## Backlink 보강 정책

Backlink는 기존 노트를 수정하기 때문에 risk가 높다. 특히 오래된 concept note나 MOC에 자동으로 링크를 삽입하면 사용자가 만든 흐름이 깨질 수 있다.

권장 정책은 다음과 같다.

| Target | Backlink 기본 정책 |
| --- | --- |
| 새로 만든 note | related link 자동 추가 가능 |
| project note | 날짜별 섹션 append 가능 |
| MOC | dry-run diff 필요 |
| 오래된 concept note | review 필요 |
| decision note | 원문 보존 우선, 자동 삽입 지양 |

Backlink를 꼭 자동화하고 싶다면 `## Related`처럼 Agent-managed section을 명시한다.

```md
## Related

<!-- agent-managed:start -->
- [[React Query Invalidation]]
<!-- agent-managed:end -->
```

Agent는 marker 안쪽만 수정한다. 사람이 직접 쓴 설명과 순서를 보존할 수 있다.

## Broken link와 rename

Obsidian은 내부 링크 자동 업데이트 기능을 제공하지만, Agent가 파일을 직접 이동하거나 rename하면 도구 경로에 따라 링크가 깨질 수 있다. 따라서 Agent는 rename/move를 가장 위험한 action으로 취급한다.

rename이 필요하면 다음 순서로 처리한다.

1. 새 파일명 후보와 이유를 report한다.
2. 기존 inbound link 목록을 계산한다.
3. alias로 해결 가능한지 먼저 확인한다.
4. rename diff를 만들고 broken link 검사를 실행한다.
5. 사용자가 승인하면 apply한다.

대부분의 경우 rename보다 alias 추가가 안전하다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections)
- [kartikkabadi/obsidian-vault-graph](https://github.com/kartikkabadi/obsidian-vault-graph)
