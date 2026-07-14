/* =========================================================
   앱 설정 — 교수자(관리자)가 값을 채워 기능을 활성화합니다.
   ========================================================= */
const APP_CONFIG = {
  /* Google 로그인 활성화:
     Google Cloud Console(console.cloud.google.com) → API 및 서비스 → 사용자 인증 정보
     → OAuth 클라이언트 ID(웹 애플리케이션) 생성
     → '승인된 자바스크립트 원본'에 https://jp5678.github.io 추가
     → 발급된 클라이언트 ID를 아래에 입력 (예: "1234...apps.googleusercontent.com")
     비워 두면 로그인 없이 사용 가능(수료증에 인증 표시 없음) */
  googleClientId: "496719164952-5n9uavkc63aso50uaian4fqfnmjthi64.apps.googleusercontent.com",

  /* 수료증 발급 메일 자동 발송 (Google Apps Script):
     docs/apps-script.gs 파일의 안내대로 배포한 뒤 웹 앱 URL을 아래에 입력
     (예: "https://script.google.com/macros/s/XXXX/exec")
     비워 두면 학생이 '메일 보내기' 버튼으로 직접 발송 */
  notifyEndpoint: "",

  /* 수료증 발급 통지를 받을 교수 메일 */
  professorEmail: "imjp5678@scjc.ac.kr",
  professorName: "담당교수",
};
