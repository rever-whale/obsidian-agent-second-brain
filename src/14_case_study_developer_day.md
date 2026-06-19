# 14. 사례 연구: 개발자의 하루를 아카이빙하기

이 장은 하나의 Daily Note가 archive pipeline을 거쳐 어떤 파일 변경으로 바뀌는지 끝까지 추적한다.

입력은 다음과 같은 하루 기록이다.

```md
# 2026-06-19

## Insight

React Query invalidateQueries는 생각보다 범위가 넓다.

## Project

검색 API latency 조사.
원인 후보는 Redis miss와 DB index.

## Question

Server Component에서 cache 범위는 어디까지인가?
```

Archive Agent는 세 가지 작업을 계획한다.

- `notes/frontend/react-query-invalidatequeries.md` 생성 또는 기존 `React Query` 노트에 병합
- `projects/search-api.md`에 latency 조사 섹션 추가
- `questions/rsc-cache-scope.md` 생성

그 다음 related link 후보, MOC 갱신 후보, graph quality report를 만든다. 이 장에서는 dry-run diff와 apply report를 실제 Markdown diff 형태로 제시한다.

## Step 1. Parse

Parser는 입력을 세 block으로 나눈다.

```json
[
  {
    "heading": "Insight",
    "text": "React Query invalidateQueries는 생각보다 범위가 넓다."
  },
  {
    "heading": "Project",
    "text": "검색 API latency 조사. 원인 후보는 Redis miss와 DB index."
  },
  {
    "heading": "Question",
    "text": "Server Component에서 cache 범위는 어디까지인가?"
  }
]
```

이 단계에서는 아직 파일을 만들지 않는다. parse 결과가 안정적이어야 이후 단계의 판단을 재현할 수 있다.

## Step 2. Plan

Planner는 다음 action을 만든다.

```json
{
  "source": "daily/2026-06-19.md",
  "actions": [
    {
      "kind": "create_or_merge",
      "target": "notes/frontend/react-query-invalidation.md",
      "type": "concept",
      "confidence": 0.82,
      "risk": "medium"
    },
    {
      "kind": "append_section",
      "target": "projects/search-api.md",
      "heading": "2026-06-19 Latency Investigation",
      "confidence": 0.9,
      "risk": "medium"
    },
    {
      "kind": "create_question",
      "target": "questions/rsc-cache-scope.md",
      "confidence": 0.86,
      "risk": "low"
    }
  ]
}
```

`create_question`은 low risk지만, project note append와 concept note 생성은 기존 구조에 영향을 주므로 dry-run 승인 대상으로 둔다.

## Step 3. Diff

Dry-run diff는 다음처럼 보여줄 수 있다.

```diff
diff --git a/questions/rsc-cache-scope.md b/questions/rsc-cache-scope.md
new file mode 100644
--- /dev/null
+++ b/questions/rsc-cache-scope.md
@@
+---
+type: question
+status: open
+created: 2026-06-19
+source:
+  - "[[2026-06-19]]"
+---
+
+# RSC Cache Scope
+
+## Question
+
+Server Component에서 `cache()`의 범위는 어디까지인가?
+
+## Research Notes
+
+- React Server Component request lifecycle 확인 필요
+- framework-level cache와 React `cache()`의 차이 확인 필요
+
+## Related
+
+- [[React Server Components]]
+- [[Server State]]
+- [[Cache]]
```

```diff
diff --git a/projects/search-api.md b/projects/search-api.md
@@
+## 2026-06-19 Latency Investigation
+
+Source: [[2026-06-19]]
+
+검색 API p95 latency 상승 원인 후보:
+
+- Redis miss 증가
+- DB index 부재 또는 selectivity 저하
+
+Next:
+
+- Redis hit ratio 확인
+- product search query의 execution plan 확인
```

## Step 4. Report

적용 후 report는 다음처럼 작성한다.

```text
Archive Result: 2026-06-19

Created:
- questions/rsc-cache-scope.md
- notes/frontend/react-query-invalidation.md

Updated:
- projects/search-api.md
- moc/frontend.md

Links added:
- [[React Query]]
- [[Server State]]
- [[Cache Invalidation]]
- [[React Server Components]]

Manual review:
- Existing note [[Cache]] is too broad. Suggested split: Browser Cache, Server State Cache, React Cache.

Graph:
- orphan ratio: 8.1% -> 7.9%
- broken links: unchanged
```

이 report는 사용자가 "오늘 Agent가 무엇을 했는가"를 한눈에 확인하게 한다. 좋은 report는 변경량을 자랑하지 않고, 다음 판단에 필요한 정보를 준다.

## Lab으로 재현하기

이 사례는 `labs/brain-archive` fixture로 재현할 수 있다.

```bash
cd labs/brain-archive
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
```

출력은 세 파일에 대한 diff를 만든다.

- `notes/frontend/react-query-invalidation.md`
- `projects/search-api.md`
- `questions/rsc-cache-scope.md`

여기서 중요한 것은 diff가 "정답"이라는 뜻이 아니라는 점이다. diff는 Agent의 제안이다. 사용자는 이 제안이 맞는지 보고, 필요하면 target path나 제목, related link를 조정한다. Agent 기반 Second Brain의 첫 단계는 완전 자동화가 아니라 검토 가능한 자동화다.

테스트도 함께 실행한다.

```bash
npm test
```

테스트는 parser, planner, dry-run diff, apply 동작을 확인한다. 실무 구현에서는 여기에 broken link 검사, properties schema 검사, graph metric regression test를 추가한다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Local lab: brain-archive](../labs/brain-archive/README.md)
