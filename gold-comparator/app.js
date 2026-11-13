/* =========================================================================
   AURUM — Bullion Desk
   Vietnam vs India gold price comparator.

   Conversions
     1 chi (mace)  = 3.75 g
     1 pavan       = 8 g
     1 tola        = 11.664 g
   All comparisons are normalised to INR (₹).
   ========================================================================= */

(() => {
  "use strict";

  /* ----------------------------- Constants ------------------------------ */
  const CHI_GRAMS = 3.75;
  const PAVAN_GRAMS = 8;
  const TOLA_GRAMS = 11.664;
  const GST_INDIA = 0.03; // illustrative, for the "what if" insight only

  const UNITS = [
    { key: "gram", label: "1 gram", short: "1 g", weight: 1, kpi: true },
    { key: "chi", label: "1 chi", short: "1 chi", weight: CHI_GRAMS, kpi: true },
    { key: "pavan", label: "1 pavan", short: "1 pavan", weight: PAVAN_GRAMS, kpi: true },
    { key: "tola", label: "1 tola", short: "1 tola", weight: TOLA_GRAMS, kpi: true },
    { key: "ten", label: "10 grams", short: "10 g", weight: 10, kpi: false },
    { key: "hundred", label: "100 grams", short: "100 g", weight: 100, kpi: false },
  ];

  const SAMPLE = { vnChi: 15000000, inGram: 12050, fx: 0.00327, dir: "vndToInr" };
  const STORE = { theme: "aurum.theme", dir: "aurum.fxDir", history: "aurum.history" };
  const MAX_HISTORY = 8;

  /* ------------------------------ Elements ------------------------------ */
  const $ = (id) => document.getElementById(id);

  const els = {
    html: document.documentElement,
    themeToggle: $("themeToggle"),
    vnChi: $("vnChi"),
    inGram: $("inGram"),
    fx: $("fx"),
    fxUnit: $("fxUnit"),
    fxHint: $("fxHint"),
    invertFx: $("invertFx"),
    btnSample: $("btnSample"),
    btnReset: $("btnReset"),
    btnCsv: $("btnCsv"),
    btnPdf: $("btnPdf"),
    btnSave: $("btnSave"),
    btnClearHistory: $("btnClearHistory"),
    verdictTitle: $("verdictTitle"),
    verdictText: $("verdictText"),
    verdictPercent: $("verdictPercent"),
    kpiGrid: $("kpiGrid"),
    barVN: $("barVN"),
    barIN: $("barIN"),
    barVnVal: $("barVnVal"),
    barInVal: $("barInVal"),
    ledgerBody: $("ledgerBody"),
    insights: $("insights"),
    fxRatePill: $("fxRatePill"),
    historyList: $("historyList"),
    historyEmpty: $("historyEmpty"),
    report: $("report"),
  };

  /* ----------------------------- Formatters ----------------------------- */
  const nfInr = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const nfInrShort = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  const nfVnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
  const nfFx = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 5 });
  const nfPct = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  const fmtINR = (n) => `₹${nfInr.format(n)}`;
  const fmtINRShort = (n) => `₹${nfInrShort.format(n)}`;
  const fmtVND = (n) => `${nfVnd.format(n)} ₫`;
  const fmtFx = (n) => nfFx.format(n);
  const fmtPct = (n) => `${nfPct.format(n)}%`;

  /* ----------------------------- Utilities ------------------------------ */
  const isPos = (n) => Number.isFinite(n) && n > 0;

  function readState() {
    const dir = localStorage.getItem(STORE.dir) === "inrToVnd" ? "inrToVnd" : "vndToInr";
    return {
      vnChi: parseFloat(els.vnChi.value),
      inGram: parseFloat(els.inGram.value),
      fx: parseFloat(els.fx.value),
      dir,
    };
  }

  function validate(state) {
    const errors = {};
    if (!isPos(state.vnChi)) errors.vnChi = "Enter a rate greater than zero.";
    if (!isPos(state.inGram)) errors.inGram = "Enter a rate greater than zero.";
    if (!isPos(state.fx)) errors.fx = "Enter an exchange rate greater than zero.";

    // Guard against implausible magnitudes (typo detection, not a hard limit).
    if (isPos(state.vnChi) && state.vnChi > 1e12) errors.vnChi = "That seems too large for a per-chi quote.";
    if (isPos(state.inGram) && state.inGram > 1e7) errors.inGram = "That seems too large for a per-gram quote.";

    return errors;
  }

  function paintErrors(errors) {
    document.querySelectorAll(".field").forEach((field) => {
      const key = field.dataset.field;
      const msg = errors[key];
      field.classList.toggle("is-invalid", Boolean(msg));
      const slot = field.querySelector(".field__error");
      if (slot) slot.textContent = msg || "";
    });
  }

  /* ------------------------------ Compute ------------------------------- */
  function compute(state) {
    const fxToInr = state.dir === "vndToInr" ? state.fx : 1 / state.fx;

    const vnPerGramVnd = state.vnChi / CHI_GRAMS;
    const vnPerGram = vnPerGramVnd * fxToInr; // ₹ per gram
    const inPerGram = state.inGram; // ₹ per gram

    const rows = UNITS.map((u) => {
      const vn = vnPerGram * u.weight;
      const india = inPerGram * u.weight;
      const diff = Math.abs(vn - india);
      const cheaper = diff < 0.005 ? "Parity" : vn < india ? "Vietnam" : "India";
      return { ...u, vn, india, diff, cheaper };
    });

    const diffGram = Math.abs(vnPerGram - inPerGram);
    const cheaper = diffGram < 0.005 ? "Parity" : vnPerGram < inPerGram ? "Vietnam" : "India";
    const percent = Math.min(vnPerGram, inPerGram) > 0
      ? (diffGram / Math.min(vnPerGram, inPerGram)) * 100
      : 0;

    return {
      ...state,
      fxToInr,
      vnPerGramVnd,
      vnPerGram,
      inPerGram,
      rows,
      diffGram,
      cheaper,
      percent,
    };
  }

  /* ------------------------------ Render -------------------------------- */
  function renderVerdict(c) {
    if (!c) {
      els.verdictTitle.textContent = "Awaiting quotes";
      els.verdictText.textContent = "Enter both gold rates and an exchange rate to see the comparison.";
      els.verdictPercent.textContent = "—";
      return;
    }

    if (c.cheaper === "Parity") {
      els.verdictTitle.textContent = "Dead even";
      els.verdictText.textContent =
        "Both markets land on the same price per gram once converted. Any edge will come from duties, making charges and liquidity.";
      els.verdictPercent.textContent = "0.0%";
      return;
    }

    els.verdictTitle.textContent = `${c.cheaper} is cheaper`;
    els.verdictText.textContent =
      c.cheaper === "Vietnam"
        ? `A gram of gold costs ${fmtINR(c.diffGram)} less in Vietnam at the rate you entered — that is the equivalent of ${fmtINRShort(c.diffGram * PAVAN_GRAMS)} saved on a pavan.`
        : `A gram of gold costs ${fmtINR(c.diffGram)} less in India at the rate you entered — that is the equivalent of ${fmtINRShort(c.diffGram * PAVAN_GRAMS)} saved on a pavan.`;
    els.verdictPercent.textContent = fmtPct(c.percent);
  }

  function renderKpis(c) {
    if (!c) {
      els.kpiGrid.innerHTML = UNITS.filter((u) => u.kpi)
        .map(
          (u) => `
        <article class="kpi">
          <div class="kpi__head">
            <span class="kpi__unit">${u.label}</span>
            <span class="kpi__weight">${u.weight} g</span>
          </div>
          <div class="kpi__row"><span class="kpi__market">Vietnam</span><span class="kpi__value">—</span></div>
          <div class="kpi__row"><span class="kpi__market">India</span><span class="kpi__value">—</span></div>
          <div class="kpi__foot"><span>Awaiting quote</span><span class="kpi__diff">—</span></div>
        </article>`
        )
        .join("");
      return;
    }

    els.kpiGrid.innerHTML = c.rows
      .filter((r) => r.kpi)
      .map((r) => {
        const vnWin = r.cheaper === "Vietnam";
        const inWin = r.cheaper === "India";
        return `
        <article class="kpi">
          <div class="kpi__head">
            <span class="kpi__unit">${r.label}</span>
            <span class="kpi__weight">${r.weight} g</span>
          </div>
          <div class="kpi__row${vnWin ? " is-cheaper" : ""}">
            <span class="kpi__market">Vietnam</span>
            <span class="kpi__value">${fmtINR(r.vn)}</span>
          </div>
          <div class="kpi__row${inWin ? " is-cheaper" : ""}">
            <span class="kpi__market">India</span>
            <span class="kpi__value">${fmtINR(r.india)}</span>
          </div>
          <div class="kpi__foot">
            <span>${r.cheaper === "Parity" ? "Parity" : r.cheaper + " cheaper"}</span>
            <span class="kpi__diff">${r.diff < 0.005 ? "—" : fmtINRShort(r.diff)}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderBars(c) {
    if (!c) {
      els.barVN.style.width = "0%";
      els.barIN.style.width = "0%";
      els.barVnVal.textContent = "—";
      els.barInVal.textContent = "—";
      return;
    }
    const max = Math.max(c.vnPerGram, c.inPerGram, 1);
    const wVN = Math.max((c.vnPerGram / max) * 100, 4);
    const wIN = Math.max((c.inPerGram / max) * 100, 4);
    els.barVN.style.width = `${wVN}%`;
    els.barIN.style.width = `${wIN}%`;
    els.barVnVal.textContent = `${fmtINR(c.vnPerGram)} / g`;
    els.barInVal.textContent = `${fmtINR(c.inPerGram)} / g`;
  }

  function tagFor(cheaper) {
    if (cheaper === "Vietnam") return `<span class="tag tag--vn">Vietnam</span>`;
    if (cheaper === "India") return `<span class="tag tag--in">India</span>`;
    return `<span class="tag tag--flat">Parity</span>`;
  }

  function renderLedger(c) {
    if (!c) {
      els.ledgerBody.innerHTML = UNITS.map(
        (u) => `<tr>
          <td>${u.label}</td>
          <td>${u.weight} g</td>
          <td>—</td><td>—</td><td>—</td><td><span class="tag tag--flat">—</span></td>
        </tr>`
      ).join("");
      return;
    }

    els.ledgerBody.innerHTML = c.rows
      .map(
        (r) => `<tr>
          <td>${r.label}</td>
          <td>${r.weight} g</td>
          <td>${fmtINR(r.vn)}</td>
          <td>${fmtINR(r.india)}</td>
          <td>${r.diff < 0.005 ? "—" : fmtINR(r.diff)}</td>
          <td>${tagFor(r.cheaper)}</td>
        </tr>`
      )
      .join("");
  }

  function renderInsights(c) {
    if (!c) {
      els.insights.innerHTML = "";
      return;
    }

    const vnPerChiInr = c.vnPerGram * CHI_GRAMS;
    const indiaWithGst = c.inPerGram * (1 + GST_INDIA);
    const gstDiff = Math.abs(c.vnPerGram - indiaWithGst);
    const gstWinner = gstDiff < 0.005 ? "neither market" : c.vnPerGram < indiaWithGst ? "Vietnam" : "India";
    const saving10 = Math.abs(c.vnPerGram - c.inPerGram) * 10;
    const rateLine =
      c.dir === "vndToInr"
        ? `1 VND = ${fmtFx(c.fx)} INR (about ${fmtFx(1 / c.fx)} VND per rupee)`
        : `1 INR = ${fmtFx(c.fx)} VND (about ${fmtFx(1 / c.fx)} INR per dong)`;

    const items = [
      `Vietnam's per-chi quote converts to <strong>${fmtINR(vnPerChiInr)}</strong> per chi and <strong>${fmtINR(c.vnPerGram)}</strong> per gram.`,
      `India's per-gram quote is <strong>${fmtINR(c.inPerGram)}</strong> — equivalent to <strong>${fmtINR(c.inPerGram * PAVAN_GRAMS)}</strong> per pavan.`,
      `Exchange rate applied: ${rateLine}.`,
      c.cheaper === "Parity"
        ? "On these inputs both markets are effectively level."
        : `A 10-gram purchase costs <strong>${fmtINRShort(saving10)}</strong> less in ${c.cheaper}.`,
      `If India's 3% GST is added on top (${fmtINR(indiaWithGst)}/g), the cheaper market becomes <strong>${gstWinner}</strong>.`,
    ];

    els.insights.innerHTML = items.map((t) => `<li><span>${t}</span></li>`).join("");
    els.fxRatePill.textContent = c.dir === "vndToInr"
      ? `fx · 1 VND = ${fmtFx(c.fx)} INR`
      : `fx · 1 INR = ${fmtFx(c.fx)} VND`;
  }

  function renderAll() {
    const state = readState();
    const errors = validate(state);
    paintErrors(errors);

    const firstError = Object.values(errors)[0];
    const c = firstError ? null : compute(state);

    renderVerdict(c);
    renderKpis(c);
    renderBars(c);
    renderLedger(c);
    renderInsights(c);

    // Keep the report in sync so Ctrl/Cmd+P always prints current numbers.
    renderReport(c);
    return c;
  }

  /* ------------------------------- Theme -------------------------------- */
  function applyTheme(theme) {
    els.html.dataset.theme = theme;
    localStorage.setItem(STORE.theme, theme);
    const next = theme === "dark" ? "light" : "dark";
    els.themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
  }

  /* ---------------------------- FX direction ---------------------------- */
  function paintFxDirection() {
    const dir = localStorage.getItem(STORE.dir) === "inrToVnd" ? "inrToVnd" : "vndToInr";
    if (dir === "vndToInr") {
      els.fxUnit.textContent = "1 VND = ? INR";
      els.fxHint.textContent = "Approx. 306 VND per Indian rupee";
    } else {
      els.fxUnit.textContent = "1 INR = ? VND";
      els.fxHint.textContent = "Approx. 306 VND per Indian rupee";
    }
  }

  /* ------------------------------ History ------------------------------- */
  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE.history) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORE.history, JSON.stringify(items.slice(0, MAX_HISTORY)));
  }

  function renderHistory() {
    const items = loadHistory();
    els.historyEmpty.style.display = items.length ? "none" : "block";
    els.historyList.innerHTML = items
      .map((it) => {
        const when = new Date(it.ts).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<li class="history__item">
          <span class="history__time">${when}</span>
          <span class="history__quote">₫${nfVnd.format(it.vnChi)}/chi · ₹${nfInr.format(it.inGram)}/g · fx ${fmtFx(it.fx)}</span>
          <span class="history__verdict">${it.cheaper} · ${fmtPct(it.percent)}</span>
        </li>`;
      })
      .join("");
  }

  function addSnapshot() {
    const c = renderAll();
    if (!c) {
      flash(els.btnSave, "Check inputs");
      return;
    }
    const items = loadHistory();
    items.unshift({
      ts: Date.now(),
      vnChi: c.vnChi,
      inGram: c.inGram,
      fx: c.fx,
      dir: c.dir,
      cheaper: c.cheaper,
      percent: c.percent,
    });
    saveHistory(items);
    renderHistory();
    flash(els.btnSave, "Saved ✓");
  }

  function flash(btn, label) {
    // Remember the full markup once so icons survive a temporary label swap.
    if (!btn._originalHtml) btn._originalHtml = btn.innerHTML;
    btn.textContent = label;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.innerHTML = btn._originalHtml;
    }, 1400);
  }

  /* -------------------------------- CSV --------------------------------- */
  function downloadCsv() {
    const c = renderAll();
    if (!c) {
      flash(els.btnCsv, "Check inputs");
      return;
    }

    const money = (n) => n.toFixed(2);
    const lines = [
      "Aurum - Gold Price Comparator (Vietnam vs India)",
      `Generated,${new Date().toISOString()}`,
      `Vietnam quote (VND per chi),${c.vnChi}`,
      `India quote (INR per gram),${c.inGram}`,
      `Exchange rate,${c.fx},${c.dir === "vndToInr" ? "VND->INR" : "INR->VND"}`,
      "",
      "Unit,Weight (g),Vietnam (INR),India (INR),Difference (INR),Cheaper",
      ...c.rows.map(
        (r) => `${r.label},${r.weight},${money(r.vn)},${money(r.india)},${money(r.diff)},${r.cheaper}`
      ),
      "",
      `Verdict,${c.cheaper} cheaper by ${money(c.diffGram)} INR per gram (${c.percent.toFixed(2)}%)`,
    ];

    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aurum-gold-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------------------------- PDF report ------------------------------ */
  function renderReport(c) {
    const when = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!c) {
      els.report.innerHTML = `
        <header class="report__head">
          <div>
            <p class="report__brand">AURUM</p>
            <p class="report__kicker">Bullion Desk · Gold Price Comparator</p>
          </div>
          <div class="report__meta">Generated ${when}</div>
        </header>
        <h1>Gold Price Comparison Report</h1>
        <p class="report__sub">Vietnam (VND per chi) vs India (INR per gram), normalised to ₹ INR.</p>
        <div class="report__verdict">
          <div>
            <p class="report__verdict-title">Awaiting valid quotes</p>
            <p class="report__verdict-text">Enter both gold rates and an exchange rate, then export again.</p>
          </div>
        </div>`;
      return;
    }

    const rateLine =
      c.dir === "vndToInr"
        ? `1 VND = ${fmtFx(c.fx)} INR`
        : `1 INR = ${fmtFx(c.fx)} VND`;

    els.report.innerHTML = `
      <header class="report__head">
        <div>
          <p class="report__brand">AURUM</p>
          <p class="report__kicker">Bullion Desk · Gold Price Comparator</p>
        </div>
        <div class="report__meta">
          Generated ${when}<br />
          Report No. ${`AUR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
            Math.floor(Date.now() / 60000) % 10000
          ).padStart(4, "0")}`}
        </div>
      </header>

      <h1>Gold Price Comparison Report</h1>
      <p class="report__sub">
        Vietnam (VND per chi) vs India (INR per gram) — all values normalised to ₹ INR.
      </p>

      <div class="report__verdict">
        <div>
          <p class="report__verdict-title">${
            c.cheaper === "Parity" ? "Dead even" : `${c.cheaper} is cheaper per gram`
          }</p>
          <p class="report__verdict-text">
            Difference of ${fmtINR(c.diffGram)} per gram ·
            ${fmtINR(c.diffGram * PAVAN_GRAMS)} per pavan ·
            ${fmtINR(c.diffGram * 10)} per 10 grams
          </p>
        </div>
        <p class="report__verdict-delta">${fmtPct(c.percent)}</p>
      </div>

      <h2>Market inputs</h2>
      <table>
        <thead>
          <tr><th>Parameter</th><th>Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Vietnam gold rate</td><td>${fmtVND(c.vnChi)} per chi</td></tr>
          <tr><td>Vietnam rate per gram</td><td>${fmtVND(c.vnPerGramVnd)} per gram</td></tr>
          <tr><td>India gold rate</td><td>${fmtINR(c.inGram)} per gram</td></tr>
          <tr><td>Exchange rate</td><td>${rateLine}</td></tr>
        </tbody>
      </table>

      <h2>Converted ledger (₹ INR)</h2>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Weight</th>
            <th>Vietnam</th>
            <th>India</th>
            <th>Difference</th>
            <th>Cheaper</th>
          </tr>
        </thead>
        <tbody>
          ${c.rows
            .map(
              (r) => `<tr>
                <td>${r.label}</td>
                <td>${r.weight} g</td>
                <td>${fmtINR(r.vn)}</td>
                <td>${fmtINR(r.india)}</td>
                <td>${r.diff < 0.005 ? "—" : fmtINR(r.diff)}</td>
                <td>${r.cheaper}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>

      <h2>Assessment</h2>
      <table>
        <thead>
          <tr><th>Metric</th><th>Result</th></tr>
        </thead>
        <tbody>
          <tr><td>Cheaper market per gram</td><td>${
            c.cheaper === "Parity" ? "Parity" : c.cheaper
          }</td></tr>
          <tr><td>Advantage per gram</td><td>${fmtINR(c.diffGram)}</td></tr>
          <tr><td>Advantage per pavan (8 g)</td><td>${fmtINR(c.diffGram * PAVAN_GRAMS)}</td></tr>
          <tr><td>Advantage on 10 g</td><td>${fmtINR(c.diffGram * 10)}</td></tr>
          <tr><td>Relative gap</td><td>${fmtPct(c.percent)}</td></tr>
          <tr><td>India price incl. 3% GST</td><td>${fmtINR(c.inPerGram * 1.03)} per gram</td></tr>
        </tbody>
      </table>

      <div class="report__notes">
        <strong>Standard conversions</strong> — 1 chi (mace) = 3.75 g · 1 pavan = 8 g ·
        1 tola = 11.664 g.<br />
        <strong>Method</strong> — The Vietnamese per-chi quote is divided by 3.75 to obtain a
        per-gram price, then multiplied by the stated exchange rate to reach ₹ INR. The Indian
        quote is taken as entered. Differences are computed on the normalised per-gram price and
        scaled for each unit.<br />
        <strong>Scope</strong> — Figures exclude making charges, dealer premiums, import duty,
        VAT/GST and logistics. Rates are user-supplied; verify against a live quote before
        transacting.
      </div>

      <div class="report__sign">
        <span>Prepared by</span>
        <span>Reviewed by</span>
      </div>`;
  }

  function exportPdf() {
    const c = renderAll();
    if (!c) {
      flash(els.btnPdf, "Check inputs");
      return;
    }
    renderReport(c);
    // Give the browser a frame to lay the report out before opening the dialog.
    requestAnimationFrame(() => setTimeout(() => window.print(), 80));
  }

  /* ------------------------------ Actions ------------------------------- */
  function fillSample() {
    els.vnChi.value = SAMPLE.vnChi;
    els.inGram.value = SAMPLE.inGram;
    els.fx.value = SAMPLE.fx;
    localStorage.setItem(STORE.dir, SAMPLE.dir);
    paintFxDirection();
    renderAll();
  }

  function resetAll() {
    els.vnChi.value = "";
    els.inGram.value = "";
    els.fx.value = "";
    renderAll();
    els.vnChi.focus();
  }

  function invertFx() {
    const value = parseFloat(els.fx.value);
    const dir = localStorage.getItem(STORE.dir) === "inrToVnd" ? "inrToVnd" : "vndToInr";
    if (!isPos(value)) {
      localStorage.setItem(STORE.dir, dir === "vndToInr" ? "inrToVnd" : "vndToInr");
      paintFxDirection();
      renderAll();
      return;
    }
    // Keep enough significant digits that the round trip does not shift the result.
    els.fx.value = Number((1 / value).toPrecision(8));
    localStorage.setItem(STORE.dir, dir === "vndToInr" ? "inrToVnd" : "vndToInr");
    paintFxDirection();
    renderAll();
  }

  /* ---------------------------- Bootstrap ------------------------------- */
  function init() {
    const savedTheme = localStorage.getItem(STORE.theme);
    applyTheme(savedTheme === "light" ? "light" : "dark");
    paintFxDirection();
    renderHistory();
    renderAll();

    els.themeToggle.addEventListener("click", () => {
      applyTheme(els.html.dataset.theme === "dark" ? "light" : "dark");
    });

    [els.vnChi, els.inGram, els.fx].forEach((input) => {
      input.addEventListener("input", renderAll);
      input.addEventListener("blur", renderAll);
    });

    els.invertFx.addEventListener("click", invertFx);
    els.btnSample.addEventListener("click", () => {
      fillSample();
      flash(els.btnSample, "Sample loaded ✓");
    });
    els.btnReset.addEventListener("click", resetAll);
    els.btnCsv.addEventListener("click", downloadCsv);
    els.btnPdf.addEventListener("click", exportPdf);
    els.btnSave.addEventListener("click", addSnapshot);
    els.btnClearHistory.addEventListener("click", () => {
      localStorage.removeItem(STORE.history);
      renderHistory();
      flash(els.btnClearHistory, "Cleared ✓");
    });

    window.addEventListener("beforeprint", () => {
      const c = readState();
      renderReport(Object.keys(validate(c)).length ? null : compute(c));
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
