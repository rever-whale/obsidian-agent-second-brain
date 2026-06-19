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

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
