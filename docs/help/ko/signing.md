---
title: 서명된 커밋
category: 복구와 안전
order: 61
summary: GPG, SSH 또는 X.509 서명과 커밋별 검증 배지.
keywords: 서명 sign signing gpg ssh x509 검증됨 verified 서명 signature 배지 badge 신뢰 trust
---

# 서명된 커밋

저장소별로 서명을 켜세요 (**설정 → 저장소 톱니바퀴**). GPG, SSH, X.509 중에서
고른 키로요. Gitcito는 그 저장소에 `commit.gpgsign`, `gpg.format`,
`user.signingkey` 를 써요 — 다른 도구들도 똑같이 읽는 바로 그 설정이에요.

| | |
|---|---|
| ![서명 열, 밝은 테마](../../screenshots/signed-commits-light.webp) | ![서명 열, 어두운 테마](../../screenshots/signed-commits-dark.webp) |

그래프에는 순서를 바꿀 수 있는 전용 **서명 열**이 생겨요.

| 배지 | 뜻 |
|---|---|
| **검증됨** | git이 신뢰하는 키로 만든 올바른 서명 |
| **미검증** | 서명은 됐지만 키를 모르거나 검증되지 않음 |
| **만료됨** | 서명 또는 그 키가 만료됨 |
| *(없음)* | 서명되지 않음 |

태그도 서명할 수 있어요 — [태그](tags.md)를 보세요.

**함께 보기:** [보안과 비밀](security.md)
