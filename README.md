# Obsidian과 Agent로 만드는 Second Brain

Obsidian vault를 사람이 직접 정리하는 노트 앱이 아니라, AI Agent가 지속적으로 정리하는 로컬 Markdown 지식 DB로 설계하는 mdBook입니다.

## 읽기

- Published book: https://rever-whale.github.io/obsidian-agent-second-brain/
- Source entry: `src/SUMMARY.md`

## 로컬 검증

study vault의 submodule로 작업할 때는 vault 루트에서 실행합니다.

```bash
_tools/mdbook.sh doctor obsidian-agent-second-brain
_tools/mdbook.sh build obsidian-agent-second-brain
```

이 repository만 단독으로 clone한 경우에는 mdBook을 설치한 뒤 repo 루트에서 실행합니다.

```bash
mdbook build
```

lab만 검증할 때는 다음 명령을 사용합니다.

```bash
cd labs/brain-archive
npm test
```

## Lab

`labs/brain-archive`는 책의 Archive Agent 파이프라인을 작게 재현합니다.

- Daily Note section parsing
- archive action planning
- dry-run diff and optional apply
- graph doctor
- similar note search
