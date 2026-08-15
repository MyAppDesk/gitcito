---
title: 변경 기록 생성기
category: 변경 사항 다루기
order: 34
summary: 두 레퍼런스 사이의 컨벤셔널 커밋을 유형별로 묶은 변경 기록으로 만들어요.
keywords: 변경기록 릴리스노트 컨벤셔널커밋 생성 changelog release notes conventional commits generate CHANGELOG
---

# 변경 기록 생성기

레퍼런스 두 개를 주면 — 기본값은 **최신 태그 → HEAD**예요 — 그 사이의 커밋을 변경
기록으로 만들어, Conventional Commit 유형별로 묶어 줘요.

![변경 기록 생성기](../../screenshots/changelog-gen.webp)

- **호환성을 깨는 변경**은 어떤 유형에서 왔든 맨 앞에 드러나요.
- 그다음에 기능, 수정, 성능 등이 이어져요.
- 어떤 관례도 따르지 않는 커밋은 버려지는 대신 **기타**에 들어가요 — 커밋을 조용히
  잃어버리는 변경 기록은 지저분한 변경 기록보다 나쁘니까요.

결과를 복사하거나, **바로 `CHANGELOG.md` 앞에 덧붙이세요**.

> 메시지를 [컨벤셔널 스타일](committing.md)로 쓰는 것이 이 기능을 쓸모 있게 만들어요.
> 생성기는 자기가 읽는 제목만큼만 좋아요.

**함께 보기:** [커밋하기](committing.md) · [호스팅과 풀 리퀘스트](hosting.md)
