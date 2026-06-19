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

## 링크 품질 기준

- 링크 대상이 실제로 존재해야 한다.
- alias가 필요한 경우 display text를 명시한다.
- 같은 섹션에 같은 링크를 중복 삽입하지 않는다.
- 너무 일반적인 hub note만 반복해서 연결하지 않는다.
- source daily note로 돌아갈 수 있는 provenance link를 남긴다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections)
- [kartikkabadi/obsidian-vault-graph](https://github.com/kartikkabadi/obsidian-vault-graph)
