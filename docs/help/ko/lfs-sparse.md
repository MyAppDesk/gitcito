---
title: LFS, sparse-checkout, 패치
category: 동기화와 여러 저장소
order: 55
summary: 대용량 파일, 부분 체크아웃, 그리고 변경 사항을 파일로 옮기기.
keywords: lfs large file storage 대용량 파일 sparse checkout 부분 체크아웃 cone partial clone 부분 클론 패치 patch am apply
---

# LFS, sparse-checkout, 패치

## Git LFS

![LFS 관리자](../../screenshots/lfs.webp)

`git-lfs` 가 설치돼 있는지, 이 저장소가 그것을 쓰는지, 어떤 패턴이 추적되는지를
감지해요. 파일 목록은 무엇이 **내려받아졌는지**와 무엇이 아직 **포인터**인지를
보여 주고, 거기서 바로 내려받거나 정리할 수 있어요.

## Sparse-checkout

![cone 모드 sparse-checkout](../../screenshots/sparse-checkout.webp)

cone 모드예요. 실제로 작업하는 최상위 폴더만 체크하면 나머지는 히스토리에는
남은 채로 작업 트리에서 빠져나가요. 패키지 두 개만 담당하는 모노레포에서
유용해요.

**부분 클론**(`--filter=blob:none`)은 클론할 때 제안돼요. 열어 볼 일도 없는 blob을
내려받지 않도록요.

## 패치

- 커밋(또는 여러 개 선택한 커밋)을 `.patch` 로 **내보내기**.
- 하나를 작업 트리에(`git apply`) 또는 커밋으로(`git am`) **적용하기**.

둘 다 도구 메뉴에 있어요.

**함께 보기:** [워크트리와 서브모듈](worktrees.md)
