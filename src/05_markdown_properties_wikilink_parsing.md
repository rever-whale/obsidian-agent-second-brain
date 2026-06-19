# 5. Markdown AST, Properties, Wikilink 파싱

Agent가 vault를 안전하게 고치려면 Markdown을 문자열 덩어리로 보면 안 된다. Daily Note의 H2 block, YAML properties, wikilink, heading link, block reference는 서로 다른 문법 계층이다.

최소 파서 요구사항은 다음과 같다.

- YAML frontmatter를 properties로 읽고 쓴다.
- Markdown heading tree를 만든다.
- H2 section 단위로 Daily Note block을 추출한다.
- `[[Note]]`, `[[Note#Heading]]`, `[[Note|Alias]]`를 구분한다.
- Markdown link와 Wikilink를 동시에 처리한다.
- code block 내부의 링크 문법은 무시한다.

Obsidian은 wikilink와 Markdown link를 모두 지원한다. 또한 heading link와 block reference도 지원한다. 따라서 Agent는 단순 정규식으로 모든 링크를 치환하기보다, parse 결과를 기준으로 patch 위치를 결정해야 한다.

## Patch 전략

가장 안전한 patch는 파일 전체 재작성보다 heading-targeted append/replace다. 예를 들어 `## Related` 섹션이 있으면 그 섹션만 갱신하고, 없으면 파일 끝의 `## 출처` 같은 보호 섹션 앞에 삽입한다. Obsidian Local REST API의 `PATCH` 개념은 이런 heading 기반 수정 모델을 설계할 때 참고할 만하다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
