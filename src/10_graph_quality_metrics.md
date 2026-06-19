# 10. graph 품질 지표와 리포트

graph는 예쁜 시각화가 아니라 품질 측정 도구다. Agent가 archive 후 리포트해야 할 지표는 다음과 같다.

- orphan notes: 링크가 거의 없거나 없는 노트
- hub notes: 지나치게 많은 링크가 몰린 노트
- broken links: 존재하지 않는 target
- bridge notes: 서로 다른 cluster를 연결하는 노트
- stale notes: 오래 업데이트되지 않았지만 자주 참조되는 노트
- knowledge gaps: 질문은 많지만 정리된 concept note가 없는 영역

Obsidian Graph view는 노드와 링크를 보여주고 orphan 표시도 지원한다. 하지만 책의 목표는 UI 확인을 넘어 CLI 리포트와 review workflow로 만드는 것이다.

## 지표 정의

graph 품질 지표는 감각적인 표현보다 계산 가능한 정의가 필요하다.

```text
orphan_ratio = orphan_note_count / total_note_count
broken_link_count = unresolved_wikilink_count
avg_degree = total_edges * 2 / total_nodes
hub_threshold = percentile(degree, 95)
stale_hub = hub_note where updated_at < now - 180d
```

이런 지표는 절대값보다 변화량이 중요하다. archive를 실행할수록 orphan ratio가 낮아지는지, broken link가 늘지 않는지, 특정 hub에 모든 링크가 몰리지 않는지를 본다.

## Hub는 항상 좋은가

Hub note는 유용할 수도 있고 노이즈일 수도 있다. `React`, `Architecture`, `Productivity` 같은 넓은 note에 모든 링크가 몰리면 graph는 연결되어 보이지만 탐색은 어려워진다. 좋은 hub는 다음 조건을 만족한다.

- 하위 MOC나 구체 concept로 분기한다.
- 관련 링크가 의미 있는 그룹으로 나뉜다.
- 최근 review에서 유지보수된다.
- 너무 일반적인 단어만 모으지 않는다.

Agent는 hub를 발견하면 삭제하거나 줄이는 대신 분해 후보를 제안할 수 있다.

```text
Hub split suggestion

[[Cache]] has 48 links.

Suggested child MOCs:
- [[Browser Cache]]
- [[Server State Cache]]
- [[React Cache]]
- [[CDN Cache]]
```

## Knowledge Gap 탐지

Knowledge gap은 "없는 노트"를 찾는 일이라 단순하지 않다. 이 책에서는 세 신호를 함께 본다.

- 같은 질문이 여러 daily note에 반복된다.
- project note에서 특정 개념을 여러 번 언급하지만 concept note가 없다.
- 외부 reference는 있는데 internal explanation note가 없다.

예를 들어 `RSC cache scope`가 질문으로 세 번 등장했고, `React Server Components` note는 있지만 `cache()`의 범위와 invalidation을 설명하는 노트가 없다면 Agent는 knowledge gap report를 만든다.

```text
Knowledge Gap

Topic: RSC cache scope
Evidence:
- daily/2026-06-12.md#Question
- daily/2026-06-19.md#Question
- projects/search-api.md mentions "Server Component cache"
Suggested action:
- Create notes/frontend/rsc-cache-scope.md
```

## Archive Report 예시

```text
Archive Result

생성 노트
- React Query invalidateQueries
- RSC cache()

업데이트 노트
- Search API
- Frontend MOC

추가 링크
- 12개

Orphan Note
- Turborepo 실험
- Module Federation

추천 연결
- React Query <-> CQRS
- Event Loop <-> Audio Processing
```

## Graph doctor

`brain graph doctor`는 archive와 분리된 read-only 명령으로 둘 수 있다.

```bash
brain graph doctor --since 30d
```

로컬 lab에서는 같은 아이디어를 작은 fixture vault로 확인할 수 있다.

```bash
cd labs/brain-archive
node src/brain-archive.mjs graph doctor --vault fixtures/vault
```

출력은 다음처럼 운영 판단에 바로 쓸 수 있어야 한다.

```text
Graph Doctor

Total notes: 842
Edges: 2,913
Orphan ratio: 7.8% (-1.2% from last week)
Broken links: 14 (+3)
Top hubs:
- [[React]] degree=64
- [[Cache]] degree=48
- [[Architecture]] degree=41

Needs attention:
- [[Cache]] is too broad. Consider splitting into 4 child MOCs.
- 6 project notes mention "RSC cache" but no concept note exists.
```

## 출처

- [Obsidian Help: Graph view](https://obsidian.md/help/plugins/graph)
- [kartikkabadi/obsidian-vault-graph](https://github.com/kartikkabadi/obsidian-vault-graph)
- [Data-Wise/obsidian-cli-ops](https://github.com/data-wise/obsidian-cli-ops)
