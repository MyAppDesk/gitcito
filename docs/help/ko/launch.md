---
title: 실행과 디버그 (launch.json)
category: 작업 공간 도구
order: 91
summary: Gitcito를 떠나지 않고 VS Code 실행 구성을 그대로 실행해요.
keywords: 실행 디버그 구성 작업 터미널 launch.json run debug vscode configs tasks preLaunchTask input background compound compounds stopAll serverReadyAction 병렬 세션 hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
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
툴바가 필요한 것을 가리면 그립을 잡아 옆으로 드래그하세요 — 위치는 기억되며, 그립을 더블 클릭하면 다시 가운데로 돌아옵니다.

Gitcito가 의도적으로 **하지 않는** 것: 프로그램을 실제 터미널에서 실행하지만
디버거는 아닙니다 — 중단점도, 변수 검사도, Debug Adapter Protocol도 없습니다.
attach 전용 구성은 `preLaunchTask`를 가질 때 동작합니다(작업이 곧 일입니다).
순수한 attach는 실행할 것이 없습니다.

## 핫 작업 — 「다시 시작」 옆의 빠른 길

![디버그 툴바에서 보낸 핫 리로드](../../screenshots/launch-hot.webp)

대부분의 개발 런타임은 이미 키 하나로 다시 불러옵니다. `flutter run`은 **r**,
Metro는 **r**, nodemon은 **rs ⏎**, Vitest는 **a**로 스위트를 다시 실행합니다.
같은 결과를 얻으려고 실행 구성을 다시 시작하는 것은 느린 길입니다 — 프로세스를
죽이고, 모든 `preLaunchTask`를 다시 돌리고, 앱의 상태를 버립니다.

그래서 Gitcito는 구성이 실제로 실행하는 명령을 읽고 — `npm run dev`는
`package.json`의 스크립트까지 따라갑니다 — 그 런타임의 키를 디버그 툴바에
올립니다. 누르면 그 키가 세션의 표준 입력에 쓰입니다. 터미널에 직접 입력한 것과
똑같습니다.

| 런타임 | 버튼 | ⋯ 안에 |
|--------|------|--------|
| Flutter(`flutter run`) | 핫 리로드 `r`, 핫 리스타트 `R` | 디버그 페인트, 성능 오버레이, 플랫폼 전환, DevTools |
| Expo | 다시 불러오기 `r` | 개발자 메뉴, 디버거 |
| Metro / React Native | 다시 불러오기 `r` | 개발자 메뉴, 디버거 |
| Vite(dev, serve, preview) | 서버 다시 시작 `r ⏎` | 브라우저에서 열기, URL 표시, 콘솔 지우기 |
| nodemon | 다시 시작 `rs ⏎` | — |
| Vitest(watch 모드) | 전체 다시 실행 `a`, 실패 다시 실행 `f` | 스냅샷 업데이트 |
| Jest(`--watch`) | 전체 다시 실행 `a`, 실패 다시 실행 `f` | 변경된 파일만, 스냅샷 업데이트 |
| Mocha(`--watch`) | 다시 실행 `rs ⏎` | — |
| AVA(`--watch`) | 전체 다시 실행 `r ⏎`, 스냅샷 업데이트 `u ⏎` | — |
| `dotnet watch` | 강제 다시 시작 `Ctrl+R` | — |
| Wrangler(`wrangler dev`) | 브라우저에서 열기 `b` | DevTools, 로컬/원격, 콘솔 지우기 |

스스로 다시 불러오는 런타임에는 버튼을 주지 않습니다 — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server. 아무도
읽지 않는 키를 보내는 버튼은 버튼이 없는 것보다 나쁩니다. 작동한 것처럼 보이기
때문입니다.

**한계.** 감지는 텍스트 기반입니다. 명령줄의 프로그램 이름을 맞추므로, Gitcito가
읽을 수 없는 래퍼 스크립트로 개발 서버를 띄우는 구성은 아무것도 얻지 못합니다.
키 입력에 대한 확인도 없습니다 — 버튼이 잠깐 반짝일 뿐, 진짜 답은 프로세스 자신의
출력입니다. 일시 중지되었거나 종료된 세션은 입력을 받지 않으므로 버튼이
비활성화됩니다.

**추측이 틀렸다면**, 구성에 직접 적으세요:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send`는 그대로 기록됩니다 — Enter를 기다리는 CLI라면 `\n`으로 끝내세요.
`icon`은 선택입니다: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
빈 `hotActions` 배열은 해당 구성의 버튼을 끕니다.

## 실행 대상 — 구성이 어느 기기에서 실행되는가

![LAUNCH 탭 옆에서 실행 대상 고르기](../../screenshots/launch-device.webp)

모바일 앱을 빌드하는 구성에는 어디서 실행할지 알려 줘야 합니다. 이 선택은
Flutter만의 것이 아닙니다 — React Native, Expo, Capacitor, xcodebuild 모두
대상을 받고, 저마다 표기가 다릅니다. 그래서 Gitcito는 **LAUNCH** 탭 옆에서 한
번만 묻고, 그 구성의 런타임이 읽는 형태로 답을 써 넣습니다. 선택기는 저장소의
어떤 구성이 실제로 기기를 받을 수 있을 때만 나타납니다.

**목록의 출처** — 이 컴퓨터에 있는 SDK 도구들에게 병렬로 묻습니다:

| 도구 | 제공하는 것 | 묻는 시점 |
|------|-------------|-----------|
| `flutter devices` / `flutter emulators` | 전부, 이미 정규화됨 | 폴더에 `pubspec.yaml`이 있을 때 |
| `xcrun simctl` | iOS 시뮬레이터, 실행 중과 꺼진 것 | macOS에서 |
| `adb devices` | Android 실기기와 이미 켜진 에뮬레이터 | 항상 |
| `emulator -list-avds` | 아직 꺼져 있는 Android 에뮬레이터 | 항상 |

같은 시뮬레이터를 최대 세 도구가 보고하므로 플랫폼과 이름으로 병합합니다.
동점이면 Flutter가 이깁니다 — `flutter run -d`가 기다리는 것이 그 id이기
때문입니다. 설치되지 않은 도구는 메뉴 아래쪽에 이름으로 적힙니다. 짧은 목록은
스스로를 설명해야 합니다.

**선택이 하는 일:**

| 계열 | 기록 방식 |
|------|-----------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| 그 밖의 모든 것 | 환경 변수만 |

실행되는 모든 구성은 환경에 `GITCITO_DEVICE_ID`, `GITCITO_DEVICE_NAME`,
`GITCITO_DEVICE_PLATFORM`을 받고, 대상이 실제 Android 기기라면 `ANDROID_SERIAL`도
받습니다. 래퍼 스크립트나 Gradle 태스크, 맨 `adb`가 같은 기기를 맞히는 이유가
바로 이것입니다 — Gitcito가 명령을 다시 쓰지 않고도요.

**꺼진 기기 켜기.** *실행 중 아님* 아래의 항목은 고르면 부팅됩니다:
`flutter emulators --launch`, `xcrun simctl boot`(그리고 Simulator 창), 또는
분리 실행되는 `emulator -avd` — 그래서 Gitcito를 종료해도 Android 에뮬레이터가
같이 죽지 않습니다.

**한계.** 이미 기기를 명시한 구성 — 명시적 `-d`, `--simulator`, Dart-Code의
`deviceId` — 은 그대로 둡니다. 선택기는 작성자가 쓴 것을 절대 덮어쓰지 않습니다.
셸 따옴표가 필요한 id는 깨진 명령줄을 무릅쓰는 대신 환경 변수로 물러납니다.
메뉴는 당신의 구성이 닿을 수 있는 범위로 걸러지므로, Android 전용 저장소가
iPhone을 권하는 일은 없습니다. 그리고 목록은 스냅숏입니다. 기기를 꽂았다면
**기기 새로 고침**을 누르세요.

선택은 저장소별로 기억되며, 그 기기가 사라지면 잊힙니다.

**함께 보기:** [내장 터미널](terminal.md)
