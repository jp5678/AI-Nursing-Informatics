/**
 * AI융합 간호정보학 — 수료증 발급 메일 통지 (Google Apps Script)
 *
 * [배포 방법 — 제프리 교수님 Google 계정(imjp5678@scjc.ac.kr)에서]
 * 1. script.google.com 접속 → 새 프로젝트 → 이 코드 전체를 붙여넣기
 * 2. 우측 상단 [배포] → [새 배포] → 유형: 웹 앱
 *    - 실행 계정: 나(자신)
 *    - 액세스 권한: 모든 사용자
 * 3. [배포] 클릭 → 권한 승인 → 생성된 "웹 앱 URL" 복사
 * 4. 학습 플랫폼 저장소의 js/config.js 에서 notifyEndpoint 에 그 URL을 입력
 *
 * 이후 학생이 수료증을 발급하면 아래 doPost가 호출되어
 * 발급 내용이 교수님 메일로 자동 발송됩니다.
 */

const PROFESSOR_EMAIL = "imjp5678@scjc.ac.kr";

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    const subject = "[AI융합 간호정보학] 수료증 발급 통지 — " + d.name + " (" + d.sid + ")";
    const rows = [
      ["발급 일시", d.issuedAt],
      ["증서 번호", d.certNo],
      ["학과", d.dept],
      ["학년 / 반", d.grade + "학년 " + d.classNo],
      ["학번", d.sid],
      ["성명", d.name],
      ["Google 계정 인증", d.authName ? (d.authName + " <" + d.authEmail + ">") : "(미인증 발급)"],
      ["성명-계정 일치", d.nameMatch === false ? "⚠️ 불일치 — 확인 필요" : "일치"],
    ];
    const table = rows.map(function (r) {
      return "<tr><th style='text-align:left;padding:6px 14px 6px 0;color:#a61e4d;white-space:nowrap'>" +
        r[0] + "</th><td style='padding:6px 0'>" + r[1] + "</td></tr>";
    }).join("");

    const htmlBody =
      "<div style='font-family:sans-serif;font-size:14px;color:#3d2230'>" +
      "<h2 style='color:#d6336c'>🎓 수료증 발급 통지</h2>" +
      "<p>AI융합 간호정보학 학습 플랫폼에서 수료증이 발급되었습니다.</p>" +
      "<table style='border-collapse:collapse'>" + table + "</table>" +
      "<p style='color:#8a6276;font-size:12px;margin-top:18px'>" +
      "발급 기준: 13개 전 장 학습 완료 + 장별 복습 퀴즈 90점 이상<br>" +
      "이 메일은 학습 플랫폼에서 자동 발송되었습니다.</p></div>";

    MailApp.sendEmail({
      to: PROFESSOR_EMAIL,
      subject: subject,
      htmlBody: htmlBody,
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
