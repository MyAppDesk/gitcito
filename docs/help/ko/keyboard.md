---
title: 키보드와 단축키
category: 시작하기
order: 2
summary: 익혀 둘 만한 키들과, 그것을 다시 지정하는 방법.
keywords: 단축키 shortcuts 키보드 keyboard 키 keys 치트시트 cheatsheet 재지정 rebind 핫키 hotkeys 팔레트 palette
---

# 키보드와 단축키

어디서든 <kbd>?</kbd> 를 누르면 치트시트가 나와요.

![단축키 치트시트](../../screenshots/cheatsheet.webp)

## 익혀 둘 만한 것들

| 키 | 하는 일 |
|---|---|
| <kbd>⌘K</kbd> | [명령 팔레트](search.md) — 브랜치, 커밋, 파일, 동작 |
| <kbd>⌘⇧F</kbd> | 작업 트리 전체에 대한 [코드 검색](search.md) |
| <kbd>⌘⇧V</kbd> | [금고](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | 저장소 열기 |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | 설정 열기 |
| <kbd>⌘F</kbd> | 지금 보고 있는 파일이나 차이 안에서 찾기 |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | 새 탭용 저장소 또는 그룹 선택기 열기 |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | 활성 탭 닫기 — 남은 탭이 없으면 창 닫기 |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | 위치로 탭 전환 |
| <kbd>⌘⇧T</kbd> | 마지막에 닫은 탭 다시 열기 |
| <kbd>?</kbd> | 이 치트시트 |

## 마우스 없이 움직이기

| 어디서 | 키 |
|---|---|
| 커밋 그래프 | <kbd>↑</kbd> <kbd>↓</kbd> 또는 <kbd>j</kbd> <kbd>k</kbd> |
| 파일 목록 (커밋, WIP, 스태시) | 위와 같음 |
| [타임머신](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>, 열 칸씩은 <kbd>⇧</kbd>, <kbd>Home</kbd>/<kbd>End</kbd> |
| [미션 컨트롤](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>, 열려면 <kbd>Enter</kbd>, 페치/풀은 <kbd>f</kbd>/<kbd>p</kbd>, 필터는 <kbd>/</kbd> |
| 커밋 메시지 상자 | <kbd>↑</kbd> <kbd>↓</kbd> 로 최근 메시지를 다시 불러와요 |

## 다시 지정하기

**설정 → 단축키**. 핵심 이동 단축키(팔레트, 코드 검색, 금고, 저장소 열기, 설정)는
다시 지정할 수 있고, 충돌 감지와 단축키별 초기화가 함께 있어요.

위의 고정 단축키들은 다시 지정할 수 없고, _대상_ 으로도 거부돼요. 앱은
<kbd>⌘T</kbd>, <kbd>⌘W</kbd>, <kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘⇧T</kbd>,
<kbd>⌘S</kbd>, <kbd>⌘Z</kbd>, <kbd>⌘⇧Z</kbd>, <kbd>⌘F</kbd> 를 당신의 설정을
확인하기 전에 먼저 처리하기 때문에, 이 중 하나에 지정한 단축키는 설정된 것처럼
보이고도 결코 동작하지 않아요. 그래서 그중 하나를 고르면 편집기가 받아들이는 대신
그렇다고 알려 줘요.

![설정에서 다시 지정할 수 있는 단축키들](../../screenshots/settings-shortcuts.webp)

**함께 보기:** [명령 팔레트와 검색](search.md)
