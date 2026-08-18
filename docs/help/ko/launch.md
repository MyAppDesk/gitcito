---
title: 실행과 디버그 (launch.json)
category: 작업 공간 도구
order: 91
summary: Gitcito를 떠나지 않고 VS Code 실행 구성을 그대로 실행해요.
keywords: 실행 디버그 구성 작업 터미널 launch.json run debug vscode configs tasks preLaunchTask input background compound compounds stopAll serverReadyAction 병렬 세션
---

# 실행과 디버그

Gitcito는 여러분의 `.vscode/launch.json`을 읽어서 — 루트에 있는 것과 중첩된 것
모두를, 구분선으로 묶어서 — 고른 구성을 내장 터미널에서 실행해요.

![실행 구성 선택기와 떠 있는 도구 모음](../../screenshots/launch-configs.webp)

- VS Code **변수가 해석돼요**(`${workspaceFolder}` 및 그 친구들).
- 구성의 **`preLaunchTask`**가 먼저 실행돼요.
- **`${input:…}`** 값은 실행 전에 대화형으로 물어봐요(`promptString`과
  `pickString`).
  `pickString`은 기본값이 미리 선택된 진짜 선택기로 옵션을 보여줍니다.
  `password`로 표시된 `promptString`은 입력이 가려집니다.
- **`isBackground`** 작업(감시자, 개발 서버)은 분리되어 실행되므로 실행을 막지
  않아요.
- **컴파운드**는 각 멤버를 **저마다의 병렬 세션**으로 실행합니다 — 컴파운드
  이름이 붙은 하나의 분할 터미널에서 멤버마다 한 창씩, VS Code의 디버그 세션과
  똑같습니다. `stopAll: true`면 하나를 중지할 때 모두 중지됩니다.
  여러 멤버가 공유하는 작업은 멤버가 시작되기 전에 전용 창에서 **한 번만**
  실행됩니다 — 버전 올림 프롬프트는 멤버마다가 아니라 한 번만 묻습니다.
  이 창은 성공하면 스스로 닫히고, 실패하면 열려 있습니다.
- **`serverReadyAction`**을 지원합니다: 세션 출력이 설정한 패턴과 일치하면
  알려진 URL을 브라우저에서 엽니다 (`openExternally`; `debugWithChrome` /
  `debugWithEdge`도 브라우저만 엽니다 — Gitcito는 디버거를 붙일 수 없습니다).

![두 개의 병렬 세션을 실행하는 컴파운드](../../screenshots/launch-compound.webp)

![기본값이 미리 선택된 ${input} 선택기](../../screenshots/launch-input.webp)

떠 있는 도구 모음에서 **일시 정지 / 재개, 재시작, 중지**를 할 수 있고, 실행 중인
세션 사이를 오갈 수 있어요.

**설정 → 일반 → launch.json 활성화**에서 켜세요. Git / 파일 탭 옆에 **LAUNCH**
버튼이 나타나요.

컴파운드 멤버는 *컴파운드 › 멤버*로 표시되며, 재시작은 그 멤버만 재시작합니다.

Gitcito가 의도적으로 **하지 않는** 것: 프로그램을 실제 터미널에서 실행하지만
디버거는 아닙니다 — 중단점도, 변수 검사도, Debug Adapter Protocol도 없습니다.
attach 전용 구성은 `preLaunchTask`를 가질 때 동작합니다(작업이 곧 일입니다).
순수한 attach는 실행할 것이 없습니다.

**함께 보기:** [내장 터미널](terminal.md)
