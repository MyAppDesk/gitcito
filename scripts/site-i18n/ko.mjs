// Website chrome in ko. Keys mirror en.mjs; anything missing falls back to English.
export const ko = {
  'nav.handbook': '안내서',
  'nav.roadmap': '로드맵',
  'nav.github': 'GitHub',
  'nav.sponsor': '후원',
  'nav.download': '다운로드',

  'foot.license': 'MIT 라이선스 · <a href="https://myappdesk.dev">MyAppDesk</a>가 💜 를 담아 만들었어요',
  'foot.source': '소스',
  'foot.roadmap': '로드맵',
  'foot.reportIssue': '문제 신고',
  'foot.sponsor': '후원',

  'meta.title': 'Gitcito — git 전체를 보여 주는 UI',
  'meta.description':
    '온전히 vibe-coding으로 만든 Git 클라이언트. 무료예요. 그래프, 줄 단위 스테이징, 리베이스, 워크트리, 서브모듈, LFS — 그리고 다른 클라이언트는 하지 않는 몇 가지까지.',

  'hero.title': 'git 전체를,<br /><em>그대로 보여 주는 UI</em>',
  'hero.lede':
    '그래프, 줄 단위 스테이징, 리베이스, 워크트리, 서브모듈, LFS.<br />평범한 것들을 제대로 — 그리고 아무도 하지 않는 몇 가지까지.',
  'hero.download': '내 플랫폼용 다운로드',
  'hero.source': '소스 보기',
  'hero.terms': '무료 · MIT · v{version}',
  'hero.graphAlt': 'Gitcito 커밋 그래프',

  'features.title': '다른 클라이언트는 하지 않는 몇 가지',
  'features.sub':
    '이 가운데 어느 것도 Gitcito를 쓸 이유는 아니에요 — 이유는 위의 목록이에요. 이것들이 있는 건 git이 이미 답을 알고 있는데도 어느 클라이언트도 물어보지 않기 때문이에요.',

  'ordinary.title': '무엇이 들어 있나요',
  'ordinary.sub':
    '일부가 아니라, 완전한 클라이언트예요. 전부 만들어져 있고, 문서화돼 있고, 지금 앱 안에 있어요 — 평범한 것들이고, git을 쓴다는 건 대부분 그런 것들이에요.',
  'ordinary.graph': '진짜 레인을 그리는 커밋 그래프, 거대한 히스토리도 화면 단위로',
  'ordinary.staging': '한 줄 단위까지 스테이징',
  'ordinary.conflicts': '어느 쪽이 어느 쪽인지 알려 주는 3분할 충돌 해결기',
  'ordinary.rebase': '끌어서 하는 대화형 리베이스',
  'ordinary.stacks': '연쇄 재적재가 되는 스택 브랜치',
  'ordinary.recovery': 'Reflog, WIP 스냅숏, 안내를 따라가는 bisect',
  'ordinary.prs': 'GitHub, GitLab, Bitbucket, Azure DevOps의 풀 리퀘스트',
  'ordinary.terminal': '내장 터미널 — 진짜 PTY',
  'ordinary.launch': '<code>.vscode/launch.json</code> 에서 바로 실행과 디버그',
  'ordinary.ai': '읽은 줄을 인용하는 선택형 AI',
  'ordinary.themes': '밝고 어두운 기본 테마, 그리고 AI가 만든 테마',
  'ordinary.languages': '안내서까지 전부 번역 — 아랍어와 히브리어는 화면을 좌우로 뒤집어요',
  'ordinary.conflictAlt': '충돌 해결기',

  'download.title': '다운로드',
  'download.sub': '최신 릴리스는 <strong>v{version}</strong> 이에요. 모든 빌드는 CI에서 게시돼요.',
  'download.cli':
    '또는 터미널에서 <code>gitcito .</code> 로 저장소를 열 수 있어요 — <a href="{cli}">명령줄</a> 을 보세요.',
  'download.macNote': 'Apple silicon &amp; Intel · 서명 및 공증 완료',
  'download.winNote': '설치 프로그램 (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': '{os}용 다운로드',

  'handbook.title': '앱에 들어 있는 {pages}쪽짜리 안내서',
  'handbook.sub': '모든 기능을 설명해요 — 앱에서 오프라인으로도, 그리고 바로 여기서도.',

  'sponsor.title': 'Gitcito 후원하기',
  'sponsor.body':
    '무료, MIT, 백엔드 없음, 텔레메트리 없음, 더 팔 것도 없음 — 그러니 살 것이 없어요. 후원은 서명된 macOS 빌드에 필요한 Apple Developer 인증서와 안내서, 그리고 번역에 쓰여요. 버그 신고도 그만큼 값져요.',
  'sponsor.cta': 'GitHub에서 후원하기',

  'doc.titleSuffix': 'Gitcito 안내서',
  'doc.filter': '페이지 필터…',
  'doc.filterLabel': '페이지 필터',
  'doc.edit': 'GitHub에서 이 페이지 편집하기',
  'doc.improve': 'GitHub에서 이 번역 개선하기',

  'feature.conflict-radar.title': '충돌 레이더',
  'feature.conflict-radar.body':
    '어느 브랜치가 충돌할지 하나라도 머지하기 <strong>전에</strong> 확인해요. 머지는 객체 데이터베이스 안에서 일어나요 — 체크아웃도, 작업 트리 변경도, 나중에 치울 것도 없어요.',
  'feature.semantic-diff.title': '시맨틱 diff',
  'feature.semantic-diff.body':
    '400줄짜리 빨강·초록 벽 대신 <code>startServer</code> → <code>bootServer</code>. 정규식이 아니라 진짜 tree-sitter 파싱이에요.',
  'feature.range-diff.title': '그동안 바뀐 것',
  'feature.range-diff.body':
    '리뷰했던 브랜치를 누가 강제 푸시했어요. 어떤 커밋이 재작성되고, 사라지고, 새로 생겼는지 확인하세요 — 예전 위치는 reflog에서 공짜로 나와요.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    '리뷰 수정을 스테이징하면, blame이 각 헝크를 그 줄을 만든 커밋으로 <code>fixup!</code> 으로 보내 줘요.',
  'feature.time-machine.title': '타임머신',
  'feature.time-machine.body':
    '슬라이더를 끌면 저장소가 변해 가요. 파일이 나타나고, 옮겨 다니고, 되살아나요. HEAD는 움직이지 않고, 커밋하지 않은 작업도 그대로예요.',
  'feature.timelapse.title': '타임랩스',
  'feature.timelapse.body':
    '저장소의 일생 전체를 애니메이션으로 재생하고, 영상으로 내보내세요. 페이지 안에서 녹화하니 설치할 인코더도 없어요.',
  'feature.pr-preview.title': '풀 리퀘스트 미리 보기',
  'feature.pr-preview.body':
    '남의 PR을 — 포크에서 온 것까지 — 아무것도 커밋하지 않고 돌려 봐요. API 토큰도, 두 번째 원격도 필요 없어요. 헤드는 포지가 이미 공개해 둔 ref에서 가져오고, GitHub, GitLab, Bitbucket, Azure DevOps, Gitea 모두 돼요.',
  'feature.mission-control.title': '미션 컨트롤',
  'feature.mission-control.body':
    '작업 공간의 모든 저장소를 한 화면에, 손이 필요한 순서대로 늘어놓아요. 막힌 것 먼저, 그다음 동기화할 것, 그다음 작업 중인 것, 마지막으로 조용한 것.',
  'feature.attributes.title': 'UI가 붙은 파일 속성',
  'feature.attributes.body':
    'git에서 가장 쓸모 있으면서도 아무도 쓰지 않는 파일이에요. 줄바꿈 문자를 모두를 위해 한 번에 정하고, 변경 기록이 더는 충돌하지 않게 하고, 픽스처를 릴리스 아카이브에서 빼고 — 변환기가 설치돼 있다면 Word와 PDF의 읽을 수 있는 diff까지요.',
  'feature.languages.title': '아마 여러분의 언어도',
  'feature.languages.body':
    '버튼만 대충 옮긴 번역이 아니라, 설명까지 포함한 인터페이스 전체예요. 아랍어와 히브리어는 화면을 좌우로 뒤집고, 그래프와 diff, 경로, 터미널은 왼쪽에서 오른쪽 그대로예요. 코드가 읽히는 방향이 그쪽이니까요.',
  'feature.security.title': '여러분의 비밀은 여러분의 것',
  'feature.security.body':
    '백엔드가 없어요. 토큰과 금고 항목은 OS 키체인으로 암호화되고 — 무엇을 위한 것인지 듣고 여러분이 그러겠다고 하기 전까지는 그 키체인에 아무것도 손대지 않아요.'
}
