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
          <b>${esc(COURSE.title)}</b>
          <span>${esc(COURSE.school)} · ${esc(COURSE.semester)}</span>
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
          <span class="badge">${esc(COURSE.semester)}</span>
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

  function footer() {
    return `<div class="footer">${esc(COURSE.school)} · ${esc(COURSE.title)} · ${esc(COURSE.semester)} · ${esc(COURSE.professor)}</div>`;
  }

  /* ---------- 라우터 ---------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    document.body.classList.remove("sidebar-open");
    window.scrollTo({ top: 0 });

    if (hash === "preface") {
      renderSidebar("preface");
      renderProse(PREFACE, true);
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
