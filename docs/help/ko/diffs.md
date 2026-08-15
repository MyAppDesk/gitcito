---
title: Diff와 미리 보기
category: 변경 사항 읽기
order: 20
summary: 분할 보기, 단어 단위 강조, 이미지 diff, 파일 미리 보기.
keywords: diff 분할 split side-by-side 단어 단위 word level 공백 whitespace 이미지 image diff 미리 보기 preview markdown docx pdf
---

# Diff와 미리 보기

## Diff 읽기

| 토글 | 하는 일 |
|---|---|
| **통합 ↔ 분할** | 비교하고 싶을 땐 나란히, 그냥 읽고 싶을 땐 위아래로 |
| **단어 단위** | 수정된 줄 안에서 바뀐 토큰만 강조해요 — 옛것은 빨강, 새것은 초록 |
| **공백 무시** | 들여쓰기만 바뀐 부분을 감춰서 진짜 변경이 드러나게 해요 |
| <kbd>⌘F</kbd> | diff 안에서 찾기. 다음/이전으로 넘어갈 수 있어요 |

![단어 단위 강조가 적용된 분할 diff](../../screenshots/split-diff.webp)

모든 diff 위에는 [의미 기반 요약](semantic-diff.md)이 자리해요 — 줄 단위가 아니라
심볼 단위로 무엇이 바뀌었는지 알려 주는 거예요.

## 이미지 diff

바뀐 이미지는 제대로 비교돼요. 나란히 놓거나, 스와이프 손잡이를 끌어서 이전과
이후 사이를 오갈 수 있어요.

![이미지 diff](../../screenshots/image-diff.webp)

## 무엇이든 미리 보기

**미리 보기** 모드는 파일의 소스를 보여 주는 대신 파일을 렌더링해요. Markdown,
Word(`.docx`), Excel(`.xlsx`), PDF, 동영상, 오디오, 이미지, 그리고 그 밖의 모든
것에는 구문 강조된 코드가 나와요.

![Markdown 미리 보기](../../screenshots/markdown-preview.webp)

## 파일 탭

왼쪽 사이드바의 **파일** 탭은 작업 트리 자체를 둘러봐요. 폴더에는 그 안에 든
것들을 합산한 상태 배지(추가 / 수정 / 삭제)가 붙어요.

![미리 보기가 함께 있는 파일 탭](../../screenshots/file-tree.webp)

![각 폴더 안에서 무엇이 바뀌었는지 합산해 보여 주는 폴더 배지](../../screenshots/tree-badges.webp)

**함께 보기:** [시맨틱 diff](semantic-diff.md) · [스테이징](staging.md)
