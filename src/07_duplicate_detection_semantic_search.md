# 7. 중복 탐지와 Semantic Search

중복 탐지는 파일명 일치만으로 충분하지 않다. 개발자 vault에서는 같은 개념이 다른 이름으로 반복된다. 예를 들어 `RSC cache`, `React cache()`, `Server Component cache scope`는 같은 지식 영역에 속할 수 있다.

Agent는 세 가지 검색을 조합한다.

- lexical search: 파일명, alias, exact keyword
- graph search: 이미 연결된 주변 노트
- semantic search: embedding 기반 유사도

Semantic search는 의미가 가까운 노트를 찾는 데 강하지만, 항상 병합 근거가 되지는 않는다. 유사도 높은 노트가 있으면 Agent는 `merge`, `append`, `link`, `ignore` 중 하나를 제안해야 한다.

## 중복 처리 정책

- 같은 개념이고 기존 노트가 충분히 일반적이면 append한다.
- 같은 주제지만 관점이 다르면 related link를 추가한다.
- 프로젝트 맥락에 묶인 기록이면 project note에 남기고 concept note와 링크한다.
- confidence가 낮으면 research queue 또는 manual review로 보낸다.

## 출처

- [brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections)
- [khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- [SGPT: GPT Sentence Embeddings for Semantic Search](https://arxiv.org/abs/2202.08904)
