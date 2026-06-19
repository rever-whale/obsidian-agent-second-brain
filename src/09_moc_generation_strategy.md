# 9. MOC 자동 생성과 갱신 전략

MOC는 폴더 목차가 아니라 탐색 인터페이스다. Agent가 MOC를 자동 갱신할 때는 단순 알파벳 목록보다 독자가 다시 찾을 가능성이 높은 그룹을 만들어야 한다.

예시는 다음과 같다.

```md
# Frontend

## Server State

- [[React Query]]
- [[SWR]]
- [[Cache Invalidation]]

## React Internals

- [[Fiber]]
- [[Scheduler]]
- [[Concurrent Rendering]]
```

MOC 자동 생성에는 두 가지 방식이 있다.

- curated MOC: Agent가 Markdown 목록을 직접 갱신한다.
- query MOC: Obsidian Bases 또는 Dataview 같은 query layer로 동적 목록을 만든다.

개발자 vault에서는 둘을 섞는 편이 좋다. 핵심 주제 MOC는 curated로 유지하고, review dashboard나 queue 목록은 query 기반으로 만든다.

## MOC는 언제 만들어야 하는가

모든 주제에 MOC를 만들 필요는 없다. MOC가 너무 많으면 MOC 자체가 관리 대상이 된다. Agent는 다음 조건 중 두 개 이상이 만족될 때 MOC 생성을 제안한다.

- 같은 topic cluster에 노트가 7개 이상 있다.
- 해당 cluster의 orphan note가 늘고 있다.
- 여러 project note에서 같은 개념 집합을 반복 참조한다.
- hub note 하나에 링크가 과도하게 몰린다.
- weekly review에서 해당 주제가 반복적으로 등장한다.

예를 들어 `Cache` hub가 48개 링크를 받기 시작하면 `Browser Cache`, `Server State Cache`, `React Cache`, `CDN Cache` 같은 하위 MOC를 만들 시점이다.

## Curated MOC 구조

Agent가 갱신하기 쉬운 MOC는 사람이 쓴 설명과 Agent가 관리하는 목록을 분리한다.

```md
# Frontend

프론트엔드 런타임, 상태 관리, 성능, React 내부 구조를 탐색하기 위한 MOC.

## Server State

<!-- agent-managed:start server-state -->
- [[React Query]]
- [[SWR]]
- [[Cache Invalidation]]
<!-- agent-managed:end -->

## React Internals

<!-- agent-managed:start react-internals -->
- [[Fiber]]
- [[Scheduler]]
- [[Concurrent Rendering]]
<!-- agent-managed:end -->
```

설명 문단은 사람이 유지하고, 목록은 Agent가 갱신한다. marker를 쓰면 patch 범위가 명확해지고, 사용자의 문장까지 재작성하는 위험을 줄일 수 있다.

## Query MOC

반대로 queue나 review dashboard는 동적 query가 낫다. 예를 들어 open question 목록은 매번 Markdown 목록을 갱신하지 않고 properties 기반 view로 만들 수 있다.

````md
# Research Queue

```dataview
TABLE status, created, file.link
FROM "questions"
WHERE status = "open"
SORT created DESC
```
````

Obsidian Bases를 쓰는 vault라면 `.base` 파일이나 embedded base로 비슷한 view를 만들 수 있다. Agent는 curated MOC와 query MOC를 구분해야 한다. curated MOC는 narrative navigation이고, query MOC는 current state dashboard다.

## MOC 갱신 알고리즘

MOC 갱신은 다음 순서로 처리한다.

1. 새 노트의 type, tags, aliases, related links를 읽는다.
2. 후보 MOC를 lexical/semantic/graph 기준으로 찾는다.
3. 후보 MOC의 agent-managed section을 찾는다.
4. 이미 포함된 링크인지 검사한다.
5. 섹션이 맞지 않으면 새 section 제안을 report한다.
6. diff를 생성한다.

MOC에 넣을 때는 노트 수를 제한한다. 모든 관련 노트를 MOC에 넣으면 MOC는 검색 결과와 다르지 않다. MOC는 "대표 경로"를 제공해야 한다.

## MOC 품질 검사

Agent는 주기적으로 MOC를 검사한다.

```text
MOC Doctor: moc/frontend.md

Missing candidates:
- [[RSC Cache Scope]] likely belongs to React Internals
- [[React Query Invalidation]] likely belongs to Server State

Stale links:
- [[Legacy Redux Middleware]] not updated for 420 days

Overloaded section:
- Performance has 31 links. Consider splitting.
```

이 report는 MOC를 자동으로 재작성하지 않는다. MOC는 사용자의 사고 지도이므로, 큰 구조 변경은 반드시 review 대상이다.

## 출처

- [Obsidian Help: Bases](https://obsidian.md/help/bases)
- [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
