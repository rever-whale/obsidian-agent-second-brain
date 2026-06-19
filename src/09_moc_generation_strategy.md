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

## 출처

- [Obsidian Help: Bases](https://obsidian.md/help/bases)
- [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
