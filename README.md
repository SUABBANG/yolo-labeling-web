# YOLO Labeling Tool

YOLO 형식 데이터셋을 위한 웹 기반 바운딩 박스 라벨링 도구

## 데이터셋 구조

```
datasets_folder/
├── images/          # 이미지 파일 (jpg, png, bmp 등)
├── labels/          # YOLO 형식 라벨 파일 (.txt)
└── label.txt        # 클래스 정의 (줄 단위, 순서대로 0번부터)
```

**label.txt 예시:**
```
Birthdate
Chart
Document
ETC_Page
Fingerprint
```

**라벨 파일 형식 (YOLO):**
```
클래스번호 center_x center_y width height
1 0.312925 0.707050 0.402531 0.225593
```

## 설치

```bash
# 1. Python 가상환경
python -m venv venv
pip install -r backend/requirements.txt

# 2. Frontend
cd frontend
npm install
```

## 실행

터미널 2개를 열어서 각각 실행:

### PowerShell (Windows)

```powershell
# 터미널 1 - Backend (포트 5000)
.\venv\Scripts\Activate.ps1
python backend/app.py

# 터미널 2 - Frontend (포트 5173)
cd frontend
npm run dev
```

### Git Bash / Linux / Mac

```bash
# 터미널 1 - Backend (포트 5000)
source venv/Scripts/activate    # Windows (Git Bash)
# source venv/bin/activate      # Linux/Mac
python backend/app.py

# 터미널 2 - Frontend (포트 5173)
cd frontend
npm run dev
```

### CMD (Windows)

```cmd
# 터미널 1 - Backend (포트 5000)
venv\Scripts\activate.bat
python backend/app.py

# 터미널 2 - Frontend (포트 5173)
cd frontend
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 후 프로젝트를 추가하여 시작

## 단축키

| 키 | 기능 |
|---|---|
| `V` | 선택 모드 |
| `D` | 그리기 모드 |
| `Delete` | 선택된 박스 삭제 |
| `Ctrl+S` | 저장 |
| `Ctrl+Z` | 실행취소 |
| `Ctrl+Shift+Z` | 다시실행 |
| 마우스 휠 | 줌 |
| Alt+드래그 / 중간버튼 | 패닝 |

## 주요 기능

- 멀티 프로젝트 관리 (이름, 설명, 경로 설정)
- 데이터셋 경로 지정 후 이미지 목록 탐색
- 기존 YOLO 라벨 시각화 (클래스별 색상, 형광펜 효과)
- 바운딩 박스 추가/이동/리사이즈/삭제
- 박스 클래스 변경
- 이미지별 라벨링 완료 체크 (전체/미완료/완료 필터)
- Undo/Redo 지원
- 줌/패닝 지원
