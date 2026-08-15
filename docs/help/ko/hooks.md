---
title: 훅과 .gitignore
category: 작업 공간 도구
order: 92
summary: git 훅을 관리하고, 손으로 파일을 고치지 않고 무시 규칙을 넣으세요.
keywords: 훅 hooks pre-commit husky core.hooksPath gitignore 무시 ignore 추적 해제 untrack
---

# 훅과 .gitignore

## 훅

저장소의 모든 훅을 목록으로 보고, 어느 것이 진짜이고 어느 것이 아직 `.sample`인지
확인하고, 켜고 끄고 고치고 새로 만들 수 있어요.

![훅 관리자](../../screenshots/hooks.webp)

Gitcito는 사용자 정의 **`core.hooksPath`**(husky와 그 친구들)와 **pre-commit
프레임워크** 설정을 감지해서, 훅이 `.git/hooks`가 아닌 다른 곳에 있으면 알려 줘요 —
그러지 않으면 git이 절대 실행하지 않는 파일을 고치고 있게 되니까요.

> 훅은 Gitcito의 커밋에서도 `git commit`에서와 똑같이 실행돼요. 실패한 훅은 커밋을
> 막고, 그 출력은 오류 메시지에 담겨 돌아와요.

## 똑똑한 .gitignore

파일을 우클릭 → **무시**를 고르고 이 중에서 선택하세요.

| 선택 | 기록되는 내용 |
|---|---|
| 이 파일 | `path/to/file.log` |
| 모든 `*.ext` | `*.log` |
| 폴더 전체 | `path/to/folder/` |

![.gitignore 선택기](../../screenshots/gitignore-chooser.webp)

규칙은 **가장 가까운 폴더**의 `.gitignore`에, 아니면 저장소 루트에 들어가요.
확정하기 전에 그 줄이 어떻게 될지 실시간으로 미리 볼 수 있고요. 이미 추적 중인
파일에는 같은 대화 상자에서 **무시하고 추적 해제**가 나와요.

**함께 보기:** [보안과 비밀](security.md) · [스테이징](staging.md)
