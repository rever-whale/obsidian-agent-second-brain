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

## 왜 정규식만으로는 부족한가

`[[React Query]]`를 찾는 정규식은 쉽게 만들 수 있다. 문제는 그 문자열이 항상 링크가 아니라는 점이다. code block 안에 있을 수도 있고, 인용한 예시일 수도 있으며, 이미 alias가 붙은 링크일 수도 있다.

````md
```ts
const example = "[[Not a real wikilink]]";
```

본문의 [[React Query|TanStack Query]] 링크는 실제 링크다.
````

Agent가 code block 안의 문자열을 링크로 처리하면 graph 분석이 오염된다. 반대로 alias link를 단순히 파일명으로만 처리하면 사람이 보는 표시 텍스트를 잃는다. 그래서 최소한 Markdown block parser와 Obsidian link parser를 분리해야 한다.

## 파서 출력 모델

Archive Agent 내부에서는 note를 다음 모델로 변환하는 편이 좋다.

```ts
type NoteDocument = {
  path: string;
  frontmatter: Record<string, unknown>;
  headings: HeadingNode[];
  sections: SectionBlock[];
  links: InternalLink[];
  externalLinks: ExternalLink[];
};

type InternalLink = {
  raw: string;
  target: string;
  heading?: string;
  blockId?: string;
  alias?: string;
  position: TextRange;
  inCodeBlock: boolean;
};
```

이 모델의 목적은 LLM에게 모든 파일을 다시 읽히지 않는 것이다. Agent는 parse 결과를 보고 "어떤 heading에 어떤 link가 있는지", "어떤 properties가 있는지", "어떤 section을 patch할 수 있는지"를 판단한다.

## Patch 전략

가장 안전한 patch는 파일 전체 재작성보다 heading-targeted append/replace다. 예를 들어 `## Related` 섹션이 있으면 그 섹션만 갱신하고, 없으면 파일 끝의 `## 출처` 같은 보호 섹션 앞에 삽입한다. Obsidian Local REST API의 `PATCH` 개념은 이런 heading 기반 수정 모델을 설계할 때 참고할 만하다.

## 보호해야 하는 영역

모든 섹션을 같은 방식으로 수정하면 안 된다. 다음 영역은 보호 대상이다.

- YAML frontmatter: schema를 지키며 parser/serializer로만 수정한다.
- code block: 링크, heading, tag처럼 보이는 문자열을 무시한다.
- `## Source` 또는 `## 출처`: provenance를 손상시키지 않는다.
- manually curated MOC section: 사용자가 고정한 순서를 보존한다.
- callout과 block reference: Obsidian 고유 문법이므로 줄바꿈을 조심한다.

Agent가 Markdown을 수정할 때는 "어디를 바꿀 수 있는가"보다 "어디를 바꾸면 안 되는가"를 먼저 정해야 한다.

## Validation

Patch 후에는 최소 검증을 수행한다.

```text
1. frontmatter YAML parse
2. heading tree 재파싱
3. 중복 heading 검사
4. wikilink target 존재 여부 검사
5. 같은 section 내 중복 link 검사
6. 변경 전후 note count와 graph edge count 비교
```

이 검증은 LLM에게 맡기지 않는다. deterministic script가 수행해야 한다. LLM은 판단과 요약에는 강하지만, 파일 시스템 전체의 무결성 검사는 반복 가능한 코드가 더 잘한다.

## 출처

- [Obsidian Help: Internal links](https://obsidian.md/help/links)
- [Obsidian Help: Properties](https://obsidian.md/help/properties)
- [coddingtonbear/obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)
