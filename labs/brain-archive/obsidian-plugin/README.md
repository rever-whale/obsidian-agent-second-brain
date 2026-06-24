# Brain Archive Obsidian Plugin

`brain-archive` dashboard를 Obsidian 안에서 실행하는 MVP 플러그인이다.

## 설치

개발 중에는 이 폴더 전체를 vault의 plugin 폴더로 복사하거나 symlink한다.

```bash
mkdir -p .obsidian/plugins/brain-archive
cp obsidian-agent-second-brain/labs/brain-archive/obsidian-plugin/{manifest.json,main.js,styles.css,brain-archive.cjs} .obsidian/plugins/brain-archive/
```

Obsidian에서 `Settings -> Community plugins -> Brain Archive`를 켠다.

## 제공 기능

- 좌측 ribbon icon으로 `Archive Dashboard` 열기
- dashboard에서 Bootstrap, Dry-run, Apply, Graph Doctor, Similar, Write Report 실행
- Command Palette 명령 제공
- Daily Note와 Similar Note 입력에서 vault 파일 검색 선택 제공
- 현재 설정 기준 CLI command preview 제공
- plugin setting에서 daily folder, reports folder, similar note 설정

Daily Note와 Similar Note 입력은 직접 경로를 타이핑해도 되고, `List` 버튼을 눌러 기존 Markdown 파일을 고를 수도 있다. 입력 중에는 글자 포함과 순서 기반 fuzzy match로 후보가 좁혀진다.

## Core module

플러그인은 vault root의 파일을 참조하지 않는다. 항상 plugin 폴더 내부의 core module만 import한다.

```text
.obsidian/plugins/brain-archive/brain-archive.cjs
```

다른 vault에서 쓸 때도 `manifest.json`, `main.js`, `styles.css`, `brain-archive.cjs`를 같은 plugin 폴더에 함께 둔다.

## MVP 범위

이 플러그인은 기존 lab core를 Obsidian 안에서 호출하는 얇은 shell이다. 이후 단계에서는 Obsidian의 active file, backlinks, properties, modal approval UX에 맞춰 dashboard를 더 native하게 바꾼다.
