# 13. GitHub, Slack, Notion Ingest 확장

Archive Agent의 1차 입력은 Daily Note다. 하지만 개발자의 지식은 GitHub issue, PR, RFC, Slack thread, Notion 문서, web article에도 흩어져 있다. 확장 단계에서는 외부 입력을 vault의 capture protocol로 변환한다.

예시는 다음과 같다.

```bash
brain ingest github facebook/react
brain ingest pr https://github.com/org/repo/pull/123
brain ingest url https://example.com/article
```

중요한 점은 외부 데이터를 바로 curated note로 넣지 않는 것이다. 먼저 `inbox/ingest/`에 raw note를 만들고, Archive Agent가 같은 파이프라인으로 분류하게 한다. 그래야 출처, 요약, 링크, 중복 탐지 정책이 일관된다.

## GitHub repository ingest

GitHub repository ingest는 source tree 전체 요약이 아니다. 개발자 Second Brain 관점에서는 architecture term, recurring module, public API, design decision, issue pattern을 추출하는 것이 더 중요하다.

## Ingest는 archive와 같은 pipeline을 써야 한다

외부 입력을 특별 취급하면 vault가 빠르게 복잡해진다. GitHub PR, Slack thread, Notion page, web article은 형식만 다를 뿐 모두 raw capture다. 따라서 ingest는 다음 순서를 따른다.

```text
External Source
  ↓
Raw Ingest Note
  ↓
Archive Agent
  ↓
Curated Notes / Projects / Questions / MOC
```

Raw ingest note는 원본을 보존한다.

```yaml
---
type: ingest
source_type: github_pr
source_url: https://github.com/org/repo/pull/123
created: 2026-06-19
archive_status: pending
---
```

본문에는 원문 요약, 중요한 인용, 링크, Agent가 추출한 후보 topic을 둔다. 이후 archive pipeline이 Daily Note와 같은 방식으로 처리한다.

## GitHub PR ingest

PR은 개발자 Second Brain에 특히 좋은 입력이다. 코드 변경보다 중요한 것은 의사결정과 트레이드오프다.

Agent는 PR에서 다음을 추출한다.

- 문제 배경
- 변경된 public API
- migration note
- review에서 논의된 tradeoff
- follow-up task
- 관련 project note

예시 raw note:

```md
# PR 123: Search API cache key normalization

Source: https://github.com/org/repo/pull/123

## Summary

검색 API의 cache key에 locale과 experiment id를 명시적으로 포함하도록 변경했다.

## Decisions

- cache key normalization을 API boundary에서 수행한다.
- downstream service에서는 normalized key만 받는다.

## Follow-up

- 기존 Redis key cleanup 필요
- p95 latency 변화 확인
```

Archive Agent는 이 raw note에서 `Decision`, `Project`, `Question` 후보를 만든다.

## Slack/Notion ingest

Slack과 Notion은 noise가 많다. 모든 메시지를 vault에 넣으면 Second Brain이 아니라 archive dump가 된다. ingest 기준을 엄격히 둔다.

수집할 가치가 있는 항목:

- 의사결정
- 장애 원인과 해결
- 반복 질문
- 제품/아키텍처 방향 변경
- 회의 action item

수집하지 않을 항목:

- 단순 상태 공유
- 감탄, 확인, 짧은 승인
- 이미 project tracker에 있는 중복 task
- 출처 없이 복사된 긴 문서

Agent는 외부 수집보다 filtering을 더 잘해야 한다.

## Web reference ingest

web article은 `Reference` note로 들어간다. 중요한 것은 원문 전체 저장이 아니라, 왜 이 자료가 vault에 들어왔는지와 어떤 내부 노트에 연결되는지다.

```md
# TanStack Query Invalidation Guide

Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

## Why saved

React Query invalidateQueries의 matching semantics를 확인하기 위해 저장.

## Key points

- query key 기반 matching
- stale 처리와 background refetch 구분

## Related

- [[React Query Invalidation]]
- [[Server State]]
```

Reference note는 concept note가 아니다. Agent는 reference를 직접 지식으로 착각하지 말고, concept note로 정리할 후보를 따로 만들어야 한다.

## Privacy와 token budget

외부 ingest는 개인정보와 회사 기밀을 다룰 수 있다. 따라서 기본 정책은 local-first다. 외부 LLM에 보낼 내용은 최소화하고, 가능한 경우 metadata와 요약만 사용한다. Slack thread 전체나 PR diff 전체를 그대로 모델에 넣는 것은 token budget과 보안 양쪽에서 나쁘다.

개발자용 Agent는 ingest 단계에서 다음을 수행해야 한다.

- secret pattern redaction
- PII redaction
- 긴 thread chunking
- code diff 요약
- source URL과 timestamp 보존
- 원문과 요약의 분리 저장

## 출처

- [khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
- [Obsidian Help: Internal links](https://obsidian.md/help/links)
