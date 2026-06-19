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
Dry-run Diff
  ↓
Apply
  ↓
Git Commit
  ↓
Archive Report
```

이 구조는 Agent가 추론한 결과와 실제 파일 변경을 분리한다. 개발자에게 중요한 것은 Agent가 "무엇을 하려고 했는지"와 "무엇을 실제로 바꿨는지"를 비교할 수 있어야 한다는 점이다.

## 실행 산출물

Archive Agent는 최소 네 가지 산출물을 만든다.

- plan: 생성, 병합, 링크, MOC 갱신 후보
- diff: 실제 Markdown 변경안
- report: 생성 노트, 업데이트 노트, 링크 수, orphan 후보
- commit: 적용된 변경을 되돌릴 수 있는 Git 단위

이 중 plan과 diff는 기본적으로 사용자 승인 대상이다. 낮은 위험의 변경, 예를 들어 report 생성이나 read-only graph 분석은 자동 실행할 수 있다.

## 출처

- [jwhonce/obsidian-cli](https://github.com/jwhonce/obsidian-cli)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
