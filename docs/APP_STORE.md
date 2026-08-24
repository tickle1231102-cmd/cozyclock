# Cozy Time — App Store 등록 가이드

앱 이름: **Cozy Time**  
번들 ID: `com.cozytime1231.studio`  
개인정보 처리방침: https://clock-bice-xi.vercel.app/privacy.html  
지원 URL(동일 사용 가능): https://clock-bice-xi.vercel.app/privacy.html

코드 쪽(Capacitor iOS, 아이콘, 위치 권한 문구)은 준비되어 있습니다. 아래는 **직접** 진행할 단계입니다.

---

## 0. Apple Developer Program (최초 1회)

1. [Apple Developer Program](https://developer.apple.com/programs/) 가입 또는 로그인
2. 개인 / 조직 선택 후 $99/년 결제
3. 계정이 Active가 될 때까지 대기(하루~며칠 걸릴 수 있음)
4. 활성화되면 [App Store Connect](https://appstoreconnect.apple.com)와 Xcode 서명을 사용할 수 있습니다

---

## A. Xcode에서 Archive · Upload

### 1. 준비

1. Mac App Store에서 **Xcode**(최신 안정판) 설치
2. 프로젝트 폴더에서:

```bash
npm run icons
npm run cap:sync:ios
npm run cap:open:ios
```

### 2. Signing

Xcode에서 `App` 타깃 선택:

1. **Signing & Capabilities**
2. **Team**: Apple Developer 계정
3. **Automatically manage signing** 켜기
4. Bundle Identifier가 `com.cozytime1231.studio` 인지 확인
5. Display Name: **Cozy Time**

### 3. Archive

1. 기기 목록에서 **Any iOS Device (arm64)** 선택(시뮬레이터면 Archive 불가)
2. **Product → Archive**
3. Organizer가 열리면 해당 Archive 선택
4. **Distribute App → App Store Connect → Upload**
5. 옵션은 기본값으로 진행해도 됩니다

### 4. 버전 번호

| 필드 | 의미 | 예 |
|------|------|-----|
| Marketing Version (`MARKETING_VERSION`) | 사용자에게 보이는 버전 | `1.0` |
| Build (`CURRENT_PROJECT_VERSION`) | 업로드마다 +1 | `1`, `2`, `3`… |

같은 버전 문자열로 다시 올릴 때는 **Build만** 올리면 됩니다.

---

## B. App Store Connect — 앱·스토어 정보

1. [App Store Connect](https://appstoreconnect.apple.com) → **나의 앱** → **+** → 새로운 앱
2. 플랫폼: iOS
3. 이름: **Cozy Time**
4. 기본 언어: 영어(또는 한국어)
5. 번들 ID: `com.cozytime1231.studio` (개발자 포털에 등록되어 있어야 함 — Xcode 첫 서명 시 자동 생성되기도 함)
6. SKU: `cozytime1231` (내부용, 공개되지 않음)

### 스토어 등록 정보

| 항목 | 안내 |
|------|------|
| 부제 | 30자 이내. 예: Scenic clock, focus & calendar |
| 설명 | 시계·풍경 테마·포모도로·스톱워치·캘린더·언어 |
| 키워드 | clock,timer,pomodoro,calendar,scenic… (100자) |
| 스크린샷 | Connect가 요구하는 iPhone 사이즈(보통 6.7" 등). 가로 시계 화면 추천 |
| 앱 아이콘 | 1024×1024, **알파 채널 없음** (`public/icons/icon-1024.png` 사용 가능) |
| 카테고리 | Utilities 또는 Lifestyle |
| 연령 등급 | 설문 완료(유해 콘텐츠 없음) |
| 개인정보 처리방침 | `https://clock-bice-xi.vercel.app/privacy.html` |
| 지원 URL | 위와 동일 URL 가능 |
| 연락 이메일 | 본인 이메일 |

### App Privacy

- 계정 없음, 서버로 개인정보 수집 없음
- 설정은 기기 내 저장만
- 위치: Skylight용 **대략적 위치**, 앱 기능, **제3자 공유 없음**, 추적 안 함

### 심사 메모(예시)

```
No account required.
Open the app to see the clock. Use the settings gear for themes (Skylight, Grove, Tide, Island, Beach, Nook), Pomodoro, Stopwatch, and Calendar.
Location is optional and only used on-device for solar Skylight colors.
```

업로드된 빌드가 처리(보통 수 분~수십 분)되면 해당 버전에 빌드를 연결합니다.

---

## C. TestFlight → 심사 → 출시

1. **TestFlight**에서 본인 Apple ID로 설치
2. 확인할 것: 전체화면, 가로/세로, 테마 전환, 포모도로, 캘린더, 화면 꺼짐 방지
3. App Store 버전 페이지에서 **심사에 추가** → 제출
4. Waiting for Review → In Review (보통 1~3일)
5. 승인 후 **자동 출시** 또는 **수동 출시** 선택

Play Store처럼 12명×14일 강제 규칙은 없습니다.

---

## D. 스토어 앱 업데이트

웹만 Vercel에 올려도 **App Store 앱은 바뀌지 않습니다.**

```bash
# 코드 수정 후
npm run cap:sync:ios
npm run cap:open:ios
# Xcode: Build 번호 +1 → Archive → Upload → Connect에서 새 버전 제출
```

---

## 문제 해결 빠른 메모

- **Archive 비활성**: 시뮬레이터가 아니라 Any iOS Device 선택
- **서명 오류**: Developer 계정 Active 여부, Team 선택, 번들 ID 충돌 확인
- **빌드가 Connect에 안 보임**: 업로드 후 이메일/Processing 대기, 거부 메일이 오면 로그 확인
- **위치 권한**: Info.plist에 `NSLocationWhenInUseUsageDescription` 이미 포함됨
