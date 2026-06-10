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
            <span>${esc(COURSE.school)}</span>
          </span>
        </a>
        <div class="spacer"></div>
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
          return `<a class="chapter-card" href="#/ch/${c.id}">
            <div class="top">
              <span class="num">${c.id}</span>
              <span class="status ${done ? "" : "todo"}">${done ? "✓ 학습 완료" : "미학습"}</span>
            </div>
            <h3>${esc(c.title)}</h3>
            <div class="en">${esc(c.titleEn)}</div>
            <div class="meta">
              <span>📋 목표 ${c.objectives.length}</span>
              <span>🃏 용어 ${c.terms.length}</span>
              <span>✍️ 퀴즈 ${quizCount}${best != null ? ` · 최고 ${best}%` : ""}</span>
            </div>
          </a>`;
        })
        .join("");
      return `<div class="part-label">${esc(part.label)}</div><div class="chapter-grid">${cards}</div>`;
    }).join("");

    $("#main").innerHTML = `
      <section class="hero">
        <div class="badge-row">
          <span class="badge">${esc(COURSE.target)}</span>
          <span class="badge">${esc(COURSE.school)}</span>
        </div>
        <h1>${esc(COURSE.title)}</h1>
        <div class="en">${esc(COURSE.titleEn)}</div>
        <p class="desc">AI를 두려워하지도, 맹목적으로 신뢰하지도 않는 간호사 — AI 출력을 TRACE로 검증하고, Human-in-the-Loop 원칙으로 최종 판단을 내리는 'AI 시대의 간호 전문가'를 기르는 13개 장의 여정입니다.</p>
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

    const tabs = [
      ["learn", "📖 학습"],
      ["terms", "🃏 용어 카드"],
      ["quiz", "✍️ 복습 퀴즈"],
    ];
    if (c.qna && c.qna.length) tabs.push(["qna", "❓ Q&A"]);

    $("#main").innerHTML = `
      <div class="ch-header">
        <div class="crumb"><a href="#/">홈</a> › 제${c.id}장</div>
        <h1>제${c.id}장. ${esc(c.title)}</h1>
        <div class="en">${esc(c.titleEn)}</div>
      </div>

      <div class="tabs">
        ${tabs.map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? "active" : ""}">${label}</button>`).join("")}
      </div>

      <section class="panel ${tab === "learn" ? "active" : ""}" data-panel="learn">${learnPanel(c)}</section>
      <section class="panel ${tab === "terms" ? "active" : ""}" data-panel="terms">${termsPanel(c)}</section>
      <section class="panel ${tab === "quiz" ? "active" : ""}" data-panel="quiz" id="quizPanel"></section>
      ${c.qna && c.qna.length ? `<section class="panel ${tab === "qna" ? "active" : ""}" data-panel="qna">${qnaPanel(c)}</section>` : ""}

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
    mountQuiz(c);
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
        <span class="best">🏆 이 장 최고 점수: <b>${best != null ? best + "%" : "기록 없음"}</b></span>
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

  function chapterPassed(c) {
    return isDone(c.id) && (quizBest(c.id) ?? -1) >= QUIZ_PASS;
  }
  function certEligible() {
    return CHAPTERS.every(chapterPassed);
  }
  function todayKorean() {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function renderCertificate(forceForm) {
    const cert = store.cert;
    let body;
    if (cert && !forceForm) body = certView(cert);
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
    const rows = CHAPTERS.map((c) => {
      const done = isDone(c.id);
      const best = quizBest(c.id);
      const quizOk = (best ?? -1) >= QUIZ_PASS;
      return `<li class="${done && quizOk ? "pass" : ""}">
        <a href="#/ch/${c.id}">${c.id}장. ${esc(c.title)}</a>
        <span class="req ${done ? "ok" : ""}">${done ? "✓ 학습 완료" : "학습 미완료"}</span>
        <span class="req ${quizOk ? "ok" : ""}">${best != null ? `퀴즈 ${best}점` : "퀴즈 미응시"}${quizOk ? " ✓" : ` (${QUIZ_PASS}점 이상 필요)`}</span>
      </li>`;
    }).join("");
    const passed = CHAPTERS.filter(chapterPassed).length;
    const pct = Math.round((passed / CHAPTERS.length) * 100);
    return `
      <div class="card">
        <h2>🔒 발급 기준을 아직 충족하지 못했습니다</h2>
        <p>수료증과 디지털 배지는 <b>13개 전 장의 학습을 완료</b>하고, <b>장별 복습 퀴즈에서 ${QUIZ_PASS}점 이상</b>(최고 점수 기준)을 획득하면 발급할 수 있습니다.</p>
        <div class="bar-label" style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-sub);margin:14px 0 6px">
          <span>기준 충족 현황</span><b>${passed} / ${CHAPTERS.length}장 (${pct}%)</b>
        </div>
        <div class="bar" style="height:12px;background:#f7e4ec;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${pct}%;border-radius:999px;background:linear-gradient(90deg,var(--primary),#f06595)"></div>
        </div>
        <ul class="cert-req-list">${rows}</ul>
      </div>`;
  }

  function certFormView(prev) {
    const v = prev || {};
    const gradeOpts = [1, 2, 3, 4]
      .map((g) => `<option value="${g}" ${String(v.grade || 3) == String(g) ? "selected" : ""}>${g}학년</option>`)
      .join("");
    return `
      <div class="card">
        <h2>🎉 축하합니다! 발급 기준을 모두 충족했습니다</h2>
        <p>13개 전 장 학습 완료 + 장별 복습 퀴즈 ${QUIZ_PASS}점 이상을 달성했습니다.
        아래 정보를 입력하면 수료증과 디지털 배지가 발급됩니다.
        입력한 정보는 이 브라우저에만 저장되며 외부로 전송되지 않습니다.</p>
        <form id="certForm" class="cert-form">
          <label>학과 <input name="dept" value="${esc(v.dept || "간호학과")}" required maxlength="20"></label>
          <label>학년 <select name="grade">${gradeOpts}</select></label>
          <label>반 <input name="classNo" value="${esc(v.classNo || "")}" placeholder="예: A반" required maxlength="10"></label>
          <label>학번 <input name="sid" value="${esc(v.sid || "")}" placeholder="예: 20241234" required maxlength="15"></label>
          <label class="full">성명 <input name="name" value="${esc(v.name || "")}" placeholder="예: 홍길동" required maxlength="20"></label>
          <div class="full" style="text-align:center;margin-top:6px">
            <button class="btn-primary" type="submit">🎓 수료증 · 디지털 배지 발급</button>
            ${prev ? '<button class="btn-ghost" type="button" id="cancelEdit">취소</button>' : ""}
          </div>
        </form>
      </div>`;
  }

  function certView(cert) {
    return `
      <div class="cert-actions">
        <button class="btn-primary" id="printCert">🖨️ 수료증 인쇄 / PDF 저장</button>
        <button class="btn-primary" id="downloadBadge">⬇️ 디지털 배지 PNG 다운로드</button>
        <button class="btn-ghost" id="editCert">정보 수정 후 재발급</button>
        <button class="btn-ghost" id="deleteCert">발급 기록 삭제</button>
      </div>
      <div class="cert-grid">
        <div class="cert-sheet" id="certSheet">
          <div class="cert-border">
            <div class="cert-no">제 ${esc(cert.certNo)} 호</div>
            <div class="cert-logo"><img src="assets/logo.png" alt="" onerror="this.parentElement.style.display='none'"></div>
            <h2 class="cert-title">수료증</h2>
            <div class="cert-sub">CERTIFICATE OF COMPLETION</div>
            <table class="cert-info">
              <tr><th>학&nbsp;&nbsp;과</th><td>${esc(cert.dept)}</td></tr>
              <tr><th>학년 / 반</th><td>${esc(String(cert.grade))}학년 ${esc(cert.classNo)}</td></tr>
              <tr><th>학&nbsp;&nbsp;번</th><td>${esc(cert.sid)}</td></tr>
              <tr><th>성&nbsp;&nbsp;명</th><td>${esc(cert.name)}</td></tr>
            </table>
            <p class="cert-body">위 학생은 청암대학교 간호학과 「AI융합 간호정보학」 교과목의
            전 과정(13개 장)을 성실히 이수하고 장별 복습 퀴즈에서 ${QUIZ_PASS}점 이상을
            취득하였으므로 이 증서를 수여합니다.</p>
            <div class="cert-date">${esc(cert.date)}</div>
            <div class="cert-issuer">청암대학교 간호학과 <b>제프리 교수</b> <span class="seal">제프리<br>印</span></div>
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
    <svg id="badgeSvg" viewBox="0 0 480 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="수료 디지털 배지">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#a61e4d"/><stop offset=".55" stop-color="#d6336c"/><stop offset="1" stop-color="#f06595"/>
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f9d976"/><stop offset="1" stop-color="#d9a92f"/>
        </linearGradient>
        <path id="arcTop" d="M 96 240 A 144 144 0 0 1 384 240"/>
        <path id="arcBottom" d="M 110 240 A 130 130 0 0 0 370 240"/>
      </defs>
      <polygon points="178,418 246,458 198,592 152,506" fill="#a61e4d"/>
      <polygon points="302,418 234,458 282,592 328,506" fill="#d6336c"/>
      <circle cx="240" cy="240" r="170" fill="url(#bgGrad)"/>
      <circle cx="240" cy="240" r="157" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="2 7"/>
      <circle cx="240" cy="240" r="141" fill="none" stroke="url(#goldGrad)" stroke-width="6"/>
      <circle cx="240" cy="240" r="118" fill="#fffdf8"/>
      <text font-size="22" font-weight="800" fill="#ffffff" font-family="sans-serif" letter-spacing="2">
        <textPath href="#arcTop" startOffset="50%" text-anchor="middle">AI융합 간호정보학</textPath>
      </text>
      <text font-size="12" font-weight="700" fill="rgba(255,255,255,.9)" font-family="sans-serif" letter-spacing="3">
        <textPath href="#arcBottom" startOffset="50%" text-anchor="middle">CHEONGAM UNIVERSITY · NURSING</textPath>
      </text>
      <text x="240" y="84" font-size="24" text-anchor="middle" fill="#f9d976" font-family="sans-serif">★</text>
      <rect x="225" y="158" width="30" height="92" rx="8" fill="url(#bgGrad)"/>
      <rect x="194" y="189" width="92" height="30" rx="8" fill="url(#bgGrad)"/>
      <text x="240" y="211" font-size="19" font-weight="900" text-anchor="middle" fill="#ffffff" font-family="sans-serif">AI</text>
      <polyline points="152,282 196,282 211,256 229,304 245,266 257,282 328,282"
        fill="none" stroke="#d6336c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="240" y="328" font-size="27" font-weight="900" text-anchor="middle" fill="#3d2230" font-family="sans-serif">수료</text>
      <text x="240" y="349" font-size="10.5" font-weight="700" text-anchor="middle" fill="#8a6276" font-family="sans-serif" letter-spacing="4">CERTIFIED · ${year}</text>
      <rect x="118" y="468" width="244" height="56" rx="13" fill="url(#goldGrad)" stroke="#b98a1d" stroke-width="2"/>
      <text x="240" y="494" font-size="21" font-weight="900" text-anchor="middle" fill="#5b3d0d" font-family="sans-serif">${esc(cert.name)}</text>
      <text x="240" y="513" font-size="11" font-weight="700" text-anchor="middle" fill="#7a5a1a" font-family="sans-serif">${esc(cert.dept)} · ${esc(cert.sid)}</text>
      <text x="240" y="560" font-size="12" font-weight="700" text-anchor="middle" fill="#a85c7d" font-family="sans-serif">청암대학교 간호학과 · 제프리 교수</text>
    </svg>`;
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

  function bindCertEvents(cert, forceForm) {
    const form = $("#certForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
          dept: (fd.get("dept") || "").trim(),
          grade: (fd.get("grade") || "").trim(),
          classNo: (fd.get("classNo") || "").trim(),
          sid: (fd.get("sid") || "").trim(),
          name: (fd.get("name") || "").trim(),
        };
        if (!data.dept || !data.grade || !data.classNo || !data.sid || !data.name) {
          alert("모든 항목(학과·학년·반·학번·성명)을 입력해 주세요.");
          return;
        }
        const now = new Date();
        data.date = todayKorean();
        data.year = now.getFullYear();
        data.certNo = `AINI-${now.getFullYear()}-${data.sid}`;
        store.cert = data;
        saveStore(store);
        renderSidebar("certificate");
        renderCertificate();
        window.scrollTo({ top: 0 });
      });
      const cancel = $("#cancelEdit");
      if (cancel) cancel.addEventListener("click", () => renderCertificate());
    }
    if (cert && !forceForm) {
      $("#printCert")?.addEventListener("click", () => window.print());
      $("#downloadBadge")?.addEventListener("click", () => downloadBadgePNG(cert));
      $("#editCert")?.addEventListener("click", () => renderCertificate(true));
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
    return `<div class="footer">${esc(COURSE.school)} · ${esc(COURSE.title)} · ${esc(COURSE.professor)}</div>`;
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
})();
