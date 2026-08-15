---
title: 명령줄
category: 작업 공간 도구
order: 93
summary: `gitcito .` — `code .`처럼, Git을 위해서요.
keywords: cli 명령줄 command line 터미널 terminal shim path 설치 install 열기 open 폴더 folder 단일 인스턴스 single instance
---

# 명령줄

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## shim 설치하기

명령 팔레트(<kbd>⌘K</kbd>) → **PATH에 'gitcito' 명령 설치**(macOS). 작은 shim을
`/usr/local/bin`이나 `/opt/homebrew/bin`에 심볼릭 링크로 걸어 주고, 둘 다 여러분이
쓸 수 없을 때만 관리자 권한을 요청해요. 같은 명령을 다시 실행하면 제거돼요.

## 동작 방식

- 그 경로가 **이미 열려 있다면** — 탭으로든 그룹 안에서든 — Gitcito는 사본을 또
  열지 않고 **그리로 포커스를 옮겨요**.
- 아직 Git 저장소가 아니어도 열리고, "여기에 저장소 초기화" 흐름을 제안해요.
- `-g`는 그 이름의 그룹에 저장소를 넣어 주고, 그룹이 없으면 만들어 줘요.
- Gitcito는 **단일 인스턴스**예요. 앱이 열려 있는 상태에서 `gitcito`를 실행하면
  두 번째 사본을 띄우는 대신 그 요청을 기존 창에 넘겨요.

**함께 보기:** [작업 공간, 탭, 그룹](workspaces.md)
