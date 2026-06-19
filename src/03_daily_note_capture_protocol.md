# 3. Daily Note를 Capture Protocol로 설계하기

Daily Note는 자유 기록장이지만 완전히 자유로우면 Agent가 매번 문맥을 추론해야 한다. 반대로 양식이 지나치게 빡빡하면 사용자는 기록을 멈춘다. 이 책의 기준은 "사람에게는 느슨하고 Agent에게는 충분히 구조적인" capture protocol이다.

권장 타입은 다음 일곱 가지다.

```text
Insight
Learn
Project
Question
Decision
Meeting
Reference
```

예시는 다음과 같다.

```md
# 2026-06-19

## Insight

React Query invalidateQueries는 생각보다 범위가 넓다.

## Learn

RSC cache() 동작 다시 보기

## Project

검색 API latency 조사

- Redis miss
- DB index

## Question

Server Component에서 cache 범위는 어디까지인가?
```

Agent는 H2 heading을 1차 분류 신호로 사용하고, 각 block의 본문을 semantic search와 기존 note graph에 매칭한다.

## Protocol은 입력 최적화다

Daily Note protocol은 사용자를 통제하기 위한 양식이 아니다. Agent의 입력 품질을 높이기 위한 최소 힌트다. LLM은 자유 문장도 분류할 수 있지만, 매일 수십 개의 조각을 안정적으로 archive하려면 분류 신호가 반복 가능해야 한다.

`Insight`, `Learn`, `Project`, `Question`, `Decision`, `Meeting`, `Reference`는 다음 균형을 맞춘다.

- 사람이 쓰기에 부담이 적다.
- Agent가 action type을 결정하기 쉽다.
- 나중에 review와 graph report로 집계하기 쉽다.
- 다른 PKM 방법론이나 Obsidian 플러그인에 강하게 종속되지 않는다.

이 protocol은 완전한 taxonomy가 아니다. `Debug`, `Idea`, `Todo`, `Book`, `Paper` 같은 heading을 더 만들고 싶을 수 있다. 하지만 초기에 타입을 늘리면 Agent 정책도 함께 늘어난다. 운영이 안정되기 전까지는 적은 타입으로 시작하고, 반복적으로 잘못 분류되는 기록이 생길 때만 타입을 추가한다.

## 타입별 기본 처리

- `Insight`: 독립 concept note 후보를 만든다.
- `Learn`: 학습 노트 또는 기존 concept note 확장 후보를 만든다.
- `Project`: `projects/` 문서에 병합한다.
- `Question`: `questions/` 또는 research queue로 이동한다.
- `Decision`: ADR 또는 project decision log에 연결한다.
- `Meeting`: 참석자, 결정, action item을 구조화한다.
- `Reference`: URL, 원문 제목, 요약, 관련 노트를 분리한다.

## 타입별 권장 작성 패턴

`Insight`는 한 문장 관찰로 시작해도 된다. 다만 Agent가 제목을 만들 수 있도록 핵심 명사를 포함하는 편이 좋다.

```md
## Insight

React Query invalidateQueries는 prefix matching 때문에 생각보다 넓은 범위의 query를 invalidation할 수 있다.
```

`Project`는 프로젝트 이름이나 식별자를 포함해야 한다.

```md
## Project

Search API latency 조사.

- p95가 800ms까지 상승
- Redis miss 증가 의심
- product_search_events의 created_at index 확인 필요
```

`Decision`은 선택과 이유를 구분해야 한다.

```md
## Decision

검색 API 캐시 TTL은 5분으로 유지한다.

이유:
- admin 반영 지연을 5분 안으로 제한해야 한다.
- TTL을 30분으로 늘리면 장애 시 stale response가 커진다.
```

`Reference`는 URL만 붙이는 것으로 끝내지 않는다. Agent가 출처 노트를 만들 수 있도록 왜 저장했는지 한 줄을 남긴다.

```md
## Reference

https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

React Query invalidateQueries의 matching semantics를 다시 확인할 자료.
```

## Anti-pattern

가장 흔한 anti-pattern은 Daily Note를 이미 정리된 문서처럼 쓰는 것이다. Daily Note 안에서 너무 많은 링크와 nested heading을 만들면 archive 단계에서 block 경계가 흐려진다. Daily Note는 최종 문서가 아니라 capture log다.

피해야 할 예시는 다음과 같다.

```md
## Frontend

### React Query

#### Invalidation

...
```

이 구조는 사람이 보기에는 정돈되어 보이지만 Agent에게는 "Insight인지 Learn인지 Project인지"가 불명확하다. 차라리 다음처럼 쓰는 편이 낫다.

```md
## Insight

React Query invalidation은 key prefix 때문에 예상보다 넓게 적용될 수 있다.

## Learn

React Query query matching 문서를 다시 읽기.
```

## 최소 frontmatter

Daily Note에도 최소 properties를 둘 수 있다.

```yaml
---
type: daily
date: 2026-06-19
archive_status: pending
---
```

`archive_status`는 Agent가 중복 처리를 피하게 해준다. `pending`, `planned`, `archived`, `skipped` 정도면 충분하다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Obsidian Help: Internal links](https://obsidian.md/help/links)
