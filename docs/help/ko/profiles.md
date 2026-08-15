---
title: 프로필
category: 나만의 설정
order: 101
summary: 업무용과 그 밖의 모든 것을 위한 별도의 신원과 토큰.
keywords: 프로필 신원 사용자 이메일 토큰 계정 전환 profile profiles identity git user email tokens accounts switch
---

# 프로필

프로필은 **Git 신원**(이름과 이메일)을 그에 딸린 **연동 토큰**과 함께 묶어요.
프로필을 전환하면 둘이 같이 바뀌어요 — 커밋은 올바른 작성자로 기록되고 API 호출은
맞는 계정을 써요.

한 컴퓨터로 업무용 저장소와 개인 저장소를 모두 다루거나, GitHub 계정이 두 개일 때
유용해요.

![프로필: 한쪽에는 git 신원, 다른 한쪽에는 연동 토큰](../../screenshots/settings-profiles.webp)

## 저장소별 연결

저장소를 **프로필에 연결**해 두면, 다른 프로필에 속한 저장소를 보고 있는 동안에도 그
저장소에 대한 백그라운드 페치가 항상 올바른 계정으로 인증해요.

토큰은 설정 파일이 아니라 [OS 키체인](security.md)에 저장돼요.

**함께 보기:** [보안과 비밀](security.md) · [호스팅](hosting.md)
