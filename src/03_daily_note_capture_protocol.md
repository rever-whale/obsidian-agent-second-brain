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

## 타입별 기본 처리

- `Insight`: 독립 concept note 후보를 만든다.
- `Learn`: 학습 노트 또는 기존 concept note 확장 후보를 만든다.
- `Project`: `projects/` 문서에 병합한다.
- `Question`: `questions/` 또는 research queue로 이동한다.
- `Decision`: ADR 또는 project decision log에 연결한다.
- `Meeting`: 참석자, 결정, action item을 구조화한다.
- `Reference`: URL, 원문 제목, 요약, 관련 노트를 분리한다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Obsidian Help: Internal links](https://obsidian.md/help/links)
