---
title: 명령줄
category: 작업 공간 도구
order: 93
summary: `gitcito .`는 저장소를 열고, `gitcito doctor`는 아무것도 열지 않고 답합니다.
keywords: cli 명령줄 커맨드라인 터미널 shim path 설치 열기 폴더 단일 인스턴스 doctor status repos commit-check config editor completions wait core.editor blame show search 동사 종료 코드 ci hook
---

# 명령줄

터미널에서 던지는 질문은 두 종류이고, `gitcito`는 둘 다에 답합니다.

첫 번째는 *"이걸 보여줘"* 입니다. 클론 안에 있고, 무언가를 들여다봐야 하며, 그걸
보기에 적당한 곳이 이 앱입니다. 이런 호출은 창을 열되, 물어본 대상에 최대한 가까운
자리를 보여줍니다.

두 번째는 *"지금 말해줘"* 입니다. 훅, CI 작업, 또는 파이프 한가운데에 있는 당신이
창이 아니라 답과 종료 코드를 원하는 경우입니다. 이런 호출은 앱을 아예 실행하지
않습니다. 표준 출력에 쓰고 곧바로 비켜섭니다.

```sh
gitcito .                        # 이 폴더 열기
gitcito blame src/api.ts -l 84   # …그 줄의 blame에서
gitcito doctor                   # 창 없이: 저장소를 점검하고 실패하면 1로 종료
```

## 설치

명령 팔레트(<kbd>⌘K</kbd>) → **'gitcito' 명령을 PATH에 설치**. macOS에서는 작은
심(shim)을 `/usr/local/bin` 또는 `/opt/homebrew/bin`에 심볼릭 링크하며, 둘 다 쓰기
불가일 때만 관리자 권한을 요청합니다. Linux에서는 권한이 전혀 필요 없는
`~/.local/bin`에 들어갑니다. 같은 명령으로 제거됩니다. Windows는 아직 지원하지
않습니다.

원한다면 이어서:

```sh
gitcito completions zsh >> ~/.zshrc     # 또는 bash, 또는 fish
```

## 여는 것들

| 명령 | 여는 대상 |
|------|-----------|
| `gitcito [경로]` | 저장소(기본값: 현재 디렉터리) |
| `gitcito open <이름>` | **탭 이름**으로 저장소를 — `gitcito open api` |
| `gitcito diff` | 커밋되지 않은 변경 |
| `gitcito graph` | 커밋 그래프 |
| `gitcito show <ref>` | 커밋 하나 — `HEAD~2`, 태그, 짧은 해시 |
| `gitcito blame <파일>` | 파일의 blame. `-l 84`로 그 줄에 바로 |
| `gitcito search <검색어>` | 코드 검색(검색어가 이미 입력된 상태) |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | 해당 패널 |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …등등 |

`gitcito help verbs`가 전체 목록을 출력합니다. 세 가지 옵션은 모두에 적용됩니다.
`-n <이름>`은 탭의 표시 이름을 정하고, `-g <그룹>`은 그룹 탭에 넣으며(필요하면 그룹을
만듭니다), `-l <n>`은 줄을 고릅니다.

Gitcito는 **단일 인스턴스**입니다. 앱이 열려 있는 상태에서 `gitcito`를 실행하면 두
번째 사본을 띄우는 대신 그 창에 요청을 넘깁니다. 이미 열린 경로는 — 탭이든 그룹
안이든 — 복제되지 않고 **포커스**를 받습니다. 아직 저장소가 아닌 디렉터리도 열리며
"여기에 저장소 초기화" 흐름을 제안합니다.

## 터미널에서 답하기

이들은 출력하고 종료합니다. 창이 열리지 않고, 앱이 실행 중일 필요조차 없습니다.

### `gitcito status`

브랜치, 추적, 앞섬/뒤처짐, 작업 트리, 스태시, 그리고 저장소가 제공한다면
[`.gitcito.json`의 푸시 체크리스트](repo-config.md)까지. 작업 트리에 충돌이 있으면
1로 종료하므로 `gitcito status || echo 차단됨`이 동작합니다.

### `gitcito doctor [--fix]`

[저장소 설정](repo-config.md) 패널과 같은 점검을 수행합니다. Node 버전, 서브모듈,
LFS, `core.hooksPath`, 필수 파일. **하나라도 실패하면 1로 종료합니다.** 그게 핵심
입니다. 저장소가 선언한 규칙도 GUI를 열어 둔 사람만 본다면 값어치가 적습니다.

```yaml
- run: gitcito doctor          # CI에서, 비싼 작업 전에
```

`--fix`는 doctor가 아는 수리(서브모듈 초기화, `lfs pull`, `core.hooksPath` 설정,
예시 파일 복사)를 적용하고 다시 점검합니다. 설정 파일이 제공한 명령을 실행하는 일은
결코 없습니다. 수리 집합은 닫혀 있습니다.

경고는 실행을 실패로 만들지 않습니다. 경고는 doctor가 무언가를 판단하지 못했다는 뜻
이지, 무언가 잘못됐다는 뜻이 아닙니다. 그걸로 빌드를 떨어뜨리면 이 파일은 도입 비용이
너무 커집니다.

### `gitcito commit-check [파일]`

커밋 메시지를 검사합니다. 인자가 없으면 `.git/COMMIT_EDITMSG`를 읽고, `-m "…"`은
문자열을 검사합니다. 저장소가 선언한 내용을 압니다. `.gitcito.json`이 스코프를 나열
하면 모르는 스코프는 **오류**이고, 나열하지 않으면 그저 문체 조언입니다. 훅에
연결하세요:

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init`은 저장소를 읽고 이미 있는 것 — `.nvmrc`, `.gitmodules`, `.env` 없는
`.env.example`, 히스토리가 써 온 커밋 스코프 — 으로부터 `.gitcito.json`을 제안합니다.
`--dry-run`은 쓰지 않고 출력합니다. `show`는 현재 파일을 출력하고, `check`는 검증한 뒤
버려질 필드를 나열합니다.

### `gitcito repos [필터]`

Gitcito가 아는 모든 저장소 — 열린 탭 먼저, 그다음 최근 항목 — 를 그룹과 함께
보여줍니다. `--paths`는 스크립트용으로 경로만 한 줄에 하나씩 출력합니다:

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito를 git의 편집기로

```sh
gitcito editor install
```

가 `core.editor`와 `sequence.editor`를 `gitcito --wait`로 설정합니다. 이후
`git commit`(`-m` 없이), `git commit --amend`, `git tag -a`, `git rebase -i`는
vim 대신 Gitcito에서 파일을 열며, 글자 수 표시와 컴포저에서 보던 것과 같은 커밋 메시지
힌트를 함께 제공합니다.

![git이 편집기를 요청할 때 Gitcito가 여는 화면](../../screenshots/cli-edit.webp)

중요한 것은 **기다린다**는 점입니다. git은 그 대화상자에서 멈춰 있습니다. 그래서

- **저장하고 계속**은 파일을 다시 쓰고 git이 진행합니다.
- **취소**는 빈 파일을 쓰며, git은 이를 *중단*으로 읽습니다.
- 다른 방식으로 닫는 것 — Escape, 배경, Gitcito 종료 — 도 취소로 칩니다. 영원히
  기다리는 터미널은 다시 입력해야 하는 메시지보다 훨씬 나쁜 결과이기 때문입니다.

한 저장소에만 적용하려면 `--local`을 붙이고, `gitcito editor uninstall`로 되돌립니다.

## 하지 않는 일

- **터미널 동사는 저장소를 수정하지 않습니다.** `doctor --fix`가 유일한 예외이며, 그
  수리 목록은 고정되어 있어 설정 파일이 늘릴 수 없습니다.
- **`repos`는 읽기 전용입니다.** 설정 파일의 주인은 실행 중인 앱이고, CLI는 읽기만 할
  뿐 결코 쓰지 않습니다.
- **설치된 앱이 모르는 동사는 무시됩니다.** 거부가 아니라 무시이므로, 새 심이 오래된
  앱을 만나도 저장소는 열립니다.
- **Windows용 심은 아직 없습니다.** 동사는 모두 구현되어 있고, 빠진 것은 설치 경로뿐
  입니다.

**함께 보기:** [작업 공간, 탭, 그룹](workspaces.md) ·
[저장소 설정](repo-config.md) · [커밋하기](committing.md)
