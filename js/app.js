/* =========================================================
   AI융합 간호정보학 학습 플랫폼 — 앱 로직 (SPA, 해시 라우팅)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 진도 저장 (localStorage) ---------- */
  const STORE_KEY = "ainursing-progress-v1";

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { completed: {}, quizBest: {} };
    } catch {
      return { completed: {}, quizBest: {} };
    }
  }
  function saveStore(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }
  let store = loadStore();

  function isDone(id) { return !!store.completed[id]; }
  function toggleDone(id) {
    if (store.completed[id]) delete store.completed[id];
    else store.completed[id] = Date.now();
    saveStore(store);
  }
  function quizBest(id) { return store.quizBest[id]; }
  function setQuizBest(id, pct) {
    if (store.quizBest[id] == null || pct > store.quizBest[id]) {
      store.quizBest[id] = pct;
      saveStore(store);
    }
  }
  function progressPct() {
    const done = CHAPTERS.filter((c) => isDone(c.id)).length;
    return Math.round((done / CHAPTERS.length) * 100);
  }

  /* ---------- 유틸 ---------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  /* ---------- Google 로그인 ---------- */
  const CFG = (typeof APP_CONFIG !== "undefined" && APP_CONFIG) || {};
  function authEnabled() { return !!CFG.googleClientId; }
  function currentUser() { return store.user || null; }

  function decodeJwtPayload(token) {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(part);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  }

  function showLogin() {
    if ($("#loginOverlay")) return;
    const ov = document.createElement("div");
    ov.className = "login-overlay";
    ov.id = "loginOverlay";
    ov.innerHTML = `
      <div class="login-card">
        <div class="login-logo"><img src="assets/logo.png" alt=""
          onerror="this.parentElement.classList.add('fallback'); this.remove();" /></div>
        <h2>${esc(COURSE.title)}</h2>
        <p class="login-sub">${esc(COURSE.school)} · ${esc(COURSE.target)}</p>
        <p class="login-desc">학습 기록 관리와 수료증 발급 시 본인 확인을 위해<br>학교 Google 계정으로 로그인해 주세요.</p>
        <div id="gBtn" class="g-btn-wrap"></div>
        <p class="login-note">로그인 정보(이름·이메일)는 이 브라우저에만 저장되며,<br>수료증 발급 시 본인 인증 표시에 사용됩니다.</p>
      </div>`;
    document.body.appendChild(ov);

    const init = () => {
      if (!(window.google && google.accounts && google.accounts.id)) { setTimeout(init, 250); return; }
      google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: (res) => {
          try {
            const d = decodeJwtPayload(res.credential);
            store.user = { name: d.name || "", email: d.email || "", picture: d.picture || "", ts: Date.now() };
            saveStore(store);
            ov.remove();
            route();
            if (!store.profile) showProfileSetup();
          } catch (e) {
            alert("로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
          }
        },
      });
      google.accounts.id.renderButton($("#gBtn"), { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 280 });
    };
    init();
  }

  function logout() {
    delete store.user;
    saveStore(store);
    try { if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    route();
    if (authEnabled()) showLogin();
  }

  /* ---------- 학습자 정보 (수료증 발급용 프로필) ---------- */
  const CLASS_OPTIONS = ["A", "B", "C", "D", "E", "F", "전공심화"];
  function fmtClass(c) {
    c = String(c || "");
    return !c || c === "전공심화" || c.endsWith("반") ? c : c + "반";
  }

  function showProfileSetup(onDone) {
    if ($("#profileOverlay")) return;
    const u = currentUser();
    const p = store.profile || {};
    const ov = document.createElement("div");
    ov.className = "login-overlay";
    ov.id = "profileOverlay";
    const gradeOpts = [1, 2, 3, 4]
      .map((g) => `<option value="${g}" ${String(p.grade || 3) == String(g) ? "selected" : ""}>${g}학년</option>`)
      .join("");
    const curClass = String(p.classNo || "").replace(/반$/, "");
    const classOpts = `<option value="" disabled ${curClass ? "" : "selected"}>선택하세요</option>` +
      CLASS_OPTIONS.map((c) => `<option value="${c}" ${curClass === c ? "selected" : ""}>${c}</option>`).join("");
    ov.innerHTML = `
      <div class="login-card profile-card">
        <h2>👤 학습자 정보 ${store.profile ? "수정" : "등록"}</h2>
        <p class="login-desc">아래 정보는 수료증·디지털 배지 발급과 교수 통지 메일에 사용됩니다.<br>정확하게 입력해 주세요.</p>
        ${u ? `<div class="auth-line">🔐 <b>${esc(u.name)}</b> (${esc(u.email)}) 계정으로 인증됨</div>` : ""}
        <form id="profileForm" class="cert-form profile-form">
          <label>학과 <input name="dept" value="간호학과" readonly class="readonly"></label>
          <label>학년 <select name="grade">${gradeOpts}</select></label>
          <label>반 <select name="classNo" required>${classOpts}</select></label>
          <label>학번 <input name="sid" value="${esc(p.sid || "")}" placeholder="예: 20241234" required maxlength="15"></label>
          <label>성명 <input name="name" value="${esc(p.name || (u ? u.name : ""))}" placeholder="예: 홍길동" required maxlength="20"></label>
          <label>이메일 <input name="email" type="email" value="${esc(p.email || (u ? u.email : ""))}" placeholder="예: id@scjc.ac.kr" required maxlength="60"></label>
          <div class="full" style="text-align:center;margin-top:4px">
            <button class="btn-primary" type="submit">저장</button>
            ${store.profile ? '<button class="btn-ghost" type="button" id="profileCancel">취소</button>' : ""}
          </div>
        </form>
      </div>`;
    document.body.appendChild(ov);
    const cancel = $("#profileCancel");
    if (cancel) cancel.addEventListener("click", () => ov.remove());
    $("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const prof = {};
      for (const k of ["grade", "classNo", "sid", "name", "email"]) prof[k] = String(fd.get(k) || "").trim();
      prof.dept = "간호학과";
      if (Object.values(prof).some((v) => !v)) { alert("모든 항목(학년·반·학번·성명·이메일)을 입력해 주세요."); return; }
      store.profile = prof;
      saveStore(store);
      ov.remove();
      updateUserChip();
      if (onDone) onDone(); else route();
    });
  }

  function showProfileView() {
    if ($("#profileViewOverlay")) return;
    const p = store.profile;
    if (!p) { showProfileSetup(); return; }
    const u = currentUser();
    const ov = document.createElement("div");
    ov.className = "login-overlay";
    ov.id = "profileViewOverlay";
    ov.innerHTML = `
      <div class="login-card profile-card">
        <h2>👤 내 정보</h2>
        ${u ? `<div class="auth-line">🔐 <b>${esc(u.name)}</b> (${esc(u.email)}) 계정으로 인증됨</div>` : ""}
        <table class="cert-info" style="margin:14px auto">
          <tr><th>학과</th><td>${esc(p.dept)}</td></tr>
          <tr><th>학년 / 반</th><td>${esc(String(p.grade))}학년 ${esc(fmtClass(p.classNo))}</td></tr>
          <tr><th>학번</th><td>${esc(p.sid)}</td></tr>
          <tr><th>성명</th><td>${esc(p.name)}</td></tr>
          <tr><th>이메일</th><td>${esc(p.email)}</td></tr>
        </table>
        <p class="login-note">이 화면에서는 정보를 확인만 할 수 있습니다.</p>
        <button class="btn-primary" id="profileViewClose">닫기</button>
      </div>`;
    document.body.appendChild(ov);
    $("#profileViewClose").addEventListener("click", () => ov.remove());
  }

  function updateUserChip() {
    const area = $("#userArea");
    if (!area) return;
    const u = currentUser();
    const p = store.profile;
    if (u || p) {
      const display = (p && p.name) || (u && u.name) || "";
      area.innerHTML = `
        <span class="user-chip" id="profileChip" title="내 정보 확인 — ${esc((p && p.email) || (u && u.email) || "")}">
          ${u && u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : "👤"}
          <span class="user-name">${esc(display)}</span>
        </span>
        ${u ? `<button class="logout-btn" id="logoutBtn">로그아웃</button>` : `<button class="logout-btn" id="profileEditBtn">내 정보</button>`}`;
      $("#profileChip").addEventListener("click", () => showProfileView());
      $("#logoutBtn")?.addEventListener("click", logout);
      $("#profileEditBtn")?.addEventListener("click", () => showProfileView());
    } else if (authEnabled()) {
      area.innerHTML = `<button class="logout-btn" id="loginBtn">로그인</button>`;
      $("#loginBtn").addEventListener("click", showLogin);
    } else {
      area.innerHTML = "";
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function chapterById(id) { return CHAPTERS.find((c) => c.id === id); }

  /* ---------- 레이아웃 골격 ---------- */
  function renderShell() {
    document.body.innerHTML = `
      <header class="topbar">
        <button class="menu-btn" id="menuBtn" aria-label="메뉴 열기">☰</button>
        <a class="brand" href="#/">
          <span class="logo"><img src="assets/logo.png" alt="${esc(COURSE.title)} 로고"
            onerror="this.parentElement.classList.add('fallback'); this.remove();" /></span>
          <span class="brand-text">
            <b>${esc(COURSE.title)}</b>
            <span>${esc(COURSE.tagline)} <i>${esc(COURSE.taglineEn)}</i></span>
          </span>
        </a>
        <div class="spacer"></div>
        <div class="user-area" id="userArea"></div>
        <div class="progress-pill" id="topProgress"></div>
      </header>
      <nav class="sidebar" id="sidebar"></nav>
      <div class="sidebar-backdrop" id="backdrop"></div>
      <main class="main" id="main"></main>
    `;
    $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    $("#backdrop").addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  }

  function renderSidebar(activeRoute) {
    const groups = PARTS.map((part) => {
      const items = CHAPTERS.filter((c) => c.id >= part.range[0] && c.id <= part.range[1])
        .map((c) => navItem(`#/ch/${c.id}`, c.id, c.title, activeRoute === `ch/${c.id}`, isDone(c.id)))
        .join("");
      return `<div class="nav-group"><div class="group-label">${esc(part.label)}</div>${items}</div>`;
    }).join("");

    $("#sidebar").innerHTML = `
      <div class="nav-group">
        ${navItem("#/", "🏠", "홈 · 학습 현황", activeRoute === "home")}
        ${navItem("#/preface", "✉️", "머리말", activeRoute === "preface")}
      </div>
      ${groups}
      <div class="nav-group">
        <div class="group-label">마무리</div>
        ${navItem("#/closing", "💌", "맺음말: 미래 간호사들에게", activeRoute === "closing")}
        ${navItem("#/certificate", "🎓", "수료증 · 디지털 배지", activeRoute === "certificate", !!store.cert)}
      </div>
    `;
    $("#topProgress").textContent = `학습 진도 ${progressPct()}%`;
    updateUserChip();
  }

  function navItem(href, num, title, active, done) {
    return `<a class="nav-item${active ? " active" : ""}" href="${href}">
      <span class="ch-num">${esc(String(num))}</span>
      <span class="nav-title">${esc(title)}</span>
      ${done ? '<span class="done-mark">✓</span>' : ""}
    </a>`;
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    const doneCount = CHAPTERS.filter((c) => isDone(c.id)).length;
    const pct = progressPct();

    const partBlocks = PARTS.map((part) => {
      const cards = CHAPTERS.filter((c) => c.id >= part.range[0] && c.id <= part.range[1])
        .map((c) => {
          const done = isDone(c.id);
          const best = quizBest(c.id);
          const quizCount = c.quiz ? c.quiz.ox.length + c.quiz.mc.length : 0;
          const meta = c.special
            ? `<span>📋 학습목표 ${c.objectives.length}</span><span>🖥️ 핸즈온 실습 3</span>`
            : `<span>📋 목표 ${c.objectives.length}</span>
              <span>🃏 용어 ${c.terms.length}</span>
              <span>✍️ 퀴즈 ${quizCount}${best != null ? ` · 최고 ${best}점` : ""}</span>`;
          return `<a class="chapter-card${c.special ? " special-ch" : ""}" href="#/ch/${c.id}">
            <div class="top">
              <span class="num">${c.id}</span>
              ${c.special ? '<span class="special-tag">SPECIAL</span>' : ""}
              <span class="status ${done ? "" : "todo"}">${done ? "✓ 학습 완료" : "미학습"}</span>
            </div>
            <h3>${esc(c.title)}</h3>
            <div class="en">${esc(c.titleEn)}</div>
            <div class="meta">${meta}</div>
          </a>`;
        })
        .join("");
      return `<div class="part-label">${esc(part.label)}</div><div class="chapter-grid">${cards}</div>`;
    }).join("");

    $("#main").innerHTML = `
      <section class="hero">
        <h1>${esc(COURSE.title)}</h1>
        <div class="en">${esc(COURSE.titleEn)}</div>
        <p class="desc">AI를 두려워하지도, 맹목적으로 신뢰하지도 않는 간호사 — AI 출력을 TRACE로 검증하고, Human-in-the-Loop 원칙으로 최종 판단을 내리는 'AI 시대의 간호 전문가'를 기르는 13개 장의 여정과 특별장(바이브 코딩 입문)입니다.</p>
      </section>

      <section class="progress-card">
        <div class="bar-wrap">
          <div class="bar-label"><span>전체 학습 진도</span><b>${doneCount} / ${CHAPTERS.length}장 (${pct}%)</b></div>
          <div class="bar"><div style="width:${pct}%"></div></div>
        </div>
        <button class="reset-btn" id="resetBtn">진도 초기화</button>
      </section>

      <div class="chapter-grid" style="margin-bottom:4px">
        <a class="chapter-card special" href="#/preface">
          <div class="top"><span class="num">✉️</span></div>
          <h3>머리말 — AI와 공존하는 시대, 간호의 나침반</h3>
          <div class="en">A Compass for Nursing in the Era of AI Coexistence</div>
        </a>
        <a class="chapter-card special" href="#/closing">
          <div class="top"><span class="num">💌</span></div>
          <h3>맺음말 — 미래 간호사들에게 드리는 편지</h3>
          <div class="en">A Letter to Future Nurses</div>
        </a>
        <a class="chapter-card special" href="#/certificate">
          <div class="top"><span class="num">🎓</span>
            <span class="status ${store.cert ? "" : "todo"}">${store.cert ? "✓ 발급 완료" : certEligible() ? "지금 발급 가능!" : "조건 미충족"}</span>
          </div>
          <h3>수료증 · 디지털 배지 발급</h3>
          <div class="en">Certificate & Digital Badge</div>
          <div class="meta"><span>발급 기준: 전 장 학습 완료 + 장별 퀴즈 90점 이상</span></div>
        </a>
      </div>

      ${partBlocks}
      ${footer()}
    `;

    $("#resetBtn").addEventListener("click", () => {
      if (confirm("학습 진도와 퀴즈 기록을 모두 초기화할까요?")) {
        store = { completed: {}, quizBest: {} };
        saveStore(store);
        route();
      }
    });
  }

  /* ---------- 머리말 / 맺음말 ---------- */
  function renderProse(data, withSign) {
    const paras = data.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
    $("#main").innerHTML = `
      <div class="ch-header">
        <div class="crumb"><a href="#/">홈</a> › ${esc(data.title.split(":")[0])}</div>
        <h1>${esc(data.title)}</h1>
        ${data.titleEn ? `<div class="en">${esc(data.titleEn)}</div>` : ""}
      </div>
      <div class="card prose-card">
        ${paras}
        ${withSign && data.sign ? `<div class="sign">${esc(data.sign)}</div>` : ""}
      </div>
      ${footer()}
    `;
  }

  /* ---------- 챕터 ---------- */
  function renderChapter(id, tab) {
    const c = chapterById(id);
    if (!c) { location.hash = "#/"; return; }
    tab = tab || "learn";

    const prev = chapterById(id - 1);
    const next = chapterById(id + 1);
    const done = isDone(id);
    const label = c.special ? "특별장" : `제${c.id}장`;
    const hasTerms = c.terms && c.terms.length;
    const hasQuiz = c.quiz && (c.quiz.ox.length || c.quiz.mc.length);
    const hasQna = c.qna && c.qna.length;

    const tabs = [["learn", "📖 학습"]];
    if (hasTerms) tabs.push(["terms", "🃏 용어 카드"]);
    if (hasQuiz) tabs.push(["quiz", "✍️ 복습 퀴즈"]);
    if (hasQna) tabs.push(["qna", "❓ Q&A"]);
    if (!tabs.some(([k]) => k === tab)) tab = "learn";

    $("#main").innerHTML = `
      <div class="ch-header">
        <div class="crumb"><a href="#/">홈</a> › ${label}${c.special ? ' <span class="special-tag">SPECIAL</span>' : ""}</div>
        <h1>${label}. ${esc(c.title)}</h1>
        <div class="en">${esc(c.titleEn)}</div>
      </div>

      <div class="tabs">
        ${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</button>`).join("")}
      </div>

      <section class="panel ${tab === "learn" ? "active" : ""}" data-panel="learn">${learnPanel(c)}</section>
      ${hasTerms ? `<section class="panel ${tab === "terms" ? "active" : ""}" data-panel="terms">${termsPanel(c)}</section>` : ""}
      ${hasQuiz ? `<section class="panel ${tab === "quiz" ? "active" : ""}" data-panel="quiz" id="quizPanel"></section>` : ""}
      ${hasQna ? `<section class="panel ${tab === "qna" ? "active" : ""}" data-panel="qna">${qnaPanel(c)}</section>` : ""}

      <div class="complete-row">
        <button class="complete-btn ${done ? "done" : ""}" id="completeBtn">
          ${done ? "✓ 학습 완료됨 (취소하려면 클릭)" : "이 장 학습 완료로 표시"}
        </button>
      </div>

      <div class="ch-nav-row">
        ${prev ? `<a href="#/ch/${prev.id}">← 제${prev.id}장 ${esc(prev.title)}</a>` : `<span class="disabled">← 이전 장 없음</span>`}
        ${next ? `<a class="next" href="#/ch/${next.id}">제${next.id}장 ${esc(next.title)} →</a>` : `<a class="next" href="#/closing">맺음말 읽기 →</a>`}
      </div>
      ${footer()}
    `;

    /* 탭 전환 */
    $$(".tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tabs button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $$(".panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === btn.dataset.tab));
        window.scrollTo({ top: 0 });
      });
    });

    /* 플래시카드 */
    $$(".flashcard").forEach((card) => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
    });

    /* Q&A 아코디언 */
    $$(".qna-item .q-btn").forEach((btn) => {
      btn.addEventListener("click", () => btn.closest(".qna-item").classList.toggle("open"));
    });

    /* 완료 토글 */
    $("#completeBtn").addEventListener("click", () => {
      toggleDone(id);
      renderSidebar(`ch/${id}`);
      const btn = $("#completeBtn");
      const nowDone = isDone(id);
      btn.classList.toggle("done", nowDone);
      btn.textContent = nowDone ? "✓ 학습 완료됨 (취소하려면 클릭)" : "이 장 학습 완료로 표시";
    });

    /* 퀴즈 */
    if (hasQuiz) mountQuiz(c);
  }

  function learnPanel(c) {
    const objectives = `<div class="card">
      <h2>🎯 학습목표</h2>
      <ul class="objective-list">${c.objectives.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
    </div>`;

    const sections = c.sections
      .map((s) => `<div class="card"><h2>${s.icon} ${esc(s.title)}</h2>${s.html}</div>`)
      .join("");

    const sources = c.sources && c.sources.length
      ? `<div class="card"><h2>📚 핵심 출처 (검증완료)</h2><ul class="source-list">${c.sources.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`
      : "";

    return objectives + sections + sources;
  }

  function termsPanel(c) {
    const cards = c.terms
      .map((t) => `<div class="flashcard">
          <div class="inner">
            <div class="face front">${esc(t.term)}<small>탭하여 뜻 확인</small></div>
            <div class="face back">${esc(t.def)}</div>
          </div>
        </div>`)
      .join("");
    return `<div class="card">
      <h2>🃏 핵심 용어 플래시카드</h2>
      <div class="flash-hint">카드를 탭(클릭)하면 뒤집혀 정의가 나타납니다. 시험 전 빠른 복습에 활용하세요.</div>
      <div class="flash-grid">${cards}</div>
    </div>`;
  }

  function qnaPanel(c) {
    return c.qna
      .map((item) => `<div class="qna-item">
          <button class="q-btn">${esc(item.q)}</button>
          <div class="a-body"><b style="color:var(--primary)">A.</b> ${esc(item.a)}</div>
        </div>`)
      .join("");
  }

  /* ---------- 퀴즈 ---------- */
  function mountQuiz(c) {
    const panel = $("#quizPanel");
    if (!c.quiz || (!c.quiz.ox.length && !c.quiz.mc.length)) {
      panel.innerHTML = `<div class="card"><p>이 장에는 등록된 퀴즈가 없습니다.</p></div>`;
      return;
    }

    const questions = [
      ...c.quiz.ox.map((q) => ({ type: "ox", ...q })),
      ...c.quiz.mc.map((q) => ({ type: "mc", ...q })),
    ];
    let answered = 0;
    let correct = 0;

    const best = quizBest(c.id);
    const items = questions
      .map((q, i) => {
        const tag = q.type === "ox" ? "O / X" : "5지선다";
        let choicesHtml;
        if (q.type === "ox") {
          choicesHtml = `<div class="choices ox" data-q="${i}">
            <button class="choice-btn" data-val="true">O</button>
            <button class="choice-btn" data-val="false">X</button>
          </div>`;
        } else {
          choicesHtml = `<div class="choices" data-q="${i}">
            ${q.choices.map((ch, ci) => `<button class="choice-btn" data-val="${ci}">${ci + 1}) ${esc(ch)}</button>`).join("")}
          </div>`;
        }
        return `<div class="card quiz-q" data-qi="${i}">
          <div class="q-head"><span class="q-tag">${tag}</span><span class="q-text">문항 ${i + 1}. ${esc(q.q)}</span></div>
          ${choicesHtml}
          <div class="explain" data-exp="${i}"></div>
        </div>`;
      })
      .join("");

    panel.innerHTML = `
      <div class="quiz-status">
        <span class="best">📊 진행: <b id="quizCount">0 / ${questions.length}</b></span>
        <span class="best">🏆 이 장 최고 점수: <b id="quizBestLabel">${best != null ? best + "점" : "기록 없음"}</b></span>
        <span class="best">🎓 수료 기준: <b>90점 이상</b></span>
      </div>
      ${items}
      <div class="card quiz-result" id="quizResult" style="display:none"></div>
    `;

    $$(".choices", panel).forEach((box) => {
      const qi = Number(box.dataset.q);
      const q = questions[qi];
      box.addEventListener("click", (e) => {
        const btn = e.target.closest(".choice-btn");
        if (!btn || btn.disabled) return;

        const buttons = $$(".choice-btn", box);
        buttons.forEach((b) => (b.disabled = true));

        let isCorrect;
        if (q.type === "ox") {
          isCorrect = (btn.dataset.val === "true") === q.a;
          buttons.forEach((b) => {
            const v = b.dataset.val === "true";
            if (v === q.a) b.classList.add("correct");
            else if (b === btn) b.classList.add("wrong");
            else b.classList.add("dim");
          });
        } else {
          const val = Number(btn.dataset.val);
          isCorrect = val === q.answer;
          buttons.forEach((b) => {
            const v = Number(b.dataset.val);
            if (v === q.answer) b.classList.add("correct");
            else if (b === btn) b.classList.add("wrong");
            else b.classList.add("dim");
          });
        }

        const exp = $(`.explain[data-exp="${qi}"]`, panel);
        exp.className = `explain show ${isCorrect ? "good" : "bad"}`;
        exp.innerHTML = `<b>${isCorrect ? "⭕ 정답입니다!" : "❌ 오답입니다."}</b>${esc(q.exp)}`;

        answered++;
        if (isCorrect) correct++;
        $("#quizCount").textContent = `${answered} / ${questions.length}`;

        if (answered === questions.length) showResult();
      });
    });

    function showResult() {
      const pct = Math.round((correct / questions.length) * 100);
      setQuizBest(c.id, pct);
      const bestLabel = $("#quizBestLabel");
      if (bestLabel) bestLabel.textContent = quizBest(c.id) + "점";
      const result = $("#quizResult");
      result.style.display = "block";
      result.innerHTML = `
        <div class="score">${pct}점</div>
        <p>${questions.length}문항 중 ${correct}문항 정답${pct === 100 ? " · 완벽합니다! 🎉" : pct >= 70 ? " · 잘했어요! 오답 해설을 다시 확인하세요." : " · 학습 탭에서 핵심 개념을 복습한 뒤 다시 풀어보세요."}</p>
        <button class="btn-primary" id="retryQuiz">다시 풀기</button>
        <button class="btn-ghost" id="goLearn">학습 탭으로</button>
      `;
      $("#retryQuiz").addEventListener("click", () => mountQuiz(c));
      $("#goLearn").addEventListener("click", () => $(`.tabs button[data-tab="learn"]`).click());
      result.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---------- 수료증 · 디지털 배지 ---------- */
  const QUIZ_PASS = 90; // 장별 복습 퀴즈 통과 기준(최고 점수)

  // 수료증 대상은 정규 13개 장(특별장 제외)
  const MAIN_CHAPTERS = CHAPTERS.filter((c) => !c.special);
  function chapterPassed(c) {
    return isDone(c.id) && (quizBest(c.id) ?? -1) >= QUIZ_PASS;
  }
  function certEligible() {
    return MAIN_CHAPTERS.every(chapterPassed);
  }
  function todayKorean() {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function renderCertificate(forceForm) {
    const cert = store.cert;
    let body;
    if (authEnabled() && !currentUser()) body = certLoginRequiredView();
    else if (cert && !forceForm) body = certView(cert);
    else if (certEligible()) body = certFormView(cert);
    else body = certLockedView();

    $("#main").innerHTML = `
      <div class="ch-header">
        <div class="crumb"><a href="#/">홈</a> › 수료증 · 디지털 배지</div>
        <h1>🎓 수료증 · 디지털 배지 발급</h1>
        <div class="en">Certificate of Completion & Digital Badge</div>
      </div>
      ${body}
      ${footer()}
    `;
    bindCertEvents(cert, forceForm);
  }

  function certLockedView() {
    const rows = MAIN_CHAPTERS.map((c) => {
      const done = isDone(c.id);
      const best = quizBest(c.id);
      const quizOk = (best ?? -1) >= QUIZ_PASS;
      return `<li class="${done && quizOk ? "pass" : ""}">
        <a href="#/ch/${c.id}">${c.id}장. ${esc(c.title)}</a>
        <span class="req ${done ? "ok" : ""}">${done ? "✓ 학습 완료" : "학습 미완료"}</span>
        <span class="req ${quizOk ? "ok" : ""}">${best != null ? `퀴즈 ${best}점` : "퀴즈 미응시"}${quizOk ? " ✓" : ` (${QUIZ_PASS}점 이상 필요)`}</span>
      </li>`;
    }).join("");
    const passed = MAIN_CHAPTERS.filter(chapterPassed).length;
    const pct = Math.round((passed / MAIN_CHAPTERS.length) * 100);
    return `
      <div class="card">
        <h2>🔒 발급 기준을 아직 충족하지 못했습니다</h2>
        <p>수료증과 디지털 배지는 <b>13개 전 장의 학습을 완료</b>하고, <b>장별 복습 퀴즈에서 ${QUIZ_PASS}점 이상</b>(최고 점수 기준)을 획득하면 발급할 수 있습니다.</p>
        <div class="bar-label" style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-sub);margin:14px 0 6px">
          <span>기준 충족 현황</span><b>${passed} / ${MAIN_CHAPTERS.length}장 (${pct}%)</b>
        </div>
        <div class="bar" style="height:12px;background:#f7e4ec;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;border-radius:999px;background:linear-gradient(90deg,var(--primary),#f06595)"></div>
        </div>
        <ul class="cert-req-list">${rows}</ul>
      </div>`;
  }

  function certLoginRequiredView() {
    return `
      <div class="card" style="text-align:center">
        <h2 style="justify-content:center">🔐 Google 계정 로그인이 필요합니다</h2>
        <p>수료증·디지털 배지는 본인 확인(도용 방지)을 위해 Google 계정 로그인 후 발급할 수 있습니다.<br>
        발급된 수료증에는 인증된 Google 계정 정보가 표시되며, 담당 교수에게 발급 내용이 통지됩니다.</p>
        <button class="btn-primary" id="certLoginBtn">Google 계정으로 로그인</button>
      </div>`;
  }

  function certFormView() {
    const p = store.profile;
    const u = currentUser();
    if (!p) {
      return `
        <div class="card" style="text-align:center">
          <h2 style="justify-content:center">👤 학습자 정보가 필요합니다</h2>
          <p>수료증 발급에는 학과·학년·반·학번·성명·이메일 정보가 필요합니다.<br>학습자 정보를 먼저 등록해 주세요.</p>
          <button class="btn-primary" id="certProfileBtn">학습자 정보 등록</button>
        </div>`;
    }
    return `
      <div class="card">
        <h2>🎉 축하합니다! 발급 기준을 모두 충족했습니다</h2>
        <p>13개 전 장 학습 완료 + 장별 복습 퀴즈 ${QUIZ_PASS}점 이상을 달성했습니다.
        아래 학습자 정보로 수료증과 디지털 배지가 발급됩니다.</p>
        ${u ? `<div class="callout ok" style="margin-top:0">🔐 <b>본인 인증됨</b>: ${esc(u.name)} (${esc(u.email)}) — 이 Google 계정 정보가 수료증에 인증 표시되고, 발급 내용이 ${esc(CFG.professorName || "담당 교수")}에게 통지됩니다.</div>` : `<div class="callout warn" style="margin-top:0">⚠️ Google 로그인이 설정되지 않아 인증 표시 없이 발급됩니다.</div>`}
        <table class="cert-info" style="margin:16px auto">
          <tr><th>학과</th><td>${esc(p.dept)}</td></tr>
          <tr><th>학년 / 반</th><td>${esc(String(p.grade))}학년 ${esc(fmtClass(p.classNo))}</td></tr>
          <tr><th>학번</th><td>${esc(p.sid)}</td></tr>
          <tr><th>성명</th><td>${esc(p.name)}</td></tr>
          <tr><th>이메일</th><td>${esc(p.email)}</td></tr>
        </table>
        <div style="text-align:center">
          <button class="btn-primary" id="issueCert">🎓 수료증 · 디지털 배지 발급</button>
          <button class="btn-ghost" id="certProfileBtn">내 정보 수정</button>
        </div>
      </div>`;
  }

  function certView(cert) {
    return `
      ${certNotifyBanner(cert)}
      <div class="cert-actions">
        <button class="btn-primary" id="printCert">🖨️ 수료증 인쇄 / PDF 저장</button>
        <button class="btn-primary" id="downloadBadge">⬇️ 디지털 배지 PNG 다운로드</button>
        <button class="btn-ghost" id="mailProfessor">📧 교수님께 발급 메일 보내기</button>
        <button class="btn-ghost" id="editCert">정보 수정 후 재발급</button>
        <button class="btn-ghost" id="deleteCert">발급 기록 삭제</button>
      </div>
      <div class="cert-grid">
        <div class="cert-sheet" id="certSheet">
          <div class="cert-border">
            <div class="cert-no">제 ${esc(cert.certNo)} 호</div>
            <h2 class="cert-title">수료증</h2>
            <div class="cert-sub">CERTIFICATE OF COMPLETION</div>
            <table class="cert-info">
              <tr><th>학&nbsp;&nbsp;과</th><td>${esc(cert.dept)}</td></tr>
              <tr><th>학년 / 반</th><td>${esc(String(cert.grade))}학년 ${esc(fmtClass(cert.classNo))}</td></tr>
              <tr><th>학&nbsp;&nbsp;번</th><td>${esc(cert.sid)}</td></tr>
              <tr><th>성&nbsp;&nbsp;명</th><td>${esc(cert.name)}</td></tr>
              ${cert.email ? `<tr><th>이메일</th><td>${esc(cert.email)}</td></tr>` : ""}
            </table>
            <p class="cert-body">위 학생은 「AI융합 간호정보학」 교과목의
            전 과정(13개 장)을 성실히 이수하고 장별 복습퀴즈에서 ${QUIZ_PASS}점 이상을
            취득하였으므로 이 증서를 수여합니다.</p>
            <div class="cert-date">${esc(cert.date)}</div>
            <div class="cert-issuer">청암대학교 간호학과
              <span class="seal red-seal">AI융합<br>간호정보학<br>담당교수</span>
            </div>
            ${cert.authEmail ? `<div class="cert-auth">🔐 본인 인증: Google 계정 ${esc(cert.authName || "")} &lt;${esc(cert.authEmail)}&gt;${cert.nameMatch === false ? " (성명-계정 이름 불일치)" : ""}</div>` : ""}
          </div>
        </div>
        <div class="card badge-card">
          <h2>🏅 디지털 배지</h2>
          <div class="badge-wrap">${badgeSVG(cert)}</div>
          <p class="flash-hint">PNG로 다운로드하여 SNS 프로필·포트폴리오·이력서에 활용하세요.</p>
        </div>
      </div>`;
  }

  function badgeSVG(cert) {
    const year = cert.year || new Date().getFullYear();
    return `
    <svg id="badgeSvg" width="480" height="620" viewBox="0 0 480 620" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="수료 디지털 배지">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#a61e4d"/><stop offset=".55" stop-color="#d6336c"/><stop offset="1" stop-color="#f06595"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f9d976"/><stop offset="1" stop-color="#d9a92f"/>
        </linearGradient>
        <path id="arcTop" d="M 96 240 A 144 144 0 0 1 384 240"/>
        <path id="arcBottom" d="M 104 240 A 136 136 0 0 0 376 240"/>
      </defs>
      <polygon points="178,418 246,458 198,592 152,506" fill="#a61e4d"/>
      <polygon points="302,418 234,458 282,592 328,506" fill="#d6336c"/>
      <circle cx="240" cy="240" r="170" fill="url(#bgGrad)"/>
      <circle cx="240" cy="240" r="157" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="2 7"/>
      <circle cx="240" cy="240" r="141" fill="none" stroke="url(#goldGrad)" stroke-width="6"/>
      <circle cx="240" cy="240" r="118" fill="#fffdf8"/>
      <text font-size="22" font-weight="800" fill="#ffffff" font-family="sans-serif" letter-spacing="2">
        <textPath href="#arcTop" xlink:href="#arcTop" startOffset="50%" text-anchor="middle">AI융합 간호정보학</textPath>
      </text>
      <text font-size="10.5" font-weight="700" fill="rgba(255,255,255,.9)" font-family="sans-serif" letter-spacing=".5">
        <textPath href="#arcBottom" xlink:href="#arcBottom" startOffset="50%" text-anchor="middle">AI-Integrated Nursing Informatics</textPath>
      </text>
      <rect x="227" y="152" width="26" height="80" rx="7" fill="url(#bgGrad)"/>
      <rect x="200" y="179" width="80" height="26" rx="7" fill="url(#bgGrad)"/>
      <text x="240" y="199" font-size="17" font-weight="900" text-anchor="middle" fill="#ffffff" font-family="sans-serif">AI</text>
      <polyline points="158,262 198,262 212,240 228,284 243,248 254,262 322,262"
        fill="none" stroke="#d6336c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="240" y="308" font-size="26" font-weight="900" text-anchor="middle" fill="#3d2230" font-family="sans-serif">수료</text>
      <text x="240" y="330" font-size="10" font-weight="700" text-anchor="middle" fill="#8a6276" font-family="sans-serif" letter-spacing="3">CERTIFIED · ${year}</text>
      <rect x="118" y="468" width="244" height="56" rx="13" fill="url(#goldGrad)" stroke="#b98a1d" stroke-width="2"/>
      <text x="240" y="494" font-size="21" font-weight="900" text-anchor="middle" fill="#5b3d0d" font-family="sans-serif">${esc(cert.name)}</text>
      <text x="240" y="513" font-size="11" font-weight="700" text-anchor="middle" fill="#7a5a1a" font-family="sans-serif">${esc(cert.dept)} · ${esc(cert.sid)}</text>
    </svg>`;
  }

  /* ---------- 발급 통지 메일 ---------- */
  function certNotifyBanner(cert) {
    if (cert.notify === "sent") {
      return `<div class="callout ok" style="text-align:center">📧 발급 내용이 ${esc(CFG.professorName || "담당 교수")}(${esc(CFG.professorEmail || "")})에게 자동 통지되었습니다.</div>`;
    }
    if (cert.notify === "failed") {
      return `<div class="callout warn" style="text-align:center">⚠️ 자동 통지 전송에 실패했습니다. 아래 '📧 교수님께 발급 메일 보내기' 버튼으로 직접 발송해 주세요.</div>`;
    }
    return `<div class="callout info" style="text-align:center">📧 '교수님께 발급 메일 보내기' 버튼을 눌러 ${esc(CFG.professorName || "담당 교수")}(${esc(CFG.professorEmail || "")})에게 발급 내용을 발송해 주세요.</div>`;
  }

  function certPayload(cert) {
    return {
      issuedAt: cert.date,
      certNo: cert.certNo,
      dept: cert.dept,
      grade: cert.grade,
      classNo: fmtClass(cert.classNo),
      sid: cert.sid,
      name: cert.name,
      email: cert.email || "",
      authName: cert.authName || "",
      authEmail: cert.authEmail || "",
      nameMatch: cert.nameMatch !== false,
    };
  }

  async function notifyProfessor(cert) {
    if (!CFG.notifyEndpoint) return "manual";
    try {
      await fetch(CFG.notifyEndpoint, { method: "POST", mode: "no-cors", body: JSON.stringify(certPayload(cert)) });
      return "sent";
    } catch (e) {
      return "failed";
    }
  }

  function mailtoProfessor(cert) {
    const p = certPayload(cert);
    const subject = `[AI융합 간호정보학] 수료증 발급 통지 — ${p.name} (${p.sid})`;
    const body = [
      "수료증 발급 내용을 알려드립니다.",
      "",
      `발급 일시: ${p.issuedAt}`,
      `증서 번호: ${p.certNo}`,
      `학과: ${p.dept}`,
      `학년/반: ${p.grade}학년 ${p.classNo}`,
      `학번: ${p.sid}`,
      `성명: ${p.name}`,
      `이메일: ${p.email}`,
      p.authEmail ? `Google 계정 인증: ${p.authName} <${p.authEmail}>${p.nameMatch ? "" : " (성명-계정 이름 불일치)"}` : "Google 계정 인증: (미인증 발급)",
      "",
      "발급 기준: 13개 전 장 학습 완료 + 장별 복습 퀴즈 90점 이상",
    ].join("\n");
    location.href = `mailto:${encodeURIComponent(CFG.professorEmail || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function downloadBadgePNG(cert) {
    const svg = $("#badgeSvg");
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 960; c.height = 1240;
      c.getContext("2d").drawImage(img, 0, 0, 960, 1240);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `AI간호정보학_수료배지_${cert.name}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }

  function issueCert() {
    const p = store.profile;
    if (!p) { showProfileSetup(() => renderCertificate()); return; }
    const data = { ...p };
    const u = currentUser();
    if (u) {
      data.authName = u.name;
      data.authEmail = u.email;
      const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
      data.nameMatch = norm(u.name) === norm(data.name) || norm(u.name).includes(norm(data.name)) || norm(data.name).includes(norm(u.name));
      if (!data.nameMatch && !confirm(
        `등록된 성명(${data.name})이 로그인한 Google 계정 이름(${u.name})과 다릅니다.\n` +
        `본인 명의가 아닌 수료증 발급은 도용에 해당할 수 있으며, 불일치 사실이 수료증과 교수 통지 메일에 표시됩니다.\n계속할까요?`)) {
        return;
      }
    }
    const now = new Date();
    data.date = todayKorean();
    data.year = now.getFullYear();
    data.certNo = `AINI-${now.getFullYear()}-${data.sid}`;
    store.cert = data;
    saveStore(store);
    notifyProfessor(data).then((status) => {
      store.cert.notify = status;
      saveStore(store);
      renderSidebar("certificate");
      renderCertificate();
      window.scrollTo({ top: 0 });
    });
  }

  function bindCertEvents(cert, forceForm) {
    $("#issueCert")?.addEventListener("click", issueCert);
    $("#certProfileBtn")?.addEventListener("click", () => showProfileSetup(() => renderCertificate(forceForm)));
    $("#certLoginBtn")?.addEventListener("click", showLogin);
    if (cert && !forceForm) {
      $("#printCert")?.addEventListener("click", () => window.print());
      $("#downloadBadge")?.addEventListener("click", () => downloadBadgePNG(cert));
      $("#mailProfessor")?.addEventListener("click", () => mailtoProfessor(cert));
      $("#editCert")?.addEventListener("click", () => showProfileSetup(() => {
        if (store.cert && store.profile) {
          Object.assign(store.cert, store.profile);
          store.cert.certNo = `AINI-${store.cert.year}-${store.cert.sid}`;
          saveStore(store);
        }
        renderCertificate();
      }));
      $("#deleteCert")?.addEventListener("click", () => {
        if (confirm("발급 기록을 삭제할까요? 기준을 충족하는 한 다시 발급할 수 있습니다.")) {
          delete store.cert;
          saveStore(store);
          renderSidebar("certificate");
          renderCertificate();
        }
      });
    }
  }

  function footer() {
    return `<div class="footer">${esc(COURSE.school)} · ${esc(COURSE.professor)} · ${esc(COURSE.email)}</div>`;
  }

  /* ---------- 라우터 ---------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    document.body.classList.remove("sidebar-open");
    window.scrollTo({ top: 0 });

    if (hash === "preface") {
      renderSidebar("preface");
      renderProse(PREFACE, true);
    } else if (hash === "certificate") {
      renderSidebar("certificate");
      renderCertificate();
    } else if (hash === "closing") {
      renderSidebar("closing");
      renderProse(CLOSING, false);
    } else if (/^ch\/\d+$/.test(hash)) {
      const id = Number(hash.split("/")[1]);
      renderSidebar(`ch/${id}`);
      renderChapter(id);
    } else {
      renderSidebar("home");
      renderHome();
    }
  }

  renderShell();
  window.addEventListener("hashchange", route);
  route();
  if (authEnabled() && !currentUser()) showLogin();
  else if (!store.profile) showProfileSetup();
})();
