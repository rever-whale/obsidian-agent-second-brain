# 2. Obsidian을 Agent용 로컬 지식 DB로 보기

Obsidian vault는 단순한 폴더가 아니다. Markdown 파일, YAML properties, wikilink, attachments, canvas, bases가 섞인 로컬 지식 DB다. 이 관점으로 보면 Agent는 Obsidian UI를 대신 클릭하는 자동화가 아니라, 파일 기반 데이터베이스를 읽고 갱신하는 운영자다.

Agent가 안정적으로 다루려면 vault를 세 계층으로 나눈다.

- Raw capture: `daily/`, `inbox/`
- Curated knowledge: `notes/`, `projects/`, `questions/`
- Navigation and reports: `moc/`, `reviews/`, `reports/`

폴더는 최종 분류의 유일한 기준이 아니라, Agent가 처리 범위를 좁히는 namespace다. 실제 의미는 note type, properties, internal links, backlinks, graph position이 함께 결정한다.

## 파일 시스템 위의 지식 DB

일반적인 데이터베이스에는 schema, index, query, migration, backup이 있다. Obsidian vault에도 같은 개념을 대응시킬 수 있다.

| DB 개념 | Obsidian vault 대응 |
| --- | --- |
| row/document | Markdown note |
| schema | YAML properties와 heading convention |
| relation | wikilink, markdown link, backlink |
| index | 파일명, alias, tag, Dataview/Bases, embedding index |
| query | Obsidian search, Dataview, Bases, CLI search |
| migration | note rename, property rename, folder move |
| backup/rollback | Git commit, sync history, export |

이 대응을 명확히 하면 Agent 설계가 단단해진다. Agent는 "메모 앱을 쓰는 사용자"가 아니라 "로컬 지식 DB에 transaction을 제안하는 프로세스"가 된다. 따라서 모든 쓰기 작업은 입력, 계획, 변경, 검증, rollback 단위를 가져야 한다.

## 권장 vault contract

Agent가 안정적으로 작업하려면 vault에 최소 contract가 필요하다. contract는 사용자를 묶기 위한 규칙이 아니라, Agent가 매번 추론하지 않아도 되는 약속이다.

```text
vault/
  daily/                 # 사람이 당일 기록을 남기는 곳
  inbox/                 # 외부 ingest와 미처리 메모
  notes/                 # concept, pattern, reference note
  projects/              # 진행 중/완료된 프로젝트별 기록
  questions/             # research queue
  decisions/             # ADR, 설계 결정, 회의 결정
  moc/                   # curated navigation note
  reviews/               # weekly/monthly review
  reports/               # archive report와 graph report
  archive/               # 처리 완료된 raw note 또는 snapshot
```

이 구조에서 `daily/`와 `inbox/`는 쓰기 마찰을 낮추는 공간이다. `notes/`, `projects/`, `questions/`, `decisions/`는 Agent가 정제한 지식 공간이다. `moc/`, `reviews/`, `reports/`는 사람이 다시 vault를 읽고 판단하는 navigation layer다.

중요한 것은 폴더 깊이를 초기에 과도하게 만들지 않는 것이다. 예를 들어 `notes/frontend/react/server-components/cache/`처럼 깊은 폴더를 먼저 만들면 Agent는 위치 선택 문제에 빠진다. 초기에는 얕은 namespace와 강한 metadata가 더 낫다.

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

## Note type을 먼저 고정한다

폴더보다 먼저 고정해야 하는 것은 note type이다. 이 책에서는 최소 타입을 다음처럼 둔다.

| type | 목적 | 대표 위치 |
| --- | --- | --- |
| `concept` | 재사용 가능한 개념 설명 | `notes/` |
| `project` | 특정 업무/제품/실험의 진행 맥락 | `projects/` |
| `question` | 아직 답하지 못한 탐구 주제 | `questions/` |
| `decision` | 선택, 근거, 트레이드오프 | `decisions/` |
| `reference` | 외부 자료 요약과 출처 | `notes/` 또는 `archive/` |
| `moc` | 주제 탐색 지도 | `moc/` |
| `review` | 기간별 회고와 다음 action | `reviews/` |

Agent는 이 타입을 기준으로 서로 다른 merge 정책을 적용한다. `concept`는 중복 병합이 중요하고, `project`는 시간순 append가 중요하며, `decision`은 원문 보존과 provenance가 중요하다. 모든 note를 같은 방식으로 append하면 vault는 빠르게 무너진다.

## Local-first가 주는 장점

Obsidian이 로컬 Markdown 파일을 기반으로 한다는 점은 Agent 설계에 큰 장점이다. 파일은 Git으로 versioning할 수 있고, diff를 검토할 수 있으며, 특정 도구에 종속되지 않는다. Agent가 실패해도 Git commit 전이면 되돌릴 수 있고, commit 후에도 revert할 수 있다.

반대로 이 장점은 책임도 만든다. Agent가 파일을 직접 수정할 수 있다는 것은 vault를 직접 손상시킬 수도 있다는 뜻이다. 그래서 이 책은 Obsidian을 API가 있는 SaaS가 아니라 "로컬 파일 DB"로 다룬다. 파일 DB를 다루는 자동화에는 lock, patch 범위, backup, validation, transaction log가 필요하다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Obsidian Help: Bases](https://obsidian.md/help/bases)
- [blacksmithgu/obsidian-dataview](https://github.com/blacksmithgu/obsidian-dataview)
