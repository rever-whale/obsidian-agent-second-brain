# Brain Archive Dashboard Redesign Brief (Obsidian Plugin)

## Goal

Brain Archive를 "관리 대시보드(Admin Dashboard)"가 아닌 "작업 검토 및 적용(Review & Apply Workflow)" 도구로 재설계한다.

현재 UI는 정보가 분산되어 있고 모든 액션이 동일한 시각적 무게를 갖는다.

사용자의 실제 목적은:

> 어제 Daily Note를 빠르게 검토하고 Archive 작업을 안전하게 적용한 뒤 본업으로 돌아가는 것

이다.

따라서 디자인은 시스템 관리보다 "검토 → 적용" 흐름을 중심으로 구성되어야 한다.

---

# Product Context

Brain Archive는 Obsidian Vault 내부에서 Daily Note를 분석하여 다음과 같은 영구 노트 구조로 정리하는 도구이다.

* projects/
* decisions/
* meetings/
* notes/
* questions/

핵심 동작:

```text
Daily Note
    ↓
Dry-run
    ↓
Action Review
    ↓
Apply
    ↓
Archive Complete
```

Apply는 실제 파일 생성/수정/이동을 수행한다.

Dry-run은 안전하다.

Apply는 되돌릴 수 없다.

따라서 UX는 반드시:

```text
Review Before Apply
```

를 강하게 유도해야 한다.

---

# Design Philosophy

UI는 다음 제품들의 디자인 언어를 참고한다.

## Primary References

### GitHub Pull Request Review

이 워크플로우는 Brain Archive와 매우 유사하다.

```text
Code
 ↓
Diff
 ↓
Review
 ↓
Merge
```

↓

```text
Daily Note
 ↓
Dry-run
 ↓
Review
 ↓
Apply
```

Action Plan은 "변경 파일 목록"처럼 보여야 한다.

사용자는 적용 전에 반드시 검토한다.

---

### Linear

참고 요소:

* 높은 정보 밀도
* 개발자 중심 UI
* 과도한 카드 사용 금지
* 강한 위계
* 빠른 스캔 가능

---

### Raycast Extension Panels

참고 요소:

* 명령 중심 UX
* 좁은 폭에 최적화
* 최소한의 조작
* 결과 중심 인터페이스

---

### Obsidian Native UI

반드시 유지할 것:

* Obsidian Theme Variables 사용
* Obsidian Properties 느낌
* Obsidian Sidebar 패널과 자연스럽게 통합
* 외부 앱처럼 보이면 안 됨

---

# Avoid

다음 스타일은 사용하지 않는다.

## Admin Dashboard

예:

* Grafana
* Datadog
* Kibana

이 도구는 모니터링 시스템이 아니다.

---

## Notion Style

예:

* 과도한 여백
* 큰 카드
* 넓은 캔버스 전제

Obsidian Sidebar 폭에서는 비효율적이다.

---

## Material Dashboard

예:

* 통계 위젯
* 메트릭 카드
* KPI 중심 구조

제품 성격과 맞지 않는다.

---

# User Context

사용자:

* Daily Note를 매일 작성
* 개발자 또는 지식 노동자
* 하루 1회 사용
* 1~3분 내 완료 원함

사용자는:

"아카이브 시스템을 관리"

하려는 것이 아니라

"오늘 정리할 노트를 처리"

하려고 들어온다.

---

# Core UX Problem

현재 UI 문제:

1. Dry-run과 Apply가 같은 중요도로 보인다
2. Apply 위험성이 드러나지 않는다
3. Action Plan보다 Raw Output이 더 강조된다
4. CLI 패널이 메인 화면을 차지한다
5. Run Log가 과도하게 노출된다
6. 빈 상태 안내가 부족하다

---

# UX Strategy

## Principle 1

Action Plan이 화면의 주인공이다.

Raw Output은 전문가용이다.

---

## Principle 2

Apply는 Dry-run 이후에만 활성화된다.

---

## Principle 3

사용자는 항상

"무엇이 변경되는가"

를 먼저 본다.

---

# Recommended Information Architecture

현재:

```text
Header
Fields
Toolbar
Latest Output
Action Plan
CLI
Run Log
```

재구성:

```text
Header

Archive Target

Workflow Actions

Review Actions (Primary)

Raw Output (Collapsible)

Utilities (Collapsible)

History (Collapsible)
```

---

# Recommended Layout

```text
Archive Dashboard

Ready

────────────────────

Archive Target

Date
[ 2026-06-23 ]

Daily Note
[ daily/2026-06-23.md ]

────────────────────

STEP 1

[ Dry-run ]

────────────────────

Review Actions

No preview yet

Run Dry-run to inspect
archive actions.

No files are modified
until Apply.

────────────────────

Advanced ▼

History ▼
```

---

# After Dry-run

```text
Archive Dashboard

6 actions found

────────────────────

Archive Target

[ daily/2026-06-23.md ]

────────────────────

[ Re-run Dry-run ]
[ Apply Archive ]

────────────────────

Review Actions

6 changes

+ Decision
+ Project Update
+ Question
+ Note Merge

────────────────────

Applying will:

• create 4 files
• update 2 files
• move Daily Note

────────────────────

Raw Output ▼
```

---

# Apply Button Behavior

초기 상태:

```text
Apply
```

비활성

---

Dry-run 완료:

```text
Apply Archive
```

활성

---

Apply는:

* Primary CTA
* Accent Color 사용
* 가장 강한 시각적 강조

---

Tooltip:

```text
This action will:

• create files
• update notes
• move Daily Note

This action cannot be undone.
```

---

# Action Review Design

Action Plan을 현재 카드 나열 방식보다

GitHub PR Review 방식으로 구성한다.

예시:

```text
6 changes ready

────────────────

+ decisions/mw-fallback.md
Create Decision

Confidence 86%

────────────────

~ projects/bizspace.md
Append Project

Confidence 91%

────────────────

+ questions/ingress.md
Create Question
```

---

# Risk & Confidence

현재 메타칩은 의미 설명이 부족하다.

설계 요구:

Hover 또는 Info Icon 제공

Risk:

```text
How likely this action
modifies existing content.
```

Confidence:

```text
How confident the archive engine
is about this classification.
```

---

# Empty State

빈 상태는 반드시 개선한다.

예시:

```text
No archive preview yet

Select a Daily Note
and run Dry-run.

Brain Archive will:

• extract projects
• capture decisions
• create questions
• link notes

No files are modified
until Apply.
```

---

# Utilities

다음 기능은 보조 기능으로 강등:

* Graph Doctor
* Similar
* Write Report
* Bootstrap

접을 수 있는 섹션으로 이동.

---

# CLI Commands

메인 UI에서 제거.

Advanced 영역으로 이동.

기본 상태:

```text
Advanced ▼
```

---

# Run Log

기본 노출 금지.

대신:

```text
Recent Activity

Last archive:
Today 18:32

6 actions applied

View History ▼
```

---

# Visual Style

Use:

* Obsidian CSS Variables only
* Dense layout
* Minimal cards
* Strong hierarchy
* Compact spacing
* Sidebar-first design

The interface should feel like:

```text
GitHub Review
+
Linear
+
Raycast
+
Obsidian
```

and never like:

```text
Admin Dashboard
```

---

# Technical Constraints

Must use:

* Pure CSS
* Obsidian DOM APIs
* Lucide Icons
* Theme Variables

Must not use:

* React
* Vue
* Tailwind
* External UI Frameworks
* Hardcoded colors

---

# Accessibility

Required:

* Full keyboard navigation
* Focus ring visibility
* Enter to confirm autocomplete
* Arrow key navigation
* Proper aria-label usage
* Dark/Light theme compatibility

---

# Do Not Change

다음은 디자인 대상이 아니다.

* Dry-run 기능
* Apply 로직
* archive_status 처리
* Daily Note 이동 정책
* CLI command 생성 로직
* Graph Doctor 동작
* Similar 검색 동작
* Write Report 동작
* Idempotent 처리 방식

디자인은 동작을 바꾸는 것이 아니라

"Review → Apply Workflow"

를 가장 자연스럽게 만드는 방향으로 개선해야 한다.
