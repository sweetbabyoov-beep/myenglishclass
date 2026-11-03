# 조선의 방에 귀를 기울이다

조선문화박물관을 탐방하는 영어 받아쓰기 활동입니다. `Joseon_Museum_Dictation.html` 하나에 A1–A4와 C 원본 MP3, 그림, 한글 서체와 프로그램이 들어 있습니다. 학생에게는 이 HTML 파일 하나만 전달하면 됩니다.

## 수업에서 사용하기

1. HTML 파일을 내려받아 Chrome, Edge 또는 Safari에서 엽니다. 메신저의 파일 미리보기에서는 실행되지 않을 수 있습니다.
2. 이름과 학년·반·번호(선택)를 적고 입장합니다.
3. 고양이 그림방, 수라간, 도자기방, 공예방, 탈 전시실에서 자유롭게 관람합니다.
4. 전체 대화 또는 문장별로 듣고 학습지와 동일한 **25개 빈칸**을 채웁니다. 총 **50문장**입니다.
5. 각 방의 빈칸을 모두 맞히면 도장을 받습니다. 다섯 도장이 모이면 윤허 증서가 열립니다.
6. 증서를 인쇄하거나 PDF로 저장해 실제 도장을 받습니다. 화면에서 찍으려면 **‘선생님 · 화면에 옥새 내리기’ → 확인 번호 `1234`**를 입력합니다.

확인 번호는 교실 운영용 편의 기능입니다. 파일 안의 정답과 번호를 숨기는 보안 인증은 아닙니다. 변경하려면 `src/app.js`의 `TEACHER_CODE`를 수정하고 다시 빌드합니다.

기존 네 전시실 버전의 기록이 같은 브라우저와 파일 위치에 남아 있으면 이름·답안·도장을 이어받습니다. 다섯 번째 도장을 모은 뒤 새로운 증서를 받고 선생님의 옥새를 다시 받을 수 있습니다.

대소문자, 앞뒤 공백, 여러 칸 띄어쓰기, 일반 문장부호 차이는 정답으로 인정합니다. 실제 오답을 두 번 제출하면 첫 글자 힌트, 세 번 제출하면 정답 보기가 열립니다. 본 정답도 직접 입력해야 합니다. 빈 입력은 힌트 횟수를 늘리지 않습니다.

관람 기록과 이름은 같은 브라우저의 로컬 저장소에만 저장됩니다. 브라우저, 기기 또는 파일 위치를 바꾸면 기록이 이어지지 않을 수 있습니다. 저장이 제한되면 화면에 안내하며 현재 창에서 계속 활동할 수 있습니다. 공용 기기에서는 ‘새 관람객’을 눌러 앞 학생의 기록을 지웁니다.

## 자료 구성

- 사용자 제공 `G3_L8_dictation_기본.hwp`의 A1–A4 및 C 본문과 정답을 반영했습니다.
- 사용자 제공 `National_Park_Passport_Dictation.html`의 관람첩·빈칸 채점·단계별 힌트 흐름을 참고했습니다.
- `L8_Listen and Talk_A1.mp3`부터 `A4.mp3`까지의 네 음원과 `L8_Listen and Talk_C.mp3`를 포함합니다. C 대화는 탈 전시실의 20문장·8개 빈칸으로 추가했습니다.
- 각 파일 앞의 문항 번호 안내를 제외하고 문장 단위로 재생합니다. 대화 마지막 문장에는 끝소리가 잘리지 않도록 파일 끝까지 여유를 두었습니다.
- 데이터와 구간(초): `src/lessons.json`. `[대괄호]` 안이 빈칸 정답입니다.
- 그림은 자체 제작한 SVG이며, 한글 명조는 Noto Serif CJK KR의 부분집합입니다. 글꼴 라이선스는 `assets/FONT-LICENSE.txt`와 완성 HTML에 포함되어 있습니다.

## 개발 환경

별도 npm 패키지, 계정, API 키, 데이터베이스가 필요하지 않습니다. Python 3.10 이상으로 빌드합니다.

```bash
cd /workspace/myenglishclass
python3 tools/build.py
python3 -m http.server 8000 --bind 127.0.0.1
```

개발 서버에서는 `Joseon_Museum_Dictation.html` 파일을 사용합니다. 클라우드 작업은 이미 격리되어 있으므로 기존 체크아웃에서 작업하며 별도 Git worktree를 만들지 않습니다.

소스는 `src/index.template.html`, `src/styles.css`, `src/app.js`, `src/lessons.json`입니다. 빌더는 표준 라이브러리만 사용하고 기존 MP3와 글꼴을 묶습니다. 학생용 HTML은 자체 실행되므로 서버와 빌드 도구가 필요하지 않습니다.

## 검증

```bash
node --check src/app.js
python3 tools/build.py
python3 tests/smoke.py
```

브라우저 검증에는 Python Playwright와 `/usr/bin/chromium`이 필요합니다. 클라우드 기본 이미지에 설치되어 있습니다. 테스트는 임시 로컬 서버와 별도 브라우저 프로필을 사용하며 학습 기록을 바꾸지 않습니다. 결과물과 화면 기록은 `test-results/`에 저장합니다.

## 학생용 공개 링크 게시

GitHub Pages의 게시 원본은 `main` 브랜치의 `/ (root)`로 설정합니다. 저장소 Settings → Pages → Build and deployment에서 Source를 **Deploy from a branch**, Branch를 **main**, 폴더를 **/ (root)**로 고르고 저장합니다. `.nojekyll`은 완성된 HTML을 그대로 게시하도록 합니다.

게시가 완료되면 학생이 접속할 주소는 다음과 같습니다. Pages 설정과 배포 완료를 확인하기 전에는 이 주소를 활성 링크로 배포하지 않습니다.

`https://sweetbabyoov-beep.github.io/myenglishclass/Joseon_Museum_Dictation.html`

내용을 수정할 때는 `python3 tools/build.py`로 같은 이름의 HTML을 다시 만들고, 변경분을 `main`에 반영합니다. 학생용 단일 HTML의 내부 구조와 파일 이름은 동일하게 유지됩니다.
