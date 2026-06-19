# 4. Archive Agent 파이프라인

Archive Agent의 기본 명령은 다음처럼 단순해야 한다.

```bash
brain archive daily/2026-06-19.md
brain archive today
```

하지만 내부 파이프라인은 직접 파일을 고치는 단일 단계가 아니다.

```text
Daily Note
  ↓
Parser
  ↓
Classifier
  ↓
Candidate Note Planner
  ↓
Duplicate Detector
  ↓
Link/MOC Planner
  ↓
dry-run diff
  ↓
Apply
  ↓
Git Commit
  ↓
Archive Report
```

이 구조는 Agent가 추론한 결과와 실제 파일 변경을 분리한다. 개발자에게 중요한 것은 Agent가 "무엇을 하려고 했는지"와 "무엇을 실제로 바꿨는지"를 비교할 수 있어야 한다는 점이다.

## 파이프라인 단계별 책임

Parser는 Daily Note를 구조로 바꾼다. 이 단계에서는 판단하지 않는다. frontmatter, heading tree, section body, wikilink, markdown link, code block을 분리한다. Parser의 출력은 재현 가능해야 하며, 같은 파일을 두 번 파싱하면 같은 AST와 block list가 나와야 한다.

Classifier는 각 block의 의도를 판정한다. H2 heading이 `Insight`면 concept 후보로 시작하지만, 본문이 특정 프로젝트 이름을 강하게 포함하면 project update 후보로 바뀔 수 있다. Classifier는 결론뿐 아니라 confidence와 근거를 남긴다.

Candidate Note Planner는 실제 파일 변경 전 단계다. 새 노트를 만들지, 기존 노트에 append할지, 질문 큐로 보낼지, MOC를 갱신할지 계획한다. 이 계획은 JSON이나 Markdown report로 저장할 수 있어야 한다.

Duplicate Detector는 기존 vault와 후보 노트를 비교한다. lexical search로 alias와 파일명을 보고, semantic search로 의미상 가까운 노트를 찾고, graph search로 주변 연결을 본다.

Link/MOC Planner는 새 노트와 기존 노트 사이의 연결 후보를 만든다. 이 단계는 관련 링크를 많이 붙이는 것이 아니라, 탐색 가치가 있는 링크를 고르는 단계다.

dry-run diff는 계획을 실제 patch로 바꾼다. 사용자가 검토할 수 있는 unified diff가 이상적이다. 여기서부터는 LLM 출력이 아니라 deterministic patch generator가 맡는 편이 안전하다.

Apply는 파일을 수정한다. Apply 이후에는 validator가 SUMMARY 링크, broken wikilink, properties parse, duplicate section을 검사한다.

Git Commit은 적용 결과를 되돌릴 수 있는 단위로 묶는다. commit message에는 archive 대상 날짜와 주요 변경 요약을 넣는다.

Archive Report는 사용자가 다음 행동을 결정할 수 있게 만든다. 생성/수정 파일뿐 아니라 보류된 후보와 낮은 confidence 항목을 보여준다.

## 실행 산출물

Archive Agent는 최소 네 가지 산출물을 만든다.

- plan: 생성, 병합, 링크, MOC 갱신 후보
- diff: 실제 Markdown 변경안
- report: 생성 노트, 업데이트 노트, 링크 수, orphan 후보
- commit: 적용된 변경을 되돌릴 수 있는 Git 단위

이 중 plan과 diff는 기본적으로 사용자 승인 대상이다. 낮은 위험의 변경, 예를 들어 report 생성이나 read-only graph 분석은 자동 실행할 수 있다.

## Plan schema

Archive plan은 사람이 읽을 수 있으면서도 기계가 적용할 수 있어야 한다. 예시는 다음과 같다.

```json
{
  "source": "daily/2026-06-19.md",
  "run_id": "2026-06-19T22-10-00+09-00",
  "actions": [
    {
      "id": "act-001",
      "kind": "create_note",
      "risk": "medium",
      "confidence": 0.84,
      "target": "notes/frontend/react-query-invalidation.md",
      "title": "React Query Invalidation",
      "source_block": {
        "heading": "Insight",
        "index": 0
      },
      "provenance": ["[[2026-06-19]]"],
      "related": ["[[React Query]]", "[[Server State]]"]
    },
    {
      "id": "act-002",
      "kind": "append_section",
      "risk": "low",
      "confidence": 0.91,
      "target": "projects/search-api.md",
      "heading": "2026-06-19 Latency Investigation"
    }
  ]
}
```

`risk`는 자동 적용 여부를 결정하는 핵심 필드다. 예를 들어 `create_note`는 보통 medium, 기존 노트의 `## Related`에 링크를 추가하는 작업은 low, 기존 본문을 병합하거나 삭제하는 작업은 high로 둔다.

## 적용 정책

초기 운영에서는 다음 정책을 권장한다.

| Action | 기본 처리 |
| --- | --- |
| report 생성 | 자동 적용 |
| 새 question note 생성 | 자동 적용 가능 |
| 새 concept note 생성 | dry-run 후 승인 |
| project note append | dry-run 후 승인 |
| related link 추가 | confidence가 높으면 자동 적용 가능 |
| backlink 추가 | 승인 필요 |
| note merge | 항상 승인 필요 |
| note delete/move | 항상 승인 필요 |

이 정책은 보수적으로 보일 수 있지만, 개인 vault에서는 신뢰가 생산성보다 먼저다. 사용자가 몇 주 동안 report와 diff를 보고 Agent의 판단을 신뢰하게 되면 자동 적용 범위를 넓힐 수 있다.

## Lab: 작은 Archive Agent 실행하기

이 책의 `labs/brain-archive`에는 이 파이프라인의 축소 구현이 들어 있다. 외부 LLM이나 embedding 없이 Daily Note의 H2 section을 읽고, action plan을 만들고, dry-run diff를 출력한다.

```bash
cd labs/brain-archive
npm test
node src/brain-archive.mjs archive fixtures/vault/daily/2026-06-19.md --vault fixtures/vault --dry-run
```

이 lab은 production 구현이 아니다. 목적은 구조를 눈으로 확인하는 것이다. 특히 다음 경계를 코드로 확인할 수 있다.

- Parser는 section만 추출하고 파일을 수정하지 않는다.
- Planner는 action과 target path를 만든다.
- dry-run은 실제 파일 변경 없이 diff를 출력한다.
- apply는 명시적으로 `--apply`를 줄 때만 파일을 쓴다.

실제 Agent를 만들 때는 이 lab에 semantic search, graph doctor, confidence scoring, approval queue를 추가하는 방향으로 확장한다.

## 출처

- [jwhonce/obsidian-cli](https://github.com/jwhonce/obsidian-cli)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
- [Local lab: brain-archive](../labs/brain-archive/README.md)
