---
title: Flutter DevTools
category: 작업 공간 도구
order: 93
summary: 네트워크 뷰, 타임라인, 인스펙터, 메모리 프로파일러를 Gitcito 탭에서.
keywords: devtools flutter dart 네트워크 network 타임라인 인스펙터 메모리 프로파일러 webview 내장 패널 vm service
---

# Flutter DevTools

DevTools에는 네트워크 뷰, 타임라인, 위젯 인스펙터, 메모리 프로파일러가 이미 있고,
그것 자체가 내 컴퓨터에서 서비스되는 Flutter 웹 앱입니다. 그래서 Gitcito는 그중 무엇도
다시 만들지 않고, Dart VM Service와 직접 대화하지도 않습니다. 주소를 알아채서 끼워 넣을
뿐입니다.

![Gitcito 탭에서 열린 DevTools](../../screenshots/devtools.webp)

VM 서비스가 올라오는 순간 `flutter run`이 이 줄을 찍습니다:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

실행 세션이 자기 출력에서 그 줄을 지켜보고 있다가, 디버그 툴바에 버튼이 하나 생깁니다.
누르면 DevTools가 자기 탭에서 열립니다. 세션마다 하나씩 — 앱 두 개가 동시에 돌면
DevTools도 두 개입니다.

**핫 리스타트는 새 주소를 알립니다.** 세션이 살아 있는 동안 탭은 그 주소를 따라갑니다.
세션이 끝나면 탭은 마지막 주소를 붙들고 있는데, 그건 보통 죽은 주소입니다. 닫고 새
실행에서 DevTools를 다시 여세요.

## 무엇이 허용되는가

내장된 뷰는 짧은 목줄에 묶여 있습니다. 이 앱은 자격 증명을 들고 있으니까요.

- **루프백만.** `127.0.0.1`, `localhost`, `::1`. 다른 주소로 붙이는 것은 거부되고,
  그쪽으로 향하는 리다이렉트도 마찬가지입니다.
- **preload 없음, node integration 없음, 컨텍스트 격리 켬.** 그 페이지에서 Gitcito로
  이어지는 다리는 없습니다.
- **링크는 진짜 브라우저에서 열립니다.** 패널 안이 아니라 평범한 창에서요.

## 한계

- **이건 DevTools이지 우리 것이 아닙니다.** 그 버전이 할 수 있는 건 패널도 하고, 못
  하는 건 우리도 못 합니다. Gitcito 맛 네트워크 뷰 같은 건 없습니다.
- **이런 식으로 알리는 건 Flutter뿐입니다.** 평범한 Dart 프로그램은 VM 서비스 URL은
  찍어도 DevTools 주소는 찍지 않으므로 버튼도 나오지 않습니다.
- **패널이 비어 있으면 앱이 멈춘 것입니다.** DevTools는 *실행 중인 앱*이 서비스합니다.
  앱이 끝나면 그 주소는 응답을 멈춥니다.

**함께 보기:** [실행과 디버그](launch.md)
