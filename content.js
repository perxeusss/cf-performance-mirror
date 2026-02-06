(async function () {
  if (document.getElementById("cfpm-compact")) return;

  const CATEGORIES = ["Div1", "Div2", "Div3", "Div4", "Other"];
  const DEFAULT_CATEGORY = "Div4";
  const DEFAULT_MODE = "total";
  const DEFAULT_TIMELINE = "all";
  const contestMap = {};

  let rawSubmissions = [];
  let ratedContestSet = new Set();
  let userRatingHistory = [];

  const DEFAULT_INDICES = ["A", "B", "C", "D", "E", "F", "G", "H"];

  function detectDarkMode() {
    const hasDarkClass = document.documentElement.classList.contains('dark') || 
                        document.documentElement.classList.contains('dark-mode') ||
                        document.body.classList.contains('dark') ||
                        document.body.classList.contains('dark-mode');
    
    if (hasDarkClass) return true;

    const containers = [
      document.querySelector('.datatable'),
      document.querySelector('.roundbox'),
      document.querySelector('#pageContent'),
      document.querySelector('.second-level-menu-list'),
      document.body
    ];

    for (let container of containers) {
      if (container) {
        const bg = window.getComputedStyle(container).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const rgb = bg.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            if (brightness < 128) return true;
          }
        }
      }
    }
    
    return false;
  }

  const isDark = detectDarkMode();
  
  const theme = {
    bg: 'transparent',
    text: isDark ? '#e8e8e8' : '#0b1220',
    border: isDark ? '#555' : '#ddd',
    borderLight: isDark ? '#444' : '#eee',
    borderLighter: isDark ? '#333' : '#f0f0f0',
    muted: isDark ? '#aaa' : '#666',
    headingText: isDark ? '#ddd' : '#222',
    buttonBg: isDark ? '#3a3a3a' : '#f5f5f5',
    buttonText: isDark ? '#ddd' : '#333',
    buttonBorder: isDark ? '#555' : '#ccc',
    activeButtonBg: '#1652d6',
    activeButtonText: '#fff',
    tableHeaderText: isDark ? '#ccc' : '#666',
    tableCellText: isDark ? '#ddd' : '#444',
    emptyText: isDark ? '#777' : '#999',
    selectBg: isDark ? '#2a2a2a' : '#fff',
    selectText: isDark ? '#ddd' : '#333',
    selectBorder: isDark ? '#555' : '#ccc',
    weakTopicName: isDark ? '#ccc' : '#444'
  };

  const card = document.createElement("div");
  card.id = "cfpm-compact";
  card.style.cssText = [
    "box-sizing:border-box",
    "font-family:Arial,sans-serif",
    "font-size:14px",
    `color:${theme.text}`,
    `background:${theme.bg}`,
    `border:1px solid ${theme.border}`,
    "border-radius:6px",
    "padding:12px",
    "margin-top:10px",
    "max-width:920px"
  ].join(";");

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;";

  const leftControls = document.createElement("div");
  leftControls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;";
  const categoryButtons = {};
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.textContent = cat;
    b.dataset.cat = cat;
    b.style.cssText = [
      "padding:4px 10px",
      "border-radius:12px",
      `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`,
      `color:${theme.buttonText}`,
      "cursor:pointer",
      "font-weight:600",
      "font-size:13px"
    ].join(";");
    b.addEventListener("click", () => renderCategory(cat));
    categoryButtons[cat] = b;
    leftControls.appendChild(b);
  });

  const rightControls = document.createElement("div");
  rightControls.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";

  const timelineSelect = document.createElement("select");
  const timelineOptions = [
    { value: "all", label: "All Time" },
    { value: "1", label: "Last Month" },
    { value: "3", label: "Last 3 Months" },
    { value: "6", label: "Last 6 Months" },
    { value: "12", label: "Last Year" },
    { value: "24", label: "Last 2 Years" }
  ];
  timelineOptions.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    timelineSelect.appendChild(o);
  });
  timelineSelect.value = DEFAULT_TIMELINE;
  timelineSelect.style.cssText = `padding:6px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;`;
  timelineSelect.addEventListener("change", () => renderCategory(currentCategory || DEFAULT_CATEGORY));

  const modeSelect = document.createElement("select");
  ["total", "rated", "unrated"].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt[0].toUpperCase() + opt.slice(1);
    modeSelect.appendChild(o);
  });
  modeSelect.value = DEFAULT_MODE;
  modeSelect.style.cssText = `padding:6px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;`;
  modeSelect.addEventListener("change", () => renderCategory(currentCategory || DEFAULT_CATEGORY));

  rightControls.appendChild(timelineSelect);
  rightControls.appendChild(modeSelect);

  controlsRow.appendChild(leftControls);
  controlsRow.appendChild(rightControls);
  card.appendChild(controlsRow);

  const info = document.createElement("div");
  info.style.cssText = `color:${theme.muted};font-size:13px;margin-bottom:8px;`;
  info.textContent = "Loading data…";
  card.appendChild(info);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;margin-bottom:12px;";
  const table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;font-size:13px;width:100%;";
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  const weakContest = document.createElement("div");
  weakContest.style.cssText = `margin-top:12px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;
  const weakGlobal = document.createElement("div");
  weakGlobal.style.cssText = `margin-top:12px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;

  card.appendChild(weakContest);
  card.appendChild(weakGlobal);

  function insertCard() {
    const boxes = Array.from(document.querySelectorAll(".box"));
    const visible = boxes.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 220 && r.height > 50;
    });
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      const w = Math.round(last.getBoundingClientRect().width);
      card.style.width = (w > 220 ? (w + "px") : "880px");
      last.insertAdjacentElement("afterend", card);
      return true;
    }
    const main = document.querySelector("#pageContent, #mainContent, .mainContent, .content");
    if (main) {
      const w = Math.round(main.getBoundingClientRect().width);
      card.style.width = (w > 220 ? (w + "px") : "880px");
      main.appendChild(card);
      return true;
    }
    document.body.appendChild(card);
    card.style.width = "880px";
    return true;
  }
  insertCard();

  function median(arr) {
    if (!arr || arr.length === 0) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function decideUserDivisionForContest(cid, contest, subs, isUnofficial) {
    if (!contest || typeof contest.startTimeSeconds !== "number") {
      return "Div2";
    }

    subs = Array.isArray(subs) ? subs : [];

    if (isUnofficial) {
      return "Div2";
    }

    const contestTime = contest.startTimeSeconds;
    let ratingBeforeContest = 0;

    const sortedHistory = [...userRatingHistory].sort((a, b) =>
      a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
    );

    for (let i = 0; i < sortedHistory.length; i++) {
      const ratingChange = sortedHistory[i];

      if (ratingChange.contestId === cid) {
        ratingBeforeContest = ratingChange.oldRating;
        break;
      }

      if (ratingChange.ratingUpdateTimeSeconds < contestTime) {
        ratingBeforeContest = ratingChange.newRating;
      }
    }

    return ratingBeforeContest >= 1900 ? "Div1" : "Div2";
  }

  function classifyContest(contest) {
    if (!contest || !contest.name) return "Other";
    const n = String(contest.name);

    if (/Div\.?\s*1\s*\+\s*Div\.?\s*2/i.test(n) ||
      /Div\.?\s*2\s*\+\s*Div\.?\s*1/i.test(n) ||
      /Global/i.test(n)) {
      return "Div1+Div2";
    }

    if (/Educational/i.test(n)) return "Div2";

    const m = n.match(/Div\.?\s*([1-4])|Division\s*([1-4])/i);
    if (m) return "Div" + (m[1] || m[2]);

    return "Other";
  }

  async function fetchContests() {
    try {
      const res = await fetch("https://codeforces.com/api/contest.list");
      const json = await res.json();
      if (json.status === "OK") {
        json.result.forEach(c => { contestMap[c.id] = c; });
      }
    } catch (e) {
      info.textContent = "Contest metadata partially unavailable — timings may be partial.";
    }
  }

  async function fetchRatedSet(handle) {
    try {
      const r = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
      const d = await r.json();
      if (d.status === "OK") {
        userRatingHistory = d.result || [];
        return new Set(d.result.map(x => x.contestId));
      }
    } catch (e) {

    }
    userRatingHistory = [];
    return new Set();
  }

  async function fetchAndStore(handle) {
    try {
      info.textContent = "Fetching submissions…";
      const r = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&count=10000`);
      const d = await r.json();
      if (d.status !== "OK") {
        info.textContent = "API error: " + (d.comment || "unknown");
        return false;
      }
      rawSubmissions = d.result || [];
      ratedContestSet = await fetchRatedSet(handle);
      return true;
    } catch (e) {
      info.textContent = "Fetch failed — see console for details.";
      return false;
    }
  }

  function recalcForMode(mode, timelineMonths) {

    const now = Math.floor(Date.now() / 1000);
    const cutoffTime = timelineMonths === "all" ? 0 : now - (parseInt(timelineMonths) * 30 * 24 * 60 * 60);

    const filteredSubmissions = timelineMonths === "all"
      ? rawSubmissions
      : rawSubmissions.filter(s => {
        if (!s.creationTimeSeconds) return false;
        return s.creationTimeSeconds >= cutoffTime;
      });

    const inWindowSet = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      const c = contestMap[cid];
      if (!c || typeof c.startTimeSeconds !== "number" || typeof c.durationSeconds !== "number") return;
      const st = s.creationTimeSeconds, start = c.startTimeSeconds, end = start + c.durationSeconds;
      if (typeof st === "number" && st >= start && st <= end) inWindowSet.add(cid);
    });

    let participated = new Set();
    if (mode === "total") {
      participated = new Set([...ratedContestSet, ...inWindowSet]);
    } else if (mode === "rated") {
      participated = new Set([...ratedContestSet]);
    } else {
      inWindowSet.forEach(cid => { if (!ratedContestSet.has(cid)) participated.add(cid); });
    }

    if (timelineMonths !== "all") {
      const timeFilteredParticipated = new Set();
      participated.forEach(cid => {
        const contest = contestMap[cid];
        if (contest && contest.startTimeSeconds >= cutoffTime) {
          timeFilteredParticipated.add(cid);
        }
      });
      participated = timeFilteredParticipated;
    }

    const categoryIndexTimes = {};
    const categoryIndexAttempts = {};
    const topicAttemptsLocal = {};
    const topicSolvedLocal = {};
    CATEGORIES.forEach(c => { categoryIndexTimes[c] = {}; categoryIndexAttempts[c] = {}; });

    const firstAC = new Set();

    const subsByContest = {};
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds;
      const st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      subsByContest[cid] = subsByContest[cid] || [];
      subsByContest[cid].push(s);
    });

    const unofficialContests = new Set();
    participated.forEach(cid => {
      if (!ratedContestSet.has(cid)) {
        unofficialContests.add(cid);
      }
    });

    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds;
      const st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;

      const idx = s.problem.index;
      const pid = cid + "-" + idx;
      const tags = s.problem.tags || [];

      tags.forEach(t => topicAttemptsLocal[t] = (topicAttemptsLocal[t] || 0) + 1);

      let cat = classifyContest(contest);

      if (cat === "Div1+Div2") {
        const isUnofficial = unofficialContests.has(cid);
        cat = decideUserDivisionForContest(cid, contest, subsByContest[cid], isUnofficial);
      }

      if (!categoryIndexAttempts[cat]) {
        console.warn("Unknown category encountered, falling back to Other:", cat, " (cid:", cid, ")");
        cat = "Other";
        categoryIndexAttempts[cat] = categoryIndexAttempts[cat] || {};
        categoryIndexTimes[cat] = categoryIndexTimes[cat] || {};
      }

      categoryIndexAttempts[cat][idx] = (categoryIndexAttempts[cat][idx] || 0) + 1;
      categoryIndexTimes[cat][idx] = categoryIndexTimes[cat][idx] || [];

      if (s.verdict !== "OK") return;

      tags.forEach(t => topicSolvedLocal[t] = (topicSolvedLocal[t] || 0) + 1);

      if (firstAC.has(pid)) return;
      firstAC.add(pid);

      const timeMin = (st - start) / 60;
      const maxAllowed = Math.max(1, Math.round(contest.durationSeconds / 60));
      if (timeMin >= 0 && timeMin <= maxAllowed) categoryIndexTimes[cat][idx].push(timeMin);
    });

    const contestFriction = [];
    Object.keys(topicAttemptsLocal).forEach(t => {
      const a = topicAttemptsLocal[t] || 0, s = topicSolvedLocal[t] || 0;
      const waRatio = a > 0 ? Math.round(((a - s) / a) * 100) : 0;
      if (a >= 3) contestFriction.push({ topic: t, waRatio, attempts: a });
    });
    contestFriction.sort((x, y) => y.waRatio - x.waRatio);

    const globalAttempts = {};
    const globalSolved = {};
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const tags = s.problem.tags || [];
      tags.forEach(t => globalAttempts[t] = (globalAttempts[t] || 0) + 1);
      if (s.verdict === "OK") tags.forEach(t => globalSolved[t] = (globalSolved[t] || 0) + 1);
    });
    const globalFriction = [];
    Object.keys(globalAttempts).forEach(t => {
      const a = globalAttempts[t] || 0, s = globalSolved[t] || 0;
      const waRatio = a > 0 ? Math.round(((a - s) / a) * 100) : 0;
      if (a >= 5) globalFriction.push({ topic: t, waRatio, attempts: a });
    });
    globalFriction.sort((x, y) => y.waRatio - x.waRatio);

    return {
      categoryIndexTimes,
      categoryIndexAttempts,
      contestFriction,
      globalFriction,
      participatedCount: participated.size
    };
  }

  function renderWeakTopics(container, heading, list) {
    container.innerHTML = "";
    const h = document.createElement("div");
    h.style.cssText = `font-weight:600;margin-bottom:8px;color:${theme.headingText};font-size:14px;`;
    h.textContent = heading;
    container.appendChild(h);
    if (!list || !list.length) {
      const empty = document.createElement("div");
      empty.style.cssText = `color:${theme.emptyText};font-style:italic;`;
      empty.textContent = "No data";
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;";

    list.slice(0, 12).forEach(t => {
      const r = document.createElement("div");
      r.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:2px 0;min-height:20px;";
      const name = document.createElement("div");
      name.style.cssText = `font-weight:500;color:${theme.weakTopicName};font-size:13px;`;
      name.textContent = t.topic;
      const stats = document.createElement("div");
      let color = "#e74c3c";
      if (t.waRatio < 40) color = "#27ae60";
      else if (t.waRatio < 70) color = "#e67e22";
      stats.style.cssText = `color:${color};font-weight:700;font-size:13px;min-width:64px;text-align:right;`;
      stats.textContent = `${t.waRatio}% · ${t.attempts}`;
      r.appendChild(name);
      r.appendChild(stats);
      grid.appendChild(r);
    });

    container.appendChild(grid);
  }

  function renderTableForCategory(modeData, cat) {
    const idxTimes = modeData.categoryIndexTimes[cat] || {};
    const idxAttempts = modeData.categoryIndexAttempts[cat] || {};
    const presentIdx = Array.from(new Set([...Object.keys(idxTimes), ...Object.keys(idxAttempts)]));
    const allIdxSet = new Set([...DEFAULT_INDICES, ...presentIdx]);
    const allIdx = Array.from(allIdxSet).sort((a, b) => a.localeCompare(b));

    table.innerHTML = "";
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.style.cssText = `text-align:left;padding:6px 8px;color:${theme.tableHeaderText};font-weight:600;border-bottom:2px solid ${theme.borderLight};`;
    corner.textContent = cat;
    headRow.appendChild(corner);
    allIdx.forEach(idx => {
      const th = document.createElement("th");
      th.style.cssText = `text-align:center;padding:6px 8px;font-weight:700;color:${theme.headingText};border-bottom:2px solid ${theme.borderLight};`;
      th.textContent = idx;
      headRow.appendChild(th);
    });
    table.appendChild(headRow);

    if (allIdx.length === 0) {
      const eRow = document.createElement("tr");
      const eTd = document.createElement("td");
      eTd.colSpan = 2;
      eTd.style.cssText = `padding:12px 8px;color:${theme.emptyText};font-style:italic;`;
      eTd.textContent = "No contest data for " + cat + ".";
      eRow.appendChild(eTd);
      table.appendChild(eRow);
      return;
    }

    const avgRow = document.createElement("tr");
    const avgLbl = document.createElement("td");
    avgLbl.style.cssText = `padding:6px 8px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;`;
    avgLbl.textContent = "Avg min";
    avgRow.appendChild(avgLbl);
    allIdx.forEach(idx => {
      const arr = idxTimes[idx] || [];
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:6px 8px;font-weight:700;color:#1652d6;";
      td.textContent = arr.length > 0 ? String(Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10) : "—";
      avgRow.appendChild(td);
    });
    table.appendChild(avgRow);

    const medRow = document.createElement("tr");
    const medLbl = document.createElement("td");
    medLbl.style.cssText = `padding:6px 8px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;border-top:1px solid ${theme.borderLighter};`;
    medLbl.textContent = "Med min";
    medRow.appendChild(medLbl);
    allIdx.forEach(idx => {
      const arr = idxTimes[idx] || [];
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 8px;font-weight:700;color:#6b4fa0;border-top:1px solid ${theme.borderLighter};`;
      const m = median(arr);
      td.textContent = m !== null ? String(Math.round(m * 10) / 10) : "—";
      medRow.appendChild(td);
    });
    table.appendChild(medRow);


    const solvedRow = document.createElement("tr");
    const solvedLbl = document.createElement("td");
    solvedLbl.style.cssText = `padding:6px 8px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;border-top:1px solid ${theme.borderLighter};`;
    solvedLbl.textContent = "Solved";
    solvedRow.appendChild(solvedLbl);
    allIdx.forEach(idx => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 8px;color:${theme.tableCellText};border-top:1px solid ${theme.borderLighter};`;
      td.textContent = String((idxTimes[idx] || []).length);
      solvedRow.appendChild(td);
    });
    table.appendChild(solvedRow);

    const attRow = document.createElement("tr");
    const attLbl = document.createElement("td");
    attLbl.style.cssText = `padding:6px 8px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;`;
    attLbl.textContent = "Attempts";
    attRow.appendChild(attLbl);
    allIdx.forEach(idx => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 8px;color:${theme.tableCellText};`;
      td.textContent = String(idxAttempts[idx] || 0);
      attRow.appendChild(td);
    });
    table.appendChild(attRow);
  }

  let currentCategory = DEFAULT_CATEGORY;

  function renderCategory(cat) {
    currentCategory = cat;

    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k];
      if (k === cat) {
        b.style.background = theme.activeButtonBg;
        b.style.color = theme.activeButtonText;
        b.style.border = `1px solid ${theme.activeButtonBg}`;
      } else {
        b.style.background = theme.buttonBg;
        b.style.color = theme.buttonText;
        b.style.border = `1px solid ${theme.buttonBorder}`;
      }
    });

    const mode = modeSelect.value;
    const timeline = timelineSelect.value;
    info.textContent = "Rendering (" + mode + ")…";

    const modeData = recalcForMode(mode, timeline);

    const timelineLabel = timelineSelect.options[timelineSelect.selectedIndex].text;
    info.textContent = `Participated in ${modeData.participatedCount} contests (${mode[0].toUpperCase() + mode.slice(1)} · ${timelineLabel})`;

    renderTableForCategory(modeData, cat);

    renderWeakTopics(weakContest, "High WA% (Contest)", modeData.contestFriction);
    renderWeakTopics(weakGlobal, "High WA% (Overall)", modeData.globalFriction);
  }

  const handle = (window.location.pathname.split("/")[2] || "").trim();
  if (!handle) {
    info.textContent = "Could not detect username in URL.";
    return;
  }

  await fetchContests();
  const ok = await fetchAndStore(handle);
  if (!ok) return;

  renderCategory(DEFAULT_CATEGORY);

})();