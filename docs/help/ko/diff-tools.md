---
title: 외부 diff 및 머지 도구
category: 브랜치와 수술
order: 43
summary: 파일을 Kaleidoscope, Beyond Compare, Meld 등 이미 쓰던 도구에 넘겨요 — Gitcito는 git 자신의 도구 목록을 읽어요.
keywords: 외부도구 비교도구 머지도구 차이보기 difftool mergetool external diff merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup
---

# 외부 diff 및 머지 도구

Gitcito의 [diff 뷰어](diffs.md)와 [3분할 충돌 해결기](conflicts.md)는 대부분의 날을
감당해요. 어떤 날은 그러지 못하죠. 4,000줄짜리 생성 파일이라든가, 네 열을 한꺼번에
봐야 하는 머지라든가, 아니면 그냥 10년째 써 와서 어떤 새 도구보다 빠르게 읽히는 그
도구요.

**설정 → 일반 → 외부 diff 및 머지 도구.**

## 우리 목록이 아니라 git의 목록이에요

Gitcito는 자체 목록을 갖고 있지 않아요. 드롭다운은 `git difftool --tool-help`와
`git mergetool --tool-help`가 알려 주는 내용이고, 그래서 이렇게 돼요.

- git이 이미 여러분 컴퓨터에서 찾아낸 도구가 먼저 나오고, 알고는 있지만 찾지 못한
  도구는 *설치되지 않음* 표시와 함께 그 뒤에 나와요.
- **직접 만든 도구도 별도 지원 없이 동작해요.** 예를 들어

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  이렇게 해 두면 `mine`이 내장 도구와 똑같이 드롭다운에 나타나요.
- 선택한 값은 **전역 git 설정의 `diff.tool`과 `merge.tool`**에 기록돼요. 터미널이
  읽는 바로 그 키예요. 여기서 설정하면 명령줄의 `git difftool`도 똑같이 동작하고,
  거기서 설정하면 Gitcito가 그걸 그대로 가져와요.

git은 기본적으로 서른 개쯤 되는 도구를 알고 있어요. Kaleidoscope, Beyond Compare,
Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge, VS Code, 그리고 vim
계열이 포함돼요.

## 동작이 나타나는 곳

| 화면 | 동작 |
|---------|--------|
| [커밋 작성기](committing.md)의 변경된 파일 | **\<도구\>에서 비교** — 작업 트리 대 인덱스 |
| [충돌 해결기](conflicts.md) | **\<도구\>에서 머지** — 완전한 3방향 머지 |

두 항목 모두 도구가 실제로 설정돼 있을 때만 나타나요. 설정되지 않은 `git difftool`은
그냥 오류를 낼 뿐이고, 아무 일도 하지 않는 버튼은 버튼이 없는 것보다 나빠요.

## 도구가 열려 있는 동안 벌어지는 일

Gitcito는 도구가 닫히기를 기다려요. 의도한 동작이에요. `git mergetool`은 도구가
종료된 *뒤에야* 해결된 파일을 스테이징하니, 그래야 보고할 실제 결과가 생기거든요.
버튼이 즉시 반환되는 대신 스피너를 보여 주는 이유가 그거예요.

앱의 나머지는 계속 반응해요. 이 작업들은 보통의 git 작업을 직렬화하는 저장소별 잠금
바깥에서 실행되기 때문에, 점심시간 내내 머지 도구를 열어 둬도 그 뒤의 탭이 얼어붙지
않아요.

외부 머지가 성공하면 git이 알아서 파일을 스테이징하고, Gitcito는 해결기를 닫고
새로고침해요. 저장하지 않고 도구를 닫으면 git이 그렇다고 알려 주고 아무것도 바뀌지
않아요.

## `.orig` 파일

`git mergetool`은 기본적으로 해결된 파일 옆에 `<file>.orig` 백업을 남겨요. Gitcito가
아니라 git의 동작이에요. 설정의 토글은 `mergetool.keepBackup`을 기록해요. 이걸 끄면
해결된 파일이 아무것도 남기지 않아요.

## 한계

- **작업 트리 diff만요.** 작성기의 항목은 지금 갖고 있는 것을 인덱스와 비교해요. 과거
  커밋 두 개를 외부 도구로 비교하는 건 연결돼 있지 않아요. 그건 내장
  [diff 뷰어](diffs.md)나 [비교](merging.md)를 쓰세요.
- **한 번에 파일 하나예요.** "변경된 파일 전부 비교" 같은 일괄 실행은 없어요.
- **Gitcito는 아무것도 설치하지 않아요.** *설치되지 않음*으로 표시된 도구도 계속
  선택할 수 있어요. 설치하고 나면 git이 찾아낼 수도 있으니까요. 물론 설치하기 전까지는
  실패해요.
