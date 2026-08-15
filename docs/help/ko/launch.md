---
title: 실행과 디버그 (launch.json)
category: 작업 공간 도구
order: 91
summary: Gitcito를 떠나지 않고 VS Code 실행 구성을 그대로 실행해요.
keywords: 실행 디버그 구성 작업 터미널 launch.json run debug vscode configs tasks preLaunchTask input background
---

# 실행과 디버그

Gitcito는 여러분의 `.vscode/launch.json`을 읽어서 — 루트에 있는 것과 중첩된 것
모두를, 구분선으로 묶어서 — 고른 구성을 내장 터미널에서 실행해요.

![실행 구성 선택기와 떠 있는 도구 모음](../../screenshots/launch-configs.webp)

- VS Code **변수가 해석돼요**(`${workspaceFolder}` 및 그 친구들).
- 구성의 **`preLaunchTask`**가 먼저 실행돼요.
- **`${input:…}`** 값은 실행 전에 대화형으로 물어봐요(`promptString`과
  `pickString`).
- **`isBackground`** 작업(감시자, 개발 서버)은 분리되어 실행되므로 실행을 막지
  않아요.

떠 있는 도구 모음에서 **일시 정지 / 재개, 재시작, 중지**를 할 수 있고, 실행 중인
세션 사이를 오갈 수 있어요.

**설정 → 일반 → launch.json 활성화**에서 켜세요. Git / 파일 탭 옆에 **LAUNCH**
버튼이 나타나요.

**함께 보기:** [내장 터미널](terminal.md)
