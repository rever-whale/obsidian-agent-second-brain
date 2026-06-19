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

GitHub repository ingest는 source tree 전체 요약이 아니다. 개발자 second brain 관점에서는 architecture term, recurring module, public API, design decision, issue pattern을 추출하는 것이 더 중요하다.

## 출처

- [khoj-ai/khoj](https://github.com/khoj-ai/khoj)
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
- [Obsidian Help: Internal links](https://obsidian.md/help/links)
