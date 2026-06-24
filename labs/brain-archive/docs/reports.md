# Brain Archive — Dashboard Plugin Design Brief

> 이 문서는 클로드 디자인 에이전트에게 **현재 플러그인 화면 개선 요청**과 함께 전달하기 위한 기획 브리프입니다. 스크린샷과 함께 첨부됩니다.

---

## 1. 한 줄 요약

Obsidian vault 안에서 Daily Note를 분해해 영구 노트(`projects/`, `decisions/`, `questions/`, `meetings/`, `notes/`)로 **archive**하는 워크플로우를, **single-pane control surface**(좌측 ribbon 아이콘 → 우측 사이드 panel)로 제공하는 플러그인입니다. 이 화면(이하 **Archive Dashboard**)이 디자인 개선 대상입니다.

## 2. 대상 사용자와 사용 상황

- **사용자**: 매일 Daily Note(`daily/YYYY-MM-DD.md`)를 쓰는 1인 사용자. 개발자 또는 지식 노동자.
- **상황**: 하루 끝 또는 다음 날 아침에 Obsidian을 열고, 어제의 Daily Note를 정리(archive)해서 영구 노트 구조로 옮긴다.
- **빈도**: 매일 1회, 1~3분 안에 끝나야 한다. 의식적인 "정리 시간"이 아니라 **루틴**이어야 한다.
- **마음 상태**: 빠르게 처리하고 본업으로 돌아가고 싶다. 결과를 한눈에 확인하고 마우스 클릭 한두 번으로 끝내고 싶다.

## 3. 멘탈 모델 — 사용자가 머릿속으로 그리는 흐름

```
[어제의 Daily Note]
   ↓ Dry-run (미리보기)
[6개의 archive action 후보]   ← 이 단계에서 사람이 확인
   ↓ Apply (실행)
[영구 노트 폴더 6개 생성/append]
[Daily Note는 archive/daily/로 이동, frontmatter에 archived 표시]
   ↓ Graph Doctor / Similar (선택)
[정리 후 건강 점검: 고아 노트, 깨진 링크, 중복 후보]
```

핵심은 **"Dry-run → Apply"** 의 2-step 안전장치입니다. Apply는 파일을 실제로 만들고 옮기므로, 사용자가 미리보기를 확인하고 진행한다는 신뢰감이 디자인의 중심이 되어야 합니다.

## 4. 현재 화면 구조 (스크린샷의 각 영역에 매핑)

화면은 **세로 stack**으로 다음 영역이 위에서 아래로 배치됩니다:

1. **Header**
   - 좌측: 작은 eyebrow 라벨 `brain-archive` + 큰 제목 `Archive Dashboard`
   - 우측: `Idle` / `Running …` 상태 칩

2. **Fields (입력 영역)** — 2열 grid
   - `Date` — 오늘 날짜 (`YYYY-MM-DD`), 수동 수정 가능
   - `Daily Note` (wide) — archive 대상 Daily Note 경로. **자동완성**: 우측 `List` 버튼 또는 입력 중 fuzzy match로 후보 드롭다운
   - `Similar Note` (wide) — 유사 노트 검색 기준이 되는 노트 경로. 동일하게 자동완성 제공

3. **Toolbar — 6개 액션 버튼** (3열 grid, 2줄)
   - `Bootstrap` — vault에 필요한 폴더와 템플릿을 1회 생성 (안전, idempotent)
   - **`Dry-run`** — 가장 자주 누름. 미리보기. **파일 변경 없음**
   - **`Apply`** — 실제 실행. **파일 생성/이동**. 가장 위험한 액션
   - `Graph Doctor` — vault 전체 health 리포트 (read-only)
   - `Similar` — 유사 노트 후보 검색 (read-only)
   - `Write Report` — 오늘의 archive 리포트 markdown 작성

4. **Latest Output panel**
   - 가장 최근 실행 결과의 텍스트 출력 (`<pre>`로 monospace 표시)
   - 우측 상단 `Copy` 버튼
   - dry-run인 경우: archive 액션별 diff 텍스트
   - apply인 경우: 변경된 파일 리스트 + 이동된 Daily Note 경로
   - graph/similar인 경우: 보고서 텍스트

5. **Action Plan panel**
   - Dry-run 결과에서 파싱된 액션 카드 리스트 (위 Output과 같은 정보를 정형화한 뷰)
   - 카드 1개당:
     - 굵게: target 경로 (예: `decisions/위자드/mw/fallback-정책.md`)
     - 메타 칩 3개: `kind` (예: `create_decision_note`), `risk: low|medium|high`, `confidence: 0.0~1.0`
     - 작은 글씨: `<source heading> -> <target title>`
   - 우측 상단: `N actions` 카운터

6. **CLI Commands panel** (플러그인 전용, 웹 dashboard에는 없음)
   - 현재 입력값 기준으로 등가의 CLI 명령 4줄을 보여줌 (dry-run / apply / graph / similar)
   - 사용자가 터미널에서 같은 작업을 재현하거나 자동화 스크립트에 붙여넣기 위한 용도
   - 우측 상단 `Copy` 버튼

7. **Run Log panel**
   - 실행 이력 (최신이 위). 각 항목: 시각, 액션 라벨, summary, output `<pre>`
   - 우측 상단 `Clear` 버튼

## 5. 기능별 인터랙션 명세

| 버튼 | 입력 | 결과 | 위험도 | 빈도 |
| --- | --- | --- | --- | --- |
| Bootstrap | Date | vault 폴더/템플릿 생성 (idempotent) | 매우 낮음 | 최초 1회 |
| Dry-run | Daily Note | Action Plan + Latest Output 채움 | 없음 | **매일** |
| Apply | Daily Note | 파일 다수 생성/append, Daily Note는 `archive/daily/`로 이동 + frontmatter `archive_status: archived` | **높음** (파일 시스템 변경) | 매일 1회 |
| Graph Doctor | (vault 전체) | orphan/broken link/hub 리포트 | 없음 | 주 1회 |
| Similar | Similar Note | top-N 유사 노트 후보 | 없음 | 필요할 때 |
| Write Report | Date + Daily Note | `reports/YYYY-MM-DD-archive.md` 생성 | 낮음 | 매일 또는 매주 |

**상태 전이**: 액션 클릭 → 모든 버튼 disabled + 상태 칩이 `Running <라벨>` → 결과 도착 → Output / Action Plan / Run Log 갱신 + Notice toast.

## 6. 시각적 톤 — 의도된 분위기

- **"노트 정리 도구"의 차분함**: 색상은 Obsidian theme variable에 위임 (`--background-primary`, `--text-muted`, `--interactive-accent`). 다크/라이트 모드 모두 자연스럽게 따라가야 함.
- **monospace 텍스트 영역**이 화면의 큰 비중을 차지함. 이 영역은 markdown diff와 CLI 결과를 그대로 보여주는 곳이라 폰트, 줄간격, 가독성이 중요.
- **위험한 액션과 안전한 액션의 시각적 구분**이 약함 (현재는 버튼 6개가 같은 무게로 균등 배치). Apply 버튼이 강조되어야 한다는 신호가 없음.

## 7. 알려진 UX 문제점 (디자인 개선 시 우선순위 높음)

1. **Apply 버튼의 위험도가 시각적으로 드러나지 않음.** 6개 버튼이 같은 톤, 같은 크기로 늘어서 있어 사용자가 실수로 누를 위험이 있다. Dry-run을 먼저 누르는 워크플로우를 시각적으로 유도해야 한다.
2. **Dry-run 결과의 "다음 단계"가 불분명함.** Action Plan을 본 뒤 Apply를 누르라는 안내가 없다. Action Plan 패널 자체가 dry-run 직후에 강조되면 좋겠다.
3. **Latest Output과 Action Plan이 같은 정보의 두 표현인데 동시에 보임.** Output은 raw diff, Action Plan은 정형화된 카드. 사용자가 둘을 어떻게 사용해야 할지 학습 비용이 있다.
4. **CLI Commands 패널의 존재 이유가 약함.** GUI를 쓰는 사람이 굳이 봐야 하나? 접어두거나 settings/footer로 빼는 게 맞을 수 있다.
5. **Run Log가 누적되지만 가치가 낮음.** 시간순 리스트인데, 매일 같은 액션이 반복되어 노이즈에 가깝다. "마지막 apply는 언제였는가?" 같은 요약이 더 유용할 수 있다.
6. **빈 상태(empty state) 설명이 약함.** 처음 여는 사용자는 "Dry-run to inspect archive actions." 한 줄만 본다. 이 도구의 가치와 첫 단계를 더 친절히 안내해야 한다.
7. **`risk` / `confidence` 메타 칩의 의미가 표시되지 않음.** `risk: low` / `confidence: 0.7` 만 보여주고 무엇을 뜻하는지, 왜 봐야 하는지 설명이 없다.
8. **Date 입력이 자유 텍스트.** 캘린더 picker 없음. 오타 시 그냥 실패한다.
9. **Daily Note / Similar Note 자동완성 드롭다운이 등장하는 위치가 어색함.** 현재는 입력 아래에 절대 위치로 띄우는데, 키보드 접근성이 부족하다 (방향키 이동/Enter 확정 없음).
10. **모바일/좁은 panel에서 6열 → 3열 → 1열로 reflow되긴 하지만 toolbar가 좁아지면 버튼 라벨이 잘릴 수 있음.** 아이콘 + 라벨 조합으로 가는 게 안전하다.

## 8. 기술 제약 (디자인이 지켜야 할 박스)

- **Obsidian plugin runtime**: 외부 CSS 프레임워크, 번들러, 아이콘 라이브러리 사용 안 함. 순수 CSS + Obsidian의 lucide 아이콘 세트만 사용 가능 (`ribbon icon: archive` 식).
- **테마 변수 우선**: 색상은 반드시 `var(--background-primary)` / `var(--text-normal)` / `var(--interactive-accent)` 같은 Obsidian CSS variables에 위임. 하드코딩 hex 금지 (사용자가 어떤 테마를 쓰는지 모름).
- **No emoji**: 코드/UI 어디에도 이모지 추가 금지.
- **No build step**: 디자인은 `obsidian-plugin/styles.css` 한 파일 + `main.js`의 DOM 구조 변경으로 적용 가능해야 함. React/Vue 등 도입 안 함.
- **렌더 영역**: 우측 sidebar leaf에 들어감. 일반적으로 폭 320~480px. 따라서 **좁은 폭에서 우선 작동**해야 하고, 폭이 넓을 때 우아하게 늘어나면 된다 (반대 아님).
- **별도 동등 surface**: `web/index.html`은 dashboard server용 동일 기능 웹 화면이지만, 이 브리프의 1차 개선 대상은 **Obsidian plugin 화면**입니다. 웹 화면은 이후 동일 톤으로 맞춥니다.

## 9. 디자인 에이전트에게 요청하는 산출물

1. **재구성된 화면 와이어프레임** (텍스트 또는 ASCII). 위 7개 영역을 어떻게 재배치/통합할지.
2. **위험도 시각화 제안**: Apply 버튼을 어떻게 시각적으로 분리할 것인가 (primary/destructive 패턴 등).
3. **Dry-run → Apply 워크플로우의 progressive disclosure**: dry-run 전에는 Apply가 잠겨 있거나 비활성/secondary로 보이고, dry-run 결과가 있을 때 Apply가 활성/primary로 승격되는 식의 인터랙션 제안.
4. **Latest Output / Action Plan 두 패널의 관계 정리**: 합칠 것인지, 탭으로 전환할 것인지, 한쪽만 default로 보일지.
5. **빈 상태(empty state) 카피와 일러스트(텍스트 기반)**: 처음 여는 사용자가 무엇을 해야 하는지 알 수 있도록.
6. **CSS 변경 제안**: `styles.css`에서 어느 selector를 어떻게 바꿀지. Obsidian 테마 변수만 사용.
7. **접근성 점검**: 키보드 네비게이션 순서, focus ring, aria-label, 색 대비 (Obsidian의 라이트/다크 둘 다에서 동작해야 함).
8. **무엇을 안 바꿀지의 명시**: 디자인이 건드리지 말아야 할 행동(예: `archive_status` 표기, Daily Note 이동 동작, CLI command preview의 내용 자체)을 분리해서 알려주세요.

## 10. 참고 — 핵심 행동의 백엔드 결과 (디자인 의사결정에 영향)

- **Apply는 되돌릴 수 없다.** Daily Note 파일을 `daily/` 에서 `archive/daily/`로 **물리적으로 이동**시킨다. 같은 이름의 파일이 이미 있으면 `-1`, `-2`를 붙인다.
- **Apply는 중복 실행 안전(idempotent)하다.** target 파일에 `hasAppliedAction` 마커가 있으면 다시 append하지 않는다. 하지만 사용자에게 "이미 처리된 액션입니다"라는 시각적 피드백이 없다.
- **Dry-run은 항상 안전하다.** 디자인은 사용자가 Dry-run을 부담 없이, 여러 번 누를 수 있다는 확신을 줘야 한다.
- **Graph Doctor, Similar는 read-only.** Apply와는 다른 시각적 weight를 줘도 된다.
- **Bootstrap은 한 번만 실행되는 setup 액션**. 일상 toolbar에 같은 무게로 있어야 하는지 재검토 대상.

---

**개선 요청 우선순위 (디자인 에이전트가 처음 보면 이 순서로 다뤄주면 좋습니다):**

1. Dry-run → Apply의 안전한 두 단계 워크플로우 시각화
2. Action Plan / Latest Output 정보 통합
3. 좁은 사이드바 폭에서의 toolbar 재배치
4. 빈 상태 / 첫 사용자 안내
5. risk / confidence 메타데이터의 의미 노출
6. CLI / Run Log 패널의 위계 강등 (혹은 숨기기)
