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

## 분류는 action으로 끝나야 한다

분류 결과가 `Insight` 또는 `Project` 같은 label에서 끝나면 archive가 전진하지 않는다. Agent가 만들어야 하는 것은 label이 아니라 action이다.

| 입력 타입 | 가능한 action |
| --- | --- |
| Insight | `create_note`, `append_to_concept`, `link_only` |
| Learn | `create_learning_note`, `append_to_concept`, `create_research_task` |
| Project | `append_to_project`, `create_project_note`, `create_decision_candidate` |
| Question | `create_question`, `link_to_existing_question`, `mark_answered` |
| Decision | `append_decision_log`, `create_adr`, `link_to_project` |
| Meeting | `create_meeting_note`, `extract_actions`, `append_decisions` |
| Reference | `create_reference_note`, `append_source`, `link_to_concept` |

같은 `Insight`라도 기존 노트가 있으면 append가 맞고, 기존 노트가 없지만 의미가 충분히 독립적이면 create가 맞다. 너무 짧거나 애매하면 link_only 또는 review queue가 맞다.

## Confidence를 설명 가능하게 만든다

confidence는 LLM이 임의로 붙이는 점수가 아니라 근거의 조합이어야 한다. 예를 들어 다음 항목을 합쳐 판단한다.

- heading signal: Daily Note heading이 action과 잘 맞는가?
- lexical match: 기존 file name, alias, tag와 일치하는가?
- semantic match: embedding 유사도가 충분한가?
- graph context: 관련 cluster 안에 놓이는가?
- recency: 최근 작업 중인 project와 연결되는가?
- ambiguity: 같은 점수대 후보가 여러 개인가?

report에는 숫자만 보여주지 말고 근거를 함께 보여준다.

```text
Candidate: append_to_project projects/search-api.md
Confidence: 0.88
Why:
- "검색 API"가 project alias와 일치
- 최근 7일 내 projects/search-api.md가 업데이트됨
- block에 latency, Redis, DB index 등 기존 project keywords 포함
```

## Planning prompt의 역할

LLM을 쓴다면 prompt는 파일을 직접 쓰게 하지 말고 계획을 만들게 해야 한다. 좋은 planning prompt는 다음 정보를 준다.

- Daily block text
- 후보 note 목록과 짧은 summary
- 프로젝트 alias 목록
- MOC 목록
- graph quality constraints
- 허용 action set
- 출력 JSON schema

이렇게 하면 모델은 자유롭게 Markdown을 생성하는 대신 제한된 action 안에서 선택한다. 자동화 시스템에서는 창의적인 문장보다 제한된 선택지가 더 안전하다.

## 출처

- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [jwhonce/obsidian-cli](https://github.com/jwhonce/obsidian-cli)
