# 풍경 쌓기

토큰을 쌓아 강·들판·산·숲·건물로 나만의 풍경을 만들고, 그 풍경에 맞는 동물을 데려와 점수를 얻는 게임입니다. 2~4명, 30~40분.

- 23칸 육각 보드와 지형별 쌓기 규칙, 실시간 점수 계산
- 동물 카드 26종 (패턴은 돌려서 맞춰도 인정), 지금 올릴 수 있는 카드에 "가능" 표시
- **이번 차례 되돌리기**로 실수한 차례를 처음으로 되돌리기

## GitHub Pages에 올리기

1. GitHub에서 새 저장소를 만듭니다 (예: `landscape`, Public).
2. 이 폴더 안의 파일을 모두 저장소 맨 위(루트)에 올립니다. 웹에서는 **Add file → Upload files**에 폴더 안 내용을 끌어다 놓으면 됩니다. `.nojekyll`처럼 점으로 시작하는 파일이 안 보이면 터미널로 올리세요:
   ```bash
   git init
   git add .
   git commit -m "풍경 쌓기"
   git branch -M main
   git remote add origin https://github.com/<아이디>/landscape.git
   git push -u origin main
   ```
3. **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main`, 폴더 `/ (root)`로 저장합니다.
4. 1~2분 뒤 `https://<아이디>.github.io/landscape/` 에서 열립니다.

아이패드 Safari에서 공유 버튼 → **홈 화면에 추가**를 하면 앱처럼 전체 화면으로 쓸 수 있습니다.

## 알아두면 좋은 점

- 한 화면(아이패드나 브라우저 하나)에서 2~4명이 번갈아 두는 방식입니다.
- 진행 중인 게임은 그 기기의 브라우저에 자동 저장됩니다. 새로고침해도 시작 화면에서 **하던 게임 이어하기**를 누르면 됩니다.
- 외부 라이브러리 없이 HTML·CSS·JavaScript(ES 모듈)만 씁니다. `file://`로 열면 동작하지 않으니, 내 컴퓨터에서 미리 보려면 이 폴더에서 `python3 -m http.server`를 실행하고 `http://localhost:8000`을 여세요.
- 규칙 엔진 테스트: Node 18 이상에서 `npm test` (무작위 대국 수백 판으로 규칙 위반 확인)

## 파일 구성

```
index.html        게임 화면
app.js            화면 그리기와 입력 처리
engine.js         게임 규칙 (화면과 분리)
style.css         이 게임 전용 스타일
assets/base.css   글꼴·버튼·모달 공통 스타일
assets/ui.js      시작 화면, 모달, 저장 도우미
tests/            규칙 엔진 자동 테스트
.nojekyll         GitHub Pages가 파일을 그대로 내보내도록 하는 설정
```

게임 규칙(메커니즘)은 잘 알려진 보드게임에서 영감을 받았고, 이름·그림·구성 요소는 이 프로젝트를 위해 새로 만들었습니다.
