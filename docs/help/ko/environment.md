---
title: 환경 점검
category: 시작하기
order: 6
summary: Gitcito가 자체 설치 밖에서 의존하는 것 — git, LFS, 네이티브 터미널, git의 credential helper, GitHub CLI, 파일 감시 — 를 한곳에서 점검합니다.
keywords: 환경 environment 닥터 진단 점검 git 버전 lfs node-pty 터미널 기본 셸 credential helper store gh github cli 스코프 workflow inotify max_user_watches
---

# 환경 점검

어떤 실패는 저장소와 전혀 상관이 없습니다. 원인은 컴퓨터입니다. 프로필 로그인에는 너무
오래된 git, 모르는 사이 기본 모드로 떨어진 터미널, workflow 파일을 push할 수 없는 GitHub
CLI 로그인. 모두 나중에 다른 작업 도중 모호한 오류로 나타납니다. **설정 → 환경**(명령
팔레트의 *Settings: Environment*로도 가능)은 이것들을 미리 점검합니다.

[저장소 닥터](repo-settings.md)는 다른 질문에 답합니다. *이 저장소*가 `.gitcito.json`이
요구하는 대로 여기서 빌드될 수 있는지입니다. 환경 점검은 앱 자체를 다루며 어느 저장소에서나
같습니다.

![설정의 환경 점검](../../screenshots/settings-environment.webp)

## 점검 항목

| 행 | 초록색의 의미 | 노란색 또는 빨간색의 의미 |
|----|---------------|---------------------------|
| **Git** | git 2.31 이상이 `PATH`에 있음 | 2.31보다 오래됨: [프로필](profiles.md)의 계정이 fetch와 push에 로그인할 수 없음. 없음: git을 설치할 때까지 아무것도 동작하지 않음 |
| **Git LFS** | `git lfs`가 설치됨 | 설치되지 않음. LFS에 파일을 두는 저장소만 필요함 |
| **터미널** | 네이티브 터미널이 로드됨 | [터미널](terminal.md)이 기본 모드로 실행됨: 색상 없음, 크기 조절 없음, 전체 화면 프로그램 없음 |
| **Credential helper** | git에 HTTPS 비밀번호용 helper가 있음 — 전역 또는 특정 호스트용(`gh auth setup-git`이 설정하는 것) | helper가 없어서 Gitcito 밖의 git이 매번 물음. 또는 평문으로 저장하는 `store`. [Credential helper](credentials.md) 참고 |
| **GitHub CLI** | `gh`가 `workflow` 스코프로 로그인됨 | 그 스코프 없이 로그인됨: GitHub가 `.github/workflows`를 바꾸는 push를 모두 거부함 |
| **파일 감시**(Linux) | inotify 한도가 65,536 이상 | 한도가 낮으면 큰 저장소 몇 개만 열어도 바닥나고, 새 폴더에서 상태가 갱신되지 않음 |

해당하지 않는 행은 표시하지 않습니다. 설치되지 않았거나 로그인하지 않은 GitHub CLI, 그리고
macOS와 Windows의 파일 감시입니다.

## 찾은 문제 고치기

고칠 방법이 있으면 행이 그것을 복사 버튼이 달린 명령으로 보여 줍니다. 예를 들어
`gh auth refresh -h github.com -s workflow`는 빠진 스코프를 추가하고, `sysctl` 한 줄은
inotify 한도를 올립니다. **이 페이지는 스스로 아무것도 실행하지 않습니다.** 일부 수정은
`sudo`가 필요하거나 전역 설정을 바꾸므로, 실행 전에 읽어 보는 것은 여러분의 몫입니다.
실행한 뒤 **다시 점검**을 누르세요.

## 제한

- 앱이 자기 프로세스에서 보는 것을 점검합니다. 터미널 안에서만 `PATH`를 바꾸는 셸
  프로필이 있으면 둘이 어긋날 수 있습니다.
- GitHub CLI 행은 **설정 → 연동**에 연결된 계정이 아니라 `gh` 자체의 로그인을 반영합니다.
  둘은 별개의 자격 증명입니다. 그쪽에 `workflow` 스코프가 없으면 대신 거부된 push로
  드러납니다.
- 설치된 것을 보고합니다. 아무것도 설치하거나 업데이트하지 않습니다.
