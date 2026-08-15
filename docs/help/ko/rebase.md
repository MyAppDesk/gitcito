---
title: 대화형 리베이스
category: 브랜치와 수술
order: 42
summary: 끌어다 놓는 것만으로 순서 바꾸기, 스쿼시, fixup, reword, edit, drop을 하세요.
keywords: 대화형 리베이스 interactive rebase squash 스쿼시 fixup reword drop edit autosquash todo
---

# 대화형 리베이스

`git rebase -i`의 todo 목록을, 끌어다 놓을 수 있는 목록으로요.

![대화형 리베이스 편집기](../../screenshots/interactive-rebase.webp)

| 동작 | 뜻 |
|---|---|
| **pick** | 그대로 둬요 |
| **reword** | 변경은 그대로 두고 메시지만 고쳐요 |
| **squash** | 위 커밋에 접어 넣고 두 메시지를 합쳐요 |
| **fixup** | 위 커밋에 접어 넣고 이 메시지는 버려요 |
| **edit** | 여기서 멈춰서 amend할 수 있게 해요 |
| **drop** | 커밋을 버려요 |

행을 끌어서 순서를 바꾸세요. 편집기는 절대 터미널에서 열리지 않아요 — Gitcito가
todo를 대신 써 주거든요.

## 클릭 한 번으로 autosquash

- **스테이징된 변경을 이 커밋에 fixup**이 `fixup!`을 대신 만들어 줘요.
- **여기서부터 autosquash**가 모든 `fixup!` / `squash!`를 각자의 대상에 접어
  넣어요.

리뷰 수정이 하나가 아니라 한 무더기라면, [absorb](absorb.md)가 각 헝크가 어느
커밋에 속하는지 알아내 주니 직접 따질 필요가 없어요.

> 리베이스는 히스토리를 다시 써요. 이미 푸시한 것은 강제 푸시가 필요하고, 그것을
> 리뷰했던 사람은 [그동안 바뀐 것](range-diff.md)을 보고 싶어 할 거예요.

**함께 보기:** [Absorb](absorb.md) · [그동안 바뀐 것](range-diff.md) · [복구](recovery.md)
