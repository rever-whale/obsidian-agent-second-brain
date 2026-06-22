# 학습 개요

이 책은 Obsidian을 사람이 직접 정리하는 개인 지식 관리 앱으로 쓰는 방법을 다루지 않는다. 핵심 목표는 Obsidian vault를 로컬 Markdown 지식 DB로 보고, AI Agent가 Daily Note를 읽어 노트를 분리하고, 링크를 제안하고, MOC를 갱신하고, graph 품질을 점검하는 운영 시스템을 설계하는 것이다.

사용자는 하루 동안 자유롭게 기록한다. 작성 시점에는 폴더, 태그, 링크, MOC를 고민하지 않는다. 정리의 책임은 Archive Agent가 맡는다. 다만 이 책은 완전 자동 수정을 전제로 하지 않는다. 개발자 독자가 실제로 신뢰할 수 있도록 `plan -> dry-run diff -> apply -> git commit -> report` 루프를 기본 안전장치로 삼는다.

핵심 문장은 다음과 같다.

> 사람은 기록의 마찰을 줄이고, Agent는 구조화의 부채를 갚는다.

## 대상 독자

대상 독자는 Obsidian을 써 본 보통의 소프트웨어 개발자다. Markdown, Git, CLI, JSON/YAML, 간단한 검색과 스크립트 자동화에는 익숙하지만, 개인 vault를 Agent가 지속적으로 정리하는 구조를 직접 설계해 본 경험은 없다고 가정한다.

Obsidian 입문서가 아니므로 노트 작성 UI, 기본 플러그인 사용법, PKM 방법론의 역사 설명은 최소화한다. 대신 다음 질문에 집중한다.

- Daily Note를 Agent가 해석하기 쉬운 capture protocol로 만들려면 무엇을 고정해야 하는가?
- Markdown 파일을 안전하게 읽고 고치려면 문자열 치환 대신 어떤 파싱/패치 전략이 필요한가?
- semantic search와 graph analysis를 어떻게 함께 써야 중복 노트와 고립 노트를 줄일 수 있는가?
- Agent가 vault를 망가뜨리지 않게 하려면 dry-run, diff, rollback, confidence score를 어디에 둬야 하는가?

## 이 책의 산출물

- Agent가 처리하기 쉬운 Obsidian vault 구조
- Daily Note 타입 규칙: Insight, Learn, Project, Question, Decision, Meeting, Reference
- Archive Agent 파이프라인 설계
- Markdown/Properties/Wikilink 파싱 기준
- 중복 탐지, 링크 추천, backlink 보강, MOC 갱신 전략
- graph 품질 리포트: orphan, hub, bridge, broken link, knowledge gap
- CLI 초안: `brain archive`, `brain suggest-links`, `brain review weekly`
- 안전장치: dry-run diff, Git rollback, 수동 승인 큐
- 실행 가능한 로컬 lab: `labs/brain-archive`
- Part 5 따라하기 가이드: 빈 vault 생성, Daily Note 작성, dry-run, apply, report 작성
- GitHub Pages publish workflow: `.github/workflows/deploy.yml`

## 현재 완료 상태

현재 원고는 1차 집필, 로컬 lab 구현, mdBook 검증, GitHub Pages workflow 구성, 최종 편집, 출판 전 QA를 마친 publish-ready 상태다. 책의 핵심 흐름인 `Daily Note -> Archive Agent -> dry-run diff -> apply -> graph doctor -> similar search -> report`는 본문과 lab으로 연결되어 있다. Part 5는 이 흐름을 빈 vault에서 그대로 따라 하는 how-to 절차로 묶는다.

출판 전 QA 기준에서 남은 필수 작업은 없다. 이후 작업은 독자 피드백을 반영한 개정판 또는 production embedding index, approval queue 같은 심화 lab 확장이다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [Obsidian Help: Graph view](https://obsidian.md/help/plugins/graph)
- [How People Manage Knowledge in their Second Brains](https://arxiv.org/abs/2509.20187)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [brianpetro/obsidian-smart-connections](https://github.com/brianpetro/obsidian-smart-connections)
