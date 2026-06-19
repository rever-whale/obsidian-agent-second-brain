# 6. 노트 타입 분류와 생성 계획

분류기는 Daily Note block을 받아 바로 파일을 만들지 않는다. 먼저 후보 계획을 만든다.

```json
{
  "source": "daily/2026-06-19.md#Insight",
  "type": "concept",
  "title": "React Query invalidateQueries",
  "action": "create_or_merge",
  "confidence": 0.82,
  "target": "notes/frontend/react-query-invalidatequeries.md"
}
```

이 계획은 사람이 읽을 수 있어야 하고, 나중에 실패 원인을 추적할 수 있어야 한다. 좋은 Agent 시스템은 추론 결과를 파일 변경과 섞지 않는다.

## 분류 기준

분류는 heading type, keyword, 기존 노트 유사도, 프로젝트 alias, 최근 작업 맥락을 함께 본다. 예를 들어 `검색 API latency 조사`는 단독 concept note가 아니라 `projects/search-api.md`에 병합될 가능성이 높다. 반면 `React Query invalidateQueries는 범위가 넓다`는 frontend concept note로 분리할 수 있다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [jwhonce/obsidian-cli](https://github.com/jwhonce/obsidian-cli)
