# 2. Obsidian을 Agent용 로컬 지식 DB로 보기

Obsidian vault는 단순한 폴더가 아니다. Markdown 파일, YAML properties, wikilink, attachments, canvas, bases가 섞인 로컬 지식 DB다. 이 관점으로 보면 Agent는 Obsidian UI를 대신 클릭하는 자동화가 아니라, 파일 기반 데이터베이스를 읽고 갱신하는 운영자다.

Agent가 안정적으로 다루려면 vault를 세 계층으로 나눈다.

- Raw capture: `daily/`, `inbox/`
- Curated knowledge: `notes/`, `projects/`, `questions/`
- Navigation and reports: `moc/`, `reviews/`, `reports/`

폴더는 최종 분류의 유일한 기준이 아니라, Agent가 처리 범위를 좁히는 namespace다. 실제 의미는 note type, properties, internal links, backlinks, graph position이 함께 결정한다.

## Agent 친화적 note schema

모든 curated note에는 최소 properties를 둔다.

```yaml
---
type: concept
status: active
created: 2026-06-19
updated: 2026-06-19
source:
  - "[[2026-06-19]]"
aliases:
  - React Query invalidateQueries
---
```

Properties는 사람이 읽는 본문과 Agent가 처리하는 metadata의 경계를 만든다. Obsidian properties는 YAML로 저장되며, 링크와 날짜 같은 구조화 값을 둘 수 있다. 이 특성 덕분에 Agent는 본문을 매번 추론하지 않고도 상태, 타입, 출처, alias를 안정적으로 읽을 수 있다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Obsidian Help: Bases](https://obsidian.md/help/bases)
- [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
