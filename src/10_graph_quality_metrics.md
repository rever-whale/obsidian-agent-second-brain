# 10. Graph 품질 지표와 리포트

Graph는 예쁜 시각화가 아니라 품질 측정 도구다. Agent가 archive 후 리포트해야 할 지표는 다음과 같다.

- orphan notes: 링크가 거의 없거나 없는 노트
- hub notes: 지나치게 많은 링크가 몰린 노트
- broken links: 존재하지 않는 target
- bridge notes: 서로 다른 cluster를 연결하는 노트
- stale notes: 오래 업데이트되지 않았지만 자주 참조되는 노트
- knowledge gaps: 질문은 많지만 정리된 concept note가 없는 영역

Obsidian Graph view는 노드와 링크를 보여주고 orphan 표시도 지원한다. 하지만 책의 목표는 UI 확인을 넘어 CLI 리포트와 review workflow로 만드는 것이다.

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

## 출처

- [Obsidian Help: Graph view](https://obsidian.md/help/plugins/graph)
- [kartikkabadi/obsidian-vault-graph](https://github.com/kartikkabadi/obsidian-vault-graph)
- [Data-Wise/obsidian-cli-ops](https://github.com/data-wise/obsidian-cli-ops)
