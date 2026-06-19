# 7. 중복 탐지와 Semantic Search

중복 탐지는 파일명 일치만으로 충분하지 않다. 개발자 vault에서는 같은 개념이 다른 이름으로 반복된다. 예를 들어 `RSC cache`, `React cache()`, `Server Component cache scope`는 같은 지식 영역에 속할 수 있다.

Agent는 세 가지 검색을 조합한다.

- lexical search: 파일명, alias, exact keyword
- graph search: 이미 연결된 주변 노트
- semantic search: embedding 기반 유사도

Semantic search는 의미가 가까운 노트를 찾는 데 강하지만, 항상 병합 근거가 되지는 않는다. 유사도 높은 노트가 있으면 Agent는 `merge`, `append`, `link`, `ignore` 중 하나를 제안해야 한다.

## 세 검색의 역할 분담

Lexical search는 정확한 이름을 찾는 데 강하다. `React Query`, `invalidateQueries`, `RSC cache`처럼 명시적인 단어가 있을 때 빠르고 설명 가능하다. 하지만 표현이 달라지면 놓친다.

Semantic search는 표현이 다른 유사 개념을 찾는 데 강하다. `server state invalidation`과 `React Query cache refresh`처럼 단어가 달라도 가까운 후보를 찾을 수 있다. 하지만 "가깝다"가 곧 "같다"는 뜻은 아니다.

Graph search는 이미 vault가 알고 있는 문맥을 사용한다. 후보 노트가 같은 MOC 아래에 있거나, 같은 project note에서 자주 참조되거나, 같은 hub 주변에 있으면 관련 가능성이 높다.

좋은 duplicate detector는 세 결과를 합친 뒤, 병합 여부는 보수적으로 판단한다.

```text
duplicate_score =
  0.35 * lexical_alias_score
  + 0.35 * semantic_similarity
  + 0.20 * graph_neighborhood_score
  + 0.10 * recency_score
  - ambiguity_penalty
```

점수 공식은 반드시 이 형태일 필요는 없다. 중요한 것은 검색 결과를 단일 embedding score로 환원하지 않는 것이다.

## 중복 처리 정책

- 같은 개념이고 기존 노트가 충분히 일반적이면 append한다.
- 같은 주제지만 관점이 다르면 related link를 추가한다.
- 프로젝트 맥락에 묶인 기록이면 project note에 남기고 concept note와 링크한다.
- confidence가 낮으면 research queue 또는 manual review로 보낸다.

## 병합 금지 사례

중복처럼 보여도 병합하면 안 되는 경우가 있다.

- 같은 기술이지만 서로 다른 프로젝트 사건이다.
- 같은 키워드지만 하나는 개념 설명이고 하나는 의사결정 기록이다.
- 같은 URL을 참조하지만 서로 다른 관찰을 담고 있다.
- 같은 error message지만 원인이 다르다.
- 오래된 note가 역사적 기록으로 남아야 한다.

예를 들어 `React Query invalidateQueries`와 `Search API latency incident`가 둘 다 cache invalidation을 언급할 수 있다. 하지만 하나는 frontend server state 개념이고, 다른 하나는 특정 project incident다. 이 둘은 병합 대상이 아니라 링크 대상이다.

## Candidate review UI

CLI만으로도 충분한 review UI를 만들 수 있다.

```text
Duplicate candidates for "RSC cache scope"

1. notes/frontend/react-server-components.md
   similarity: 0.82
   graph: Frontend MOC > React Internals
   recommendation: append section

2. questions/server-component-cache-scope.md
   similarity: 0.79
   graph: Research Queue
   recommendation: link and mark duplicate question

3. notes/web/browser-cache.md
   similarity: 0.64
   graph: Performance MOC
   recommendation: related link only
```

사용자가 선택하면 Agent는 선택 결과를 다음 archive의 few-shot example처럼 활용할 수 있다. 개인 vault에서는 사용자의 판단 자체가 가장 좋은 training signal이다.

## 출처

- [brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections)
- [khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- [SGPT: GPT Sentence Embeddings for Semantic Search](https://arxiv.org/abs/2202.08904)
