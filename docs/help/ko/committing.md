---
title: 커밋하기
category: 변경 사항 다루기
order: 31
summary: 메시지 스타일, 템플릿, 공동 작성자, 그리고 린터.
keywords: 커밋 commit 메시지 message 작성기 composer conventional gitmoji 티켓 ticket amend 템플릿 template 공동 작성자 co-author 린터 linter
---

# 커밋하기

## 메시지 스타일

설정에서 하나를 고르면 작성기가 거기에 맞춰 바뀌어요.

| 스타일 | 이런 모습 |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting` — 타입 드롭다운과 함께 |
| **Gitmoji** | `✨ add rate limiting` — 이모지 선택기와 함께 |
| **티켓** | `ABC-123: add rate limiting` — 브랜치 이름에서 가져와 채워 줘요 |
| **일반** · **자동** | 입력하는 그대로. 자동은 AI가 형식을 정하게 해요 |
| **원시인** · **하이쿠** | 딱 이름 그대로예요 |

![커밋 템플릿으로 미리 채워진 작성기](../../screenshots/commit-template.webp)

## 작성기가 대신 해 주는 것들

- <kbd>↑</kbd> <kbd>↓</kbd>로 **최근 메시지**를 다시 불러와요.
- **공동 작성자 선택기**가 저장소 자체의 기여자 목록에서 `Co-authored-by:`
  트레일러를 넣어 줘요.
- `commit.template` / `.gitmessage`가 메시지를 **미리 채워** 줘요. 주석 줄은
  걸러내고요.
- 머지, 체리픽, 리버트 중에는 git이 했을 방식 그대로 메시지가 **미리 채워져요**.
- 초안은 저장소별로 **남아 있어서**, 탭을 옮겨 다녀도 메시지를 잃지 않아요.

## 린터

실시간으로 돌지만 막지는 않는 검사예요. 제목 길이(글자 수 세기 포함), 끝에 붙은
마침표, 명령형이 아니거나 소문자로 시작하는 제목, 너무 긴 본문 줄을 봐 줘요.
어디까지나 힌트이지 관문이 아니에요 — 커밋을 막지 않아요.

## Amend

Amend는 스테이징된 내용으로 마지막 커밋을 다시 써요. Gitcito는 기존 메시지를 먼저
보여 주기 때문에, 다시 입력하는 게 아니라 고치는 셈이 돼요.

**함께 보기:** [스테이징](staging.md) · [Absorb](absorb.md) · [변경 기록 생성기](changelog.md)
