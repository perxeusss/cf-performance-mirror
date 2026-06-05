(async function () {
  if (document.getElementById("cfpm-compact")) return;

  const CATEGORIES = ["Div1", "Div2", "Div3", "Div4", "Other"];
  const SETTINGS_KEY = "cfpm_defaults";

  function loadSettings() {
    try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) return JSON.parse(raw); } catch(e) {}
    return {};
  }
  function saveSettings(obj) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj)); } catch(e) {}
  }

  const _saved = loadSettings();
  let DEFAULT_CATEGORY     = _saved.category    || "Div4";
  let DEFAULT_MODE         = _saved.mode        || "total";
  let DEFAULT_TIMELINE     = _saved.timeline    || "all";
  let DEFAULT_SORT_MODE    = _saved.sortMode    || "errors";
  let DEFAULT_HIDE_AC      = _saved.hideAC      !== undefined ? _saved.hideAC      : false;
  let DEFAULT_HIDE_TAGS    = _saved.hideTags    !== undefined ? _saved.hideTags    : false;
  let DEFAULT_HIDE_RATINGS = _saved.hideRatings !== undefined ? _saved.hideRatings : false;
  let DEFAULT_SOLVED_ONLY  = _saved.solvedOnly  !== undefined ? _saved.solvedOnly  : false;
  let DEFAULT_MIN_ATTEMPTS = _saved.minAttempts !== undefined ? Math.max(1, _saved.minAttempts) : 1;
  let DEFAULT_RATING_MIN   = _saved.ratingMin   !== undefined ? _saved.ratingMin   : "";
  let DEFAULT_RATING_MAX   = _saved.ratingMax   !== undefined ? _saved.ratingMax   : "";
  let DEFAULT_CUSTOM_START = _saved.customStart || "";
  let DEFAULT_CUSTOM_END   = _saved.customEnd   || "";
  let DEFAULT_TAG_FILTERS  = Array.isArray(_saved.tagFilters) ? _saved.tagFilters : [];
  let DEFAULT_TABLE_VISIBLE = _saved.tableVisible !== undefined ? _saved.tableVisible : true;
  let DEFAULT_CUSTOM_CONTEST_FROM = _saved.customContestFrom !== undefined ? _saved.customContestFrom : "";
  let DEFAULT_CUSTOM_CONTEST_TO   = _saved.customContestTo   !== undefined ? _saved.customContestTo   : "";

  const TOGGLE_KEY = "cfpm_enabled";
  function loadToggle() {
    try { const v = localStorage.getItem(TOGGLE_KEY); return v === null ? true : v === "true"; } catch(e) { return true; }
  }
  function saveToggle(val) {
    try { localStorage.setItem(TOGGLE_KEY, String(val)); } catch(e) {}
  }
  let isEnabled = loadToggle();

  let defaultSortMode = (DEFAULT_SORT_MODE === "errors" || DEFAULT_SORT_MODE === "rating") ? DEFAULT_SORT_MODE : "errors";

  let hideAC            = DEFAULT_HIDE_AC;
  let hideTagsGlobal    = DEFAULT_HIDE_TAGS;
  let hideRatingsGlobal = DEFAULT_HIDE_RATINGS;
  let solvedOnlyGlobal  = DEFAULT_SOLVED_ONLY;
  let ratingMinGlobal   = DEFAULT_RATING_MIN;
  let ratingMaxGlobal   = DEFAULT_RATING_MAX;
  let minAttemptsGlobal = DEFAULT_MIN_ATTEMPTS;
  let tableVisible      = DEFAULT_TABLE_VISIBLE;

  let frictionActiveTab = "category";
  let savedTimeline = DEFAULT_TIMELINE;
  let lastAppliedCustomStart = DEFAULT_CUSTOM_START;
  let lastAppliedCustomEnd   = DEFAULT_CUSTOM_END;
  let activeTagFilters = new Set(DEFAULT_TAG_FILTERS);
  let lastAppliedCustomContestFrom = DEFAULT_CUSTOM_CONTEST_FROM;
  let lastAppliedCustomContestTo   = DEFAULT_CUSTOM_CONTEST_TO;

  let _timelineDdStep = "root";

  let lastDeltaInfo = null;
  let lastModeData = null;
  let currentCategory = DEFAULT_CATEGORY;

  const validTimelineVals = new Set(["all","1","3","6","12","24","custom","c5","c10","c20","cc"]);
  if (!validTimelineVals.has(savedTimeline)) savedTimeline = "all";

  function getActiveColors(isDark) {
    return {
      bg:     isDark ? "#323645" : "#e2e6ef",
      text:   isDark ? "#e8e8e8" : "#1a1a2e",
      border: isDark ? "#6870a0" : "#7a84a8",
    };
  }

  function detectDarkMode() {
    const hasDarkClass =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.classList.contains('dark-mode') ||
      document.body.classList.contains('dark') ||
      document.body.classList.contains('dark-mode');
    if (hasDarkClass) return true;
    const containers = [
      document.querySelector('.info'),
      document.querySelector('.datatable'),
      document.querySelector('.roundbox'),
      document.querySelector('#pageContent'),
      document.querySelector('.second-level-menu-list'),
      document.body
    ];
    for (const container of containers) {
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

  function getBoxBackground() {
    for (const sel of ['.info', '.roundbox', '#pageContent']) {
      const el = document.querySelector(sel);
      if (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      }
    }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
    return detectDarkMode() ? '#1a1a1a' : '#ffffff';
  }

  function getBoxBorderColor() {
    for (const sel of ['.roundbox', '.info', '.datatable']) {
      const el = document.querySelector(sel);
      if (el) {
        const bc = window.getComputedStyle(el).borderColor;
        if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') return bc;
      }
    }
    return detectDarkMode() ? '#444' : '#d4d4d4';
  }

  function createTheme() {
    const isDark = detectDarkMode();
    const active = getActiveColors(isDark);
    return {
      bg: getBoxBackground(),
      text: isDark ? '#e8e8e8' : '#0b1220',
      border: getBoxBorderColor(),
      borderLight: isDark ? '#3a3a3a' : '#e8e8e8',
      borderLighter: isDark ? '#2e2e2e' : '#f2f2f2',
      muted: isDark ? '#999' : '#777',
      mutedStrong: isDark ? '#bbb' : '#555',
      headingText: isDark ? '#ddd' : '#222',
      btnBg: isDark ? '#2e2e2e' : '#f4f4f4',
      btnText: isDark ? '#ccc' : '#444',
      btnBorder: isDark ? '#484848' : '#d0d0d0',
      btnActiveBg:     active.bg,
      btnActiveText:   active.text,
      btnActiveBorder: active.border,
      tableHeaderText: isDark ? '#bbb' : '#666',
      tableCellText: isDark ? '#ccc' : '#555',
      emptyText: isDark ? '#666' : '#aaa',
      selectBg: isDark ? '#242424' : '#fff',
      selectText: isDark ? '#ddd' : '#333',
      selectBorder: isDark ? '#484848' : '#d0d0d0',
      inputBg: isDark ? '#242424' : '#fff',
      inputText: isDark ? '#ddd' : '#333',
      inputBorder: isDark ? '#484848' : '#d0d0d0',
      dropdownBg: isDark ? '#202020' : '#ffffff',
      dropdownBorder: isDark ? '#383838' : '#e0e0e0',
      dropdownSection: isDark ? '#1a1a1a' : '#f9f9f9',
      problemLink: isDark ? '#7aabff' : '#1652d6',
      solvedBadge: isDark ? '#1a3320' : '#e6f4ea',
      solvedBadgeText: isDark ? '#4caf50' : '#276221',
      waBadge: isDark ? '#331a1a' : '#fdecea',
      waBadgeText: isDark ? '#f48080' : '#b71c1c',
      tleBg: isDark ? '#2a2000' : '#fff8e1',
      tleFg: isDark ? '#ffd54f' : '#b45309',
      rteBg: isDark ? '#1a1a2e' : '#ede7f6',
      rteFg: isDark ? '#9fa8da' : '#4527a0',
      mleBg: isDark ? '#002828' : '#e0f2f1',
      mleFg: isDark ? '#4db6ac' : '#00695c',
      errBg: isDark ? '#2a2a2a' : '#f0f0f0',
      errFg: isDark ? '#999' : '#555',
      accentBlue: '#1652d6',
    };
  }

  let theme = createTheme();

  if (!document.getElementById("cfpm-toggle-style")) {
    const s = document.createElement("style");
    s.id = "cfpm-toggle-style";
    s.textContent = `
      #cfpm-compact { box-sizing: border-box; }
      #cfpm-body {
        overflow: hidden;
        transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease;
        max-height: 2000px; opacity: 1;
      }
      #cfpm-body.cfpm-collapsed { max-height: 0 !important; opacity: 0; pointer-events: none; }

      #cfpm-chevron-btn {
        display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 4px;
        border: none; background: transparent; cursor: pointer;
        flex-shrink: 0; outline: none !important;
        -webkit-appearance: none; appearance: none; padding: 0;
      }
      #cfpm-chevron-btn:hover { background: rgba(128,128,128,0.1) !important; }
      #cfpm-chevron-btn:focus, #cfpm-chevron-btn:active,
      #cfpm-chevron-btn:focus-visible { outline: none !important; box-shadow: none !important; }
      #cfpm-chevron-btn svg { transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); }
      #cfpm-chevron-btn.collapsed svg { transform: rotate(-90deg); }

      #cfpm-compact button {
        box-sizing: border-box; -webkit-appearance: none; appearance: none;
        transition: none !important;
      }
      #cfpm-compact button:hover, #cfpm-compact button:focus,
      #cfpm-compact button:active, #cfpm-compact button:focus-visible {
        outline: none !important; box-shadow: none !important;
        filter: none !important; -webkit-filter: none !important;
      }

      .cfpm-cat-btn {
        display: inline-flex; align-items: center; justify-content: center;
        height: 28px; padding: 0 14px; border-radius: 14px;
        font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
        flex-shrink: 0; outline: none !important;
      }
      .cfpm-icon-btn {
        width: 30px; height: 30px; border-radius: 5px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; outline: none !important; padding: 0;
      }
      .cfpm-pill-btn {
        display: inline-flex; align-items: center; justify-content: center;
        height: 30px; padding: 0 12px; border-radius: 5px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        white-space: nowrap; outline: none !important;
      }
      .cfpm-step-btn {
        width: 24px; height: 24px; border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; outline: none !important;
        -webkit-appearance: none; appearance: none;
      }
      .cfpm-tag-pill {
        display: inline-flex; align-items: center; gap: 4px;
        height: 22px; padding: 0 8px; border-radius: 11px; font-size: 11px;
        font-weight: 600; cursor: pointer; white-space: nowrap; user-select: none;
      }
      .cfpm-tag-opt {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 12px; font-size: 12px; cursor: pointer; user-select: none;
        word-break: break-word;
      }
      .cfpm-tag-opt:hover { filter: brightness(0.95); }
      .cfpm-tag-check {
        width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; color: #fff; box-sizing: border-box;
      }
      .cfpm-sort-opt {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 14px; font-size: 13px; cursor: pointer; user-select: none;
      }
      .cfpm-view-opt {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 14px; font-size: 13px; cursor: pointer; user-select: none;
      }

      #cfpm-filter-dd {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 10000;
        border-radius: 6px; flex-direction: column;
        min-width: 260px; max-width: 300px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08);
      }
      #cfpm-sort-dd {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 10000;
        border-radius: 7px; overflow: hidden; min-width: 190px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 1.5px 4px rgba(0,0,0,0.07);
      }
      #cfpm-view-dd {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 10000;
        border-radius: 7px; overflow: hidden; min-width: 210px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 1.5px 4px rgba(0,0,0,0.07);
      }

      #cfpm-timeline-dd {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 10000;
        border-radius: 7px; overflow: hidden; min-width: 220px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 1.5px 4px rgba(0,0,0,0.07);
      }
      .cfpm-timeline-opt {
        display: flex; align-items: center;
        padding: 8px 14px; font-size: 12px; cursor: pointer; user-select: none; gap: 8px;
      }
      .cfpm-timeline-opt:hover { filter: brightness(0.96); }

      #cfpm-tag-list { overflow-y: auto; max-height: 110px; }
      #cfpm-tag-list::-webkit-scrollbar { width: 4px; }
      #cfpm-tag-list::-webkit-scrollbar-track { background: transparent; }
      #cfpm-tag-list::-webkit-scrollbar-thumb { border-radius: 2px; background: rgba(128,128,128,0.45); min-height: 24px; }

      .cfpm-rating-input::-webkit-outer-spin-button,
      .cfpm-rating-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .cfpm-rating-input[type=number] { -moz-appearance: textfield; appearance: textfield; }

      .cfpm-tag-search {
        width: 100%; box-sizing: border-box;
        height: 30px; padding: 0 10px 0 30px;
        font-size: 12px; font-family: inherit;
        outline: none; border: none;
        background: transparent;
      }
      .cfpm-tag-search-wrap {
        position: relative; display: flex; align-items: center;
      }
      .cfpm-tag-search-wrap svg {
        position: absolute; left: 9px; pointer-events: none; flex-shrink: 0;
      }

      .cfpm-add-topic-btn {
        display: inline-flex; align-items: center; gap: 4px;
        height: 22px; padding: 0 8px; border-radius: 3px;
        font-size: 11px; font-weight: 600; cursor: pointer;
        white-space: nowrap; outline: none !important;
        -webkit-appearance: none; appearance: none;
        transition: none !important;
      }

      .cfpm-filter-tag-pills {
        display: flex; flex-wrap: wrap; gap: 4px; padding: 0 12px 8px 12px;
      }
      .cfpm-filter-tag-pill {
        display: inline-flex; align-items: center; gap: 3px;
        height: 20px; padding: 0 7px; border-radius: 10px;
        font-size: 11px; font-weight: 600; cursor: pointer;
        user-select: none; white-space: nowrap;
      }
      .cfpm-filter-tag-pill-x {
        font-size: 9px; opacity: 0.6; margin-left: 1px;
      }

      .cfpm-verdict-badge {
        cursor: pointer;
        border-radius: 3px;
        display: inline-block;
        position: relative;
        will-change: opacity;
        transition: opacity 0.1s ease !important;
      }
      .cfpm-verdict-badge:hover {
        opacity: 0.78 !important;
      }
      .cfpm-verdict-badge:active {
        opacity: 0.60 !important;
      }

      #cfpm-sub-popup {
        position: fixed; z-index: 999999; border-radius: 7px; overflow: hidden;
        box-shadow: 0 10px 36px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12);
        display: none; flex-direction: column; min-width: 220px; max-width: 320px;
      }
      #cfpm-sub-popup-list { overflow-y: auto; max-height: 220px; overscroll-behavior: contain; }
      #cfpm-sub-popup-list::-webkit-scrollbar { width: 4px; }
      #cfpm-sub-popup-list::-webkit-scrollbar-track { background: transparent; }
      #cfpm-sub-popup-list::-webkit-scrollbar-thumb { border-radius: 2px; background: rgba(128,128,128,0.45); min-height: 24px; }

      .cfpm-sub-link {
        display: flex; align-items: center; gap: 8px;
        padding: 7px 12px; text-decoration: none; font-size: 12px; font-weight: 600; cursor: pointer;
        transition: opacity 0.1s ease !important;
      }
      .cfpm-sub-link:hover { opacity: 0.72 !important; }

      .cfpm-list-scroll::-webkit-scrollbar { width: 4px; }
      .cfpm-list-scroll::-webkit-scrollbar-track { background: transparent; }
      .cfpm-list-scroll::-webkit-scrollbar-thumb { border-radius: 2px; background: rgba(128,128,128,0.45); min-height: 24px; }

      .cfpm-table-scroll::-webkit-scrollbar { height: 4px; }
      .cfpm-table-scroll::-webkit-scrollbar-track { background: transparent; }
      .cfpm-table-scroll::-webkit-scrollbar-thumb { border-radius: 2px; background: rgba(128,128,128,0.45); min-width: 24px; }
    `;
    document.head.appendChild(s);
  }

  let _subPopupEl = null;
  let _subPopupAnchor = null;

  function getOrCreateSubPopup() {
    if (_subPopupEl) return _subPopupEl;
    _subPopupEl = document.createElement("div");
    _subPopupEl.id = "cfpm-sub-popup";
    document.body.appendChild(_subPopupEl);

    document.addEventListener("click", e => {
      if (_subPopupEl && _subPopupEl.style.display !== "none" && !_subPopupEl.contains(e.target)) {
        _subPopupEl.style.display = "none"; _subPopupAnchor = null;
      }
    });

    window.addEventListener("scroll", e => {
      if (!_subPopupEl || _subPopupEl.style.display === "none") return;
      if (_subPopupEl.contains(e.target)) return;
      _subPopupEl.style.display = "none"; _subPopupAnchor = null;
    }, { passive: true, capture: true });

    return _subPopupEl;
  }

  function buildSubmissionUrl(sid, contestId, submissionContestMap) {
    const resolvedContestId = (submissionContestMap && submissionContestMap.has(sid))
      ? submissionContestMap.get(sid)
      : contestId;
    if (!resolvedContestId || resolvedContestId <= 0) return null;
    const path = resolvedContestId >= 100001 ? "gym" : "contest";
    return `https://codeforces.com/${path}/${resolvedContestId}/submission/${sid}`;
  }

  function showSubmissionPopup(anchorEl, label, ids, contestId, badgeBg, badgeFg, submissionTimingMap, submissionContestMap) {
    const anchorIsLive = _subPopupAnchor && document.contains(_subPopupAnchor);
    if (anchorIsLive && _subPopupAnchor === anchorEl && _subPopupEl && _subPopupEl.style.display !== "none") {
      _subPopupEl.style.display = "none"; _subPopupAnchor = null; return;
    }
    _subPopupAnchor = anchorEl;
    const popup = getOrCreateSubPopup();
    const isDark = detectDarkMode();
    popup.style.background = theme.dropdownBg;
    popup.style.border = `1px solid ${theme.dropdownBorder}`;
    popup.innerHTML = "";

    const header = document.createElement("div");
    header.style.cssText = [
      "padding:8px 12px 7px 12px", "font-size:11px", "font-weight:700",
      `color:${theme.mutedStrong}`, `border-bottom:1px solid ${theme.dropdownBorder}`,
      `background:${theme.dropdownSection}`, "display:flex", "align-items:center", "gap:8px", "flex-shrink:0"
    ].join(";");

    const labelPill = document.createElement("span");
    labelPill.textContent = label;
    labelPill.style.cssText = [
      `background:${badgeBg}`, `color:${badgeFg}`,
      "font-size:10px", "font-weight:700", "border-radius:3px", "padding:1px 6px"
    ].join(";");
    header.appendChild(labelPill);

    const headerText = document.createElement("span");
    headerText.textContent = `${ids.length} submission${ids.length !== 1 ? "s" : ""}`;
    header.appendChild(headerText);

    const closeBtn = document.createElement("span");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `margin-left:auto;cursor:pointer;opacity:0.45;font-size:11px;padding:2px 4px;border-radius:3px;`;
    closeBtn.addEventListener("click", e => { e.stopPropagation(); popup.style.display = "none"; _subPopupAnchor = null; });
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "0.8"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.45"; });
    header.appendChild(closeBtn);
    popup.appendChild(header);

    const list = document.createElement("div");
    list.id = "cfpm-sub-popup-list";
    list.addEventListener("click", e => e.stopPropagation());

    const sortedIds = ids.slice().sort((a, b) => {
      const tA = submissionTimingMap && submissionTimingMap.get(a);
      const tB = submissionTimingMap && submissionTimingMap.get(b);
      const offA = (tA && typeof tA.submittedAt === "number" && typeof tA.contestStart === "number")
        ? (tA.submittedAt - tA.contestStart) : Infinity;
      const offB = (tB && typeof tB.submittedAt === "number" && typeof tB.contestStart === "number")
        ? (tB.submittedAt - tB.contestStart) : Infinity;
      return offA - offB;
    });

    sortedIds.forEach((sid, i) => {
      const displayNumber = i + 1;

      const item = document.createElement("a");
      item.className = "cfpm-sub-link";

      const url = buildSubmissionUrl(sid, contestId, submissionContestMap);
      if (url) {
        item.href = url;
        item.target = "_blank"; item.rel = "noopener";
      } else {
        item.style.cursor = "default";
      }

      item.style.cssText = [
        "display:flex", "align-items:center", "gap:8px", "padding:7px 12px", "text-decoration:none",
        `color:${url ? theme.problemLink : theme.muted}`, "font-size:12px", "font-weight:600",
        i > 0 ? `border-top:1px solid ${theme.borderLighter}` : "",
        `background:${i % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)")}`,
      ].join(";");

      if (url) {
        item.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.55"><path d="M2 10L10 2M4 2h6v6"/></svg>`;
      } else {
        item.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.25"><circle cx="6" cy="6" r="5"/></svg>`;
      }

      const textCol = document.createElement("div");
      textCol.style.cssText = "display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;";

      const numSpan = document.createElement("span");
      numSpan.textContent = `Submission #${sid}`;
      textCol.appendChild(numSpan);

      if (submissionTimingMap) {
        const meta = submissionTimingMap.get(sid);
        if (meta && typeof meta.submittedAt === "number" && typeof meta.contestStart === "number") {
          const offsetMin = (meta.submittedAt - meta.contestStart) / 60;
          if (offsetMin >= 0) {
            const timeSpan = document.createElement("span");
            timeSpan.textContent = `+${Math.round(offsetMin * 10) / 10}m into contest`;
            timeSpan.style.cssText = `font-size:10px;color:${theme.muted};font-weight:400;`;
            textCol.appendChild(timeSpan);
          } else {
            const outsideSpan = document.createElement("span");
            outsideSpan.textContent = "solved outside contest";
            outsideSpan.style.cssText = `font-size:10px;color:${theme.muted};font-weight:400;font-style:italic;opacity:0.7;`;
            textCol.appendChild(outsideSpan);
          }
        } else {
          const outsideSpan = document.createElement("span");
          outsideSpan.textContent = "solved outside contest";
          outsideSpan.style.cssText = `font-size:10px;color:${theme.muted};font-weight:400;font-style:italic;opacity:0.7;`;
          textCol.appendChild(outsideSpan);
        }
      }

      item.appendChild(textCol);

      const idxBadge = document.createElement("span");
      idxBadge.textContent = `#${displayNumber}`;
      idxBadge.style.cssText = `font-size:10px;color:${theme.muted};font-weight:400;flex-shrink:0;`;
      item.appendChild(idxBadge);
      list.appendChild(item);
    });
    popup.appendChild(list);

    popup.style.display = "flex"; popup.style.top = "-9999px"; popup.style.left = "-9999px";
    requestAnimationFrame(() => {
      if (!document.contains(anchorEl)) {
        popup.style.display = "none";
        _subPopupAnchor = null;
        return;
      }
      const rect = anchorEl.getBoundingClientRect();
      const viewW = window.innerWidth || document.documentElement.clientWidth;
      const viewH = window.innerHeight || document.documentElement.clientHeight;
      const pw = popup.offsetWidth || 300; const ph = popup.offsetHeight || 180;
      let top = rect.bottom + 6; let left = rect.left;
      if (left + pw > viewW - 8) left = Math.max(8, rect.right - pw);
      if (top + ph > viewH - 8) top = Math.max(8, rect.top - ph - 6);
      popup.style.top = top + "px"; popup.style.left = left + "px";
    });
  }

  const card = document.createElement("div");
  card.id = "cfpm-compact";
  card.style.cssText = [
    "box-sizing:border-box", "font-family:Arial,sans-serif", "font-size:14px",
    `color:${theme.text}`, `background:${theme.bg}`, `border:1px solid ${theme.border}`,
    "border-radius:5px", "padding:0", "margin-top:10px", "max-width:920px"
  ].join(";");

  const headerBar = document.createElement("div");
  headerBar.style.cssText = [
    "display:flex", "align-items:center", "justify-content:space-between",
    "padding:5px 12px", "gap:10px", "min-height:32px", "box-sizing:border-box"
  ].join(";");

  const headerTitle = document.createElement("span");
  headerTitle.style.cssText = `font-size:11px;font-weight:700;color:${theme.muted};letter-spacing:0.1em;cursor:default;user-select:none;font-family:monospace;opacity:0.8;`;
  headerTitle.textContent = "cfpm";

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "cfpm-chevron-btn";
  toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5l4 4 4-4"/></svg>`;

  function applyToggleVisuals() {
    if (isEnabled) { toggleBtn.classList.remove("collapsed"); toggleBtn.title = "Collapse"; }
    else { toggleBtn.classList.add("collapsed"); toggleBtn.title = "Expand"; }
    toggleBtn.style.color = theme.muted;
    headerTitle.style.opacity = isEnabled ? "0.8" : "0.4";
  }
  applyToggleVisuals();

  const body = document.createElement("div");
  body.id = "cfpm-body";
  body.style.cssText = "padding:0 14px 14px 14px;box-sizing:border-box;";
  if (!isEnabled) body.classList.add("cfpm-collapsed");

  toggleBtn.addEventListener("click", () => {
    isEnabled = !isEnabled; saveToggle(isEnabled); applyToggleVisuals();
    body.classList.toggle("cfpm-collapsed", !isEnabled);
  });

  headerBar.appendChild(headerTitle); headerBar.appendChild(toggleBtn);
  card.appendChild(headerBar);

  const headerDivider = document.createElement("div");
  headerDivider.id = "cfpm-header-divider";
  headerDivider.style.cssText = `height:1px;background:${theme.borderLight};margin:0;`;
  card.appendChild(headerDivider);
  card.appendChild(body);

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;min-height:36px;margin-top:12px;";

  const leftControls = document.createElement("div");
  leftControls.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;";

  const categoryButtons = {};
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.className = "cfpm-cat-btn"; b.textContent = cat;
    b.style.cssText = [`background:${theme.btnBg}`, `color:${theme.btnText}`, `border:1px solid ${theme.btnBorder}`, "cursor:pointer"].join(";");
    b.addEventListener("click", () => { renderCategory(cat); autoSave(); });
    categoryButtons[cat] = b; leftControls.appendChild(b);
  });

  const rightControls = document.createElement("div");
  rightControls.style.cssText = "display:flex;align-items:center;gap:7px;flex-shrink:0;";

  function selectStyle() {
    return `height:30px;padding:0 8px;border-radius:5px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;outline:none;cursor:pointer;`;
  }

  const tableToggleBtn = document.createElement("button");
  tableToggleBtn.className = "cfpm-icon-btn";
  tableToggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1.5"/><path d="M1 6h14"/><path d="M1 10h14"/><path d="M5.5 6v8"/></svg>`;

  function applyTableToggleBtnStyle() {
    tableToggleBtn.title = tableVisible ? "Hide stats table" : "Show stats table";
    tableToggleBtn.style.cssText = [
      `background:${tableVisible ? theme.btnActiveBg : theme.btnBg}`,
      `color:${tableVisible ? theme.btnActiveText : theme.muted}`,
      `border:1px solid ${tableVisible ? theme.btnActiveBorder : theme.btnBorder}`,
      "cursor:pointer"
    ].join(";");
  }
  applyTableToggleBtnStyle();

  tableToggleBtn.addEventListener("click", () => {
    tableVisible = !tableVisible; tableWrap.style.display = tableVisible ? "" : "none";
    applyTableToggleBtnStyle(); autoSave();
  });

  const timelineBtnWrap = document.createElement("div");
  timelineBtnWrap.style.cssText = "position:relative;display:flex;align-items:center;";

  const timelineBtn = document.createElement("button");
  timelineBtn.className = "cfpm-pill-btn";
  timelineBtn.style.cssText = `background:${theme.btnBg};color:${theme.btnText};border:1px solid ${theme.btnBorder};cursor:pointer;font-size:12px;height:30px;padding:0 10px;gap:5px;display:inline-flex;align-items:center;`;

  function timelineLabel(val) {
    if (val === "all") return "All time";
    if (val === "1") return "Last month";
    if (val === "3") return "Last 3 months";
    if (val === "6") return "Last 6 months";
    if (val === "12") return "Last year";
    if (val === "24") return "Last 2 years";
    if (val === "custom") {
      if (lastAppliedCustomStart && lastAppliedCustomEnd) return `${lastAppliedCustomStart} → ${lastAppliedCustomEnd}`;
      return "Custom range";
    }
    if (val === "c5") return "Last 5 contests";
    if (val === "c10") return "Last 10 contests";
    if (val === "c20") return "Last 20 contests";
    if (val === "cc") {
      const from = parseInt(lastAppliedCustomContestFrom);
      const to   = parseInt(lastAppliedCustomContestTo);
      if (!isNaN(from) && !isNaN(to)) {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        if (lo === 1) return `Last ${hi} contests`;
        return `Contests ${lo}–${hi} most recent`;
      }
      return "Custom contests";
    }
    return "All time";
  }

  function isContestWise(val) { return val === "c5" || val === "c10" || val === "c20" || val === "cc"; }

  function updateTimelineBtn() {
    const lbl = timelineLabel(savedTimeline);
    timelineBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="flex-shrink:0;opacity:0.7"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.5l2 1.5"/></svg><span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lbl}</span><svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="flex-shrink:0;opacity:0.5"><path d="M1.5 3l3 3 3-3"/></svg>`;
    const active = savedTimeline !== "all";
    timelineBtn.style.background = active ? theme.btnActiveBg : theme.btnBg;
    timelineBtn.style.color = active ? theme.btnActiveText : theme.btnText;
    timelineBtn.style.borderColor = active ? theme.btnActiveBorder : theme.btnBorder;
  }
  updateTimelineBtn();

  const timelineDd = document.createElement("div");
  timelineDd.id = "cfpm-timeline-dd";
  timelineDd.style.cssText = `background:${theme.dropdownBg};border:1px solid ${theme.dropdownBorder};display:none;`;

  let timelineDdOpen = false;

  function openTimelineDd() {
    if (isContestWise(savedTimeline)) _timelineDdStep = "contest";
    else _timelineDdStep = "time";
    timelineDd.style.display = "block";
    timelineDdOpen = true;
    buildTimelineDd();
  }
  function closeTimelineDd() { timelineDd.style.display = "none"; timelineDdOpen = false; }

  timelineBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (timelineDdOpen) { closeTimelineDd(); } else { openTimelineDd(); }
  });

  document.addEventListener("click", e => {
    if (timelineDdOpen && !timelineBtnWrap.contains(e.target)) closeTimelineDd();
  });

  function buildTimelineDd() {
    timelineDd.innerHTML = "";
    const isDark = detectDarkMode();

    const headerRow = document.createElement("div");
    headerRow.style.cssText = [
      `background:${theme.dropdownSection}`, `border-bottom:1px solid ${theme.dropdownBorder}`,
      "display:flex", "align-items:center", "padding:7px 12px", "gap:8px", "min-height:32px"
    ].join(";");

    if (_timelineDdStep !== "root") {
      const backBtn = document.createElement("button");
      backBtn.style.cssText = [
        "background:none", "border:none", "cursor:pointer", "padding:0", "display:flex",
        "align-items:center", "gap:4px", `color:${theme.muted}`, "font-size:11px",
        "font-weight:600", "outline:none", "flex-shrink:0"
      ].join(";");
      backBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 1L3 5l4 4"/></svg>`;
      backBtn.title = "Back";
      backBtn.addEventListener("click", e => {
        e.stopPropagation();
        _timelineDdStep = "root";
        buildTimelineDd();
      });
      headerRow.appendChild(backBtn);
    }

    const headerLabel = document.createElement("span");
    headerLabel.style.cssText = `font-size:11px;font-weight:700;color:${theme.mutedStrong};letter-spacing:0.04em;flex:1;`;
    if (_timelineDdStep === "root") headerLabel.textContent = "Filter by";
    else if (_timelineDdStep === "time") headerLabel.textContent = "Time-wise";
    else headerLabel.textContent = "Contest-wise";
    headerRow.appendChild(headerLabel);
    timelineDd.appendChild(headerRow);

    function activeRowStyle(isActive) {
      return isActive
        ? `background:${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};`
        : "background:transparent;";
    }

    if (_timelineDdStep === "root") {
      [
        { label: "Time-wise", step: "time",
          icon: `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.5l2 1.5"/></svg>` },
        { label: "Contest-wise", step: "contest",
          icon: `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="10" height="9" rx="1.5"/><path d="M2 6.5h10M5 1.5v3M9 1.5v3"/></svg>` },
      ].forEach(({ label, step, icon }) => {
        const showCheck = step === "time" ? !isContestWise(savedTimeline) : isContestWise(savedTimeline);

        const row = document.createElement("div");
        row.className = "cfpm-timeline-opt";
        row.style.cssText = `color:${theme.text};background:transparent;justify-content:space-between;`;
        const left = document.createElement("div");
        left.style.cssText = "display:flex;align-items:center;gap:8px;";
        left.innerHTML = `<span style="opacity:0.55;display:flex;align-items:center;">${icon}</span>`;
        const lbl = document.createElement("span");
        lbl.style.cssText = `font-size:12px;font-weight:600;color:${theme.text};`;
        lbl.textContent = label;
        left.appendChild(lbl);
        row.appendChild(left);

        const right = document.createElement("div");
        right.style.cssText = "display:flex;align-items:center;gap:6px;";
        if (showCheck) {
          const dot = document.createElement("span");
          dot.style.cssText = `font-size:10px;color:${theme.muted};`;
          dot.textContent = "✓";
          right.appendChild(dot);
        }
        const chevron = document.createElement("span");
        chevron.style.cssText = `opacity:0.35;display:flex;align-items:center;`;
        chevron.innerHTML = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 1.5l4 3-4 3"/></svg>`;
        right.appendChild(chevron);
        row.appendChild(right);

        row.addEventListener("click", e => {
          e.stopPropagation();
          _timelineDdStep = step;
          buildTimelineDd();
        });
        timelineDd.appendChild(row);
      });
      return;
    }

    if (_timelineDdStep === "time") {
      const timeOpts = [
        { label: "All time", value: "all" },
        { label: "Last month", value: "1" },
        { label: "Last 3 months", value: "3" },
        { label: "Last 6 months", value: "6" },
        { label: "Last year", value: "12" },
        { label: "Last 2 years", value: "24" },
        { label: "Custom range…", value: "custom" },
      ];
      timeOpts.forEach(({ label, value }) => {
        const isActive = savedTimeline === value;
        const row = document.createElement("div");
        row.className = "cfpm-timeline-opt";
        row.style.cssText = `color:${theme.text};${activeRowStyle(isActive)}justify-content:space-between;`;
        const lbl = document.createElement("span");
        lbl.style.cssText = `font-size:12px;font-weight:${isActive ? "600" : "400"};color:${theme.text};`;
        lbl.textContent = label;
        row.appendChild(lbl);
        if (isActive) {
          const chk = document.createElement("span");
          chk.textContent = "✓";
          chk.style.cssText = `font-size:11px;color:${theme.muted};`;
          row.appendChild(chk);
        }
        row.addEventListener("click", e => {
          e.stopPropagation();
          if (value === "custom") {
            closeTimelineDd();
            savedTimeline = "custom";
            customContestRow.style.display = "none";
            customDateRow.style.display = "flex";
            updateTimelineBtn();
          } else {
            savedTimeline = value;
            customDateRow.style.display = "none";
            customContestRow.style.display = "none";
            closeTimelineDd();
            updateTimelineBtn();
            autoSave();
            renderCategory(currentCategory || DEFAULT_CATEGORY);
          }
        });
        timelineDd.appendChild(row);
      });
      return;
    }

    if (_timelineDdStep === "contest") {
      const contestOpts = [
        { label: "Last 5 contests", value: "c5" },
        { label: "Last 10 contests", value: "c10" },
        { label: "Last 20 contests", value: "c20" },
        { label: "Custom range…", value: "cc" },
      ];
      contestOpts.forEach(({ label, value }) => {
        const isActive = savedTimeline === value;
        const row = document.createElement("div");
        row.className = "cfpm-timeline-opt";
        row.style.cssText = `color:${theme.text};${activeRowStyle(isActive)}justify-content:space-between;`;
        const lbl = document.createElement("span");
        lbl.style.cssText = `font-size:12px;font-weight:${isActive ? "600" : "400"};color:${theme.text};`;
        lbl.textContent = label;
        row.appendChild(lbl);
        if (isActive) {
          const chk = document.createElement("span");
          chk.textContent = "✓";
          chk.style.cssText = `font-size:11px;color:${theme.muted};`;
          row.appendChild(chk);
        }
        row.addEventListener("click", e => {
          e.stopPropagation();
          if (value === "cc") {
            closeTimelineDd();
            savedTimeline = "cc";
            customDateRow.style.display = "none";
            customContestRow.style.display = "flex";
            setTimeout(() => contestFromInput.focus(), 50);
            updateTimelineBtn();
          } else {
            savedTimeline = value;
            customDateRow.style.display = "none";
            customContestRow.style.display = "none";
            closeTimelineDd();
            updateTimelineBtn();
            autoSave();
            renderCategory(currentCategory || DEFAULT_CATEGORY);
          }
        });
        timelineDd.appendChild(row);
      });
      return;
    }
  }

  timelineBtnWrap.appendChild(timelineBtn);
  timelineBtnWrap.appendChild(timelineDd);

  const modeSelect = document.createElement("select");
  [
    { value: "total", label: "Total" }, { value: "rated", label: "Rated" }, { value: "unrated", label: "Unrated" }
  ].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value; o.textContent = opt.label; modeSelect.appendChild(o);
  });
  modeSelect.value = DEFAULT_MODE;
  modeSelect.style.cssText = selectStyle() + "min-width:90px;";
  modeSelect.addEventListener("change", () => { renderCategory(currentCategory || DEFAULT_CATEGORY); autoSave(); });

  rightControls.appendChild(tableToggleBtn); rightControls.appendChild(timelineBtnWrap); rightControls.appendChild(modeSelect);
  controlsRow.appendChild(leftControls); controlsRow.appendChild(rightControls);
  body.appendChild(controlsRow);

  const customDateRow = document.createElement("div");
  customDateRow.style.cssText = `display:none;align-items:center;gap:8px;margin-bottom:10px;padding:10px 12px;background:${theme.dropdownSection};border:1px solid ${theme.borderLight};border-radius:5px;flex-wrap:wrap;`;

  const dateFromLabel = document.createElement("span");
  dateFromLabel.textContent = "From";
  dateFromLabel.style.cssText = `color:${theme.muted};font-size:12px;font-weight:600;white-space:nowrap;`;

  const startDateInput = document.createElement("input");
  startDateInput.type = "date"; startDateInput.value = DEFAULT_CUSTOM_START;
  startDateInput.style.cssText = `height:30px;padding:0 8px;border-radius:5px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;flex:1 1 130px;min-width:130px;max-width:170px;color-scheme:${detectDarkMode()?"dark":"light"};outline:none;`;

  const dateToLabel = document.createElement("span");
  dateToLabel.textContent = "To";
  dateToLabel.style.cssText = `color:${theme.muted};font-size:12px;font-weight:600;white-space:nowrap;`;

  const endDateInput = document.createElement("input");
  endDateInput.type = "date"; endDateInput.value = DEFAULT_CUSTOM_END;
  endDateInput.style.cssText = `height:30px;padding:0 8px;border-radius:5px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;flex:1 1 130px;min-width:130px;max-width:170px;color-scheme:${detectDarkMode()?"dark":"light"};outline:none;`;

  const dateButtonGroup = document.createElement("div");
  dateButtonGroup.style.cssText = "display:flex;gap:6px;margin-left:auto;align-items:center;";

  const applyDateBtn = document.createElement("button");
  applyDateBtn.className = "cfpm-pill-btn"; applyDateBtn.textContent = "Apply";
  applyDateBtn.style.cssText = `background:${theme.btnActiveBg};color:${theme.btnActiveText};border:1px solid ${theme.btnActiveBorder};cursor:pointer;`;

  const cancelDateBtn = document.createElement("button");
  cancelDateBtn.className = "cfpm-pill-btn"; cancelDateBtn.textContent = "Cancel";
  cancelDateBtn.style.cssText = `background:${theme.btnBg};color:${theme.btnText};border:1px solid ${theme.btnBorder};cursor:pointer;`;

  const dateValidationMsg = document.createElement("span");
  dateValidationMsg.style.cssText = "color:#e74c3c;font-size:11px;font-weight:600;display:none;white-space:nowrap;";
  dateValidationMsg.textContent = "Select both dates.";

  dateButtonGroup.appendChild(dateValidationMsg); dateButtonGroup.appendChild(applyDateBtn); dateButtonGroup.appendChild(cancelDateBtn);
  customDateRow.appendChild(dateFromLabel); customDateRow.appendChild(startDateInput);
  customDateRow.appendChild(dateToLabel); customDateRow.appendChild(endDateInput);
  customDateRow.appendChild(dateButtonGroup);

  applyDateBtn.addEventListener("click", () => {
    if (startDateInput.value && endDateInput.value) {
      dateValidationMsg.style.display = "none"; customDateRow.style.display = "none";
      savedTimeline = "custom"; lastAppliedCustomStart = startDateInput.value; lastAppliedCustomEnd = endDateInput.value;
      updateTimelineBtn(); autoSave(); renderCategory(currentCategory || DEFAULT_CATEGORY);
    } else { dateValidationMsg.style.display = "inline"; }
  });

  cancelDateBtn.addEventListener("click", () => {
    customDateRow.style.display = "none"; dateValidationMsg.style.display = "none";
    startDateInput.value = lastAppliedCustomStart; endDateInput.value = lastAppliedCustomEnd;
  });

  const customContestRow = document.createElement("div");
  customContestRow.style.cssText = `display:none;flex-direction:column;gap:8px;margin-bottom:10px;padding:10px 12px;background:${theme.dropdownSection};border:1px solid ${theme.borderLight};border-radius:5px;`;

  const contestRangeHelp = document.createElement("div");
  contestRangeHelp.style.cssText = `font-size:11px;color:${theme.muted};line-height:1.5;`;
  contestRangeHelp.innerHTML = `Enter a range of your <b>most recent contests</b> by rank.<br>e.g. <b>1 – 10</b> = last 10 &nbsp;·&nbsp; <b>11 – 20</b> = 11th to 20th most recent`;

  const contestRangeInputRow = document.createElement("div");
  contestRangeInputRow.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";

  const contestFromLabel = document.createElement("span");
  contestFromLabel.textContent = "From rank";
  contestFromLabel.style.cssText = `color:${theme.muted};font-size:12px;font-weight:600;white-space:nowrap;`;

  const contestFromInput = document.createElement("input");
  contestFromInput.type = "number"; contestFromInput.placeholder = "e.g. 1";
  contestFromInput.min = "1"; contestFromInput.value = DEFAULT_CUSTOM_CONTEST_FROM;
  contestFromInput.style.cssText = `height:30px;padding:0 8px;border-radius:5px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;flex:1 1 70px;min-width:70px;max-width:100px;outline:none;-webkit-appearance:none;-moz-appearance:textfield;appearance:textfield;`;

  const contestToLabel = document.createElement("span");
  contestToLabel.textContent = "to rank";
  contestToLabel.style.cssText = `color:${theme.muted};font-size:12px;font-weight:600;white-space:nowrap;`;

  const contestToInput = document.createElement("input");
  contestToInput.type = "number"; contestToInput.placeholder = "e.g. 20";
  contestToInput.min = "1"; contestToInput.value = DEFAULT_CUSTOM_CONTEST_TO;
  contestToInput.style.cssText = `height:30px;padding:0 8px;border-radius:5px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;flex:1 1 70px;min-width:70px;max-width:100px;outline:none;-webkit-appearance:none;-moz-appearance:textfield;appearance:textfield;`;

  const contestBtnGroup = document.createElement("div");
  contestBtnGroup.style.cssText = "display:flex;gap:6px;margin-left:auto;align-items:center;";

  const applyContestBtn = document.createElement("button");
  applyContestBtn.className = "cfpm-pill-btn"; applyContestBtn.textContent = "Apply";
  applyContestBtn.style.cssText = `background:${theme.btnActiveBg};color:${theme.btnActiveText};border:1px solid ${theme.btnActiveBorder};cursor:pointer;`;

  const cancelContestBtn = document.createElement("button");
  cancelContestBtn.className = "cfpm-pill-btn"; cancelContestBtn.textContent = "Cancel";
  cancelContestBtn.style.cssText = `background:${theme.btnBg};color:${theme.btnText};border:1px solid ${theme.btnBorder};cursor:pointer;`;

  const contestValidationMsg = document.createElement("span");
  contestValidationMsg.style.cssText = "color:#e74c3c;font-size:11px;font-weight:600;display:none;white-space:nowrap;";
  contestValidationMsg.textContent = "Enter valid ranks (whole numbers ≥ 1).";

  contestBtnGroup.appendChild(contestValidationMsg); contestBtnGroup.appendChild(applyContestBtn); contestBtnGroup.appendChild(cancelContestBtn);
  contestRangeInputRow.appendChild(contestFromLabel); contestRangeInputRow.appendChild(contestFromInput);
  contestRangeInputRow.appendChild(contestToLabel); contestRangeInputRow.appendChild(contestToInput);
  contestRangeInputRow.appendChild(contestBtnGroup);

  customContestRow.appendChild(contestRangeHelp);
  customContestRow.appendChild(contestRangeInputRow);

  applyContestBtn.addEventListener("click", () => {
    const from = parseInt(contestFromInput.value);
    const to   = parseInt(contestToInput.value);
    if (!isNaN(from) && from >= 1 && !isNaN(to) && to >= 1) {
      contestValidationMsg.style.display = "none"; customContestRow.style.display = "none";
      savedTimeline = "cc";
      lastAppliedCustomContestFrom = String(Math.min(from, to));
      lastAppliedCustomContestTo   = String(Math.max(from, to));
      updateTimelineBtn(); autoSave(); renderCategory(currentCategory || DEFAULT_CATEGORY);
    } else { contestValidationMsg.style.display = "inline"; }
  });

  cancelContestBtn.addEventListener("click", () => {
    customContestRow.style.display = "none"; contestValidationMsg.style.display = "none";
    contestFromInput.value = lastAppliedCustomContestFrom;
    contestToInput.value   = lastAppliedCustomContestTo;
  });

  body.appendChild(customDateRow);
  body.appendChild(customContestRow);

  const info = document.createElement("div");
  info.style.cssText = `color:${theme.muted};font-size:12px;margin-top:2px;margin-bottom:10px;`;
  info.textContent = "Loading…";
  body.appendChild(info);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;margin-bottom:12px;";
  tableWrap.className = "cfpm-table-scroll";
  tableWrap.style.display = tableVisible ? "" : "none";
  const table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;font-size:13px;width:100%;";
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  const frictionSection = document.createElement("div");
  frictionSection.style.cssText = `margin-top:10px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;

  const frictionScrollBox = document.createElement("div");
  frictionScrollBox.style.cssText = [
    "height:260px", "overflow:visible", `border:1px solid ${theme.borderLight}`,
    "border-radius:5px", "display:flex", "flex-direction:column", "padding:0", "position:relative"
  ].join(";");

  frictionSection.appendChild(frictionScrollBox);
  body.appendChild(frictionSection);

  function autoSave() {
    saveSettings({
      category: currentCategory || DEFAULT_CATEGORY, timeline: savedTimeline, mode: modeSelect.value,
      sortMode: defaultSortMode, hideAC, hideTags: hideTagsGlobal, hideRatings: hideRatingsGlobal,
      solvedOnly: solvedOnlyGlobal, minAttempts: minAttemptsGlobal, ratingMin: ratingMinGlobal,
      ratingMax: ratingMaxGlobal,
      customStart: startDateInput ? startDateInput.value : "",
      customEnd: endDateInput ? endDateInput.value : "",
      tagFilters: Array.from(activeTagFilters), tableVisible,
      customContestFrom: lastAppliedCustomContestFrom,
      customContestTo:   lastAppliedCustomContestTo,
    });
  }

  function insertCard() {
    const visible = Array.from(document.querySelectorAll(".box")).filter(el => {
      const r = el.getBoundingClientRect(); return r.width > 220 && r.height > 50;
    });
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      card.style.width = Math.round(last.getBoundingClientRect().width) + "px";
      last.insertAdjacentElement("afterend", card);
      if (window.ResizeObserver) {
        new ResizeObserver(entries => {
          for (const e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }
        }).observe(last);
      }
      return;
    }
    const main = document.querySelector("#pageContent, #mainContent, .mainContent, .content");
    if (main) {
      card.style.width = Math.round(main.getBoundingClientRect().width) + "px";
      main.appendChild(card);
      if (window.ResizeObserver) {
        new ResizeObserver(entries => {
          for (const e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }
        }).observe(main);
      }
      return;
    }
    document.body.appendChild(card); card.style.width = "880px";
  }
  insertCard();

  let previousTheme = { isDark: detectDarkMode(), bg: theme.bg, border: theme.border };

  function applyTheme() {
    card.style.background = theme.bg; card.style.border = `1px solid ${theme.border}`; card.style.color = theme.text;
    headerDivider.style.background = theme.borderLight; info.style.color = theme.muted;
    frictionSection.style.borderTop = `1px solid ${theme.borderLight}`; frictionScrollBox.style.borderColor = theme.borderLight;
    modeSelect.style.cssText = selectStyle() + "min-width:90px;";
    customDateRow.style.background = theme.dropdownSection; customDateRow.style.borderColor = theme.borderLight;
    customContestRow.style.background = theme.dropdownSection; customContestRow.style.borderColor = theme.borderLight;
    dateFromLabel.style.color = theme.muted; dateToLabel.style.color = theme.muted;
    contestFromLabel.style.color = theme.muted; contestToLabel.style.color = theme.muted;
    contestRangeHelp.style.color = theme.muted;
    const cs = detectDarkMode() ? "dark" : "light";
    startDateInput.style.colorScheme = cs; endDateInput.style.colorScheme = cs;
    startDateInput.style.background = theme.inputBg; startDateInput.style.color = theme.inputText; startDateInput.style.borderColor = theme.inputBorder;
    endDateInput.style.background = theme.inputBg; endDateInput.style.color = theme.inputText; endDateInput.style.borderColor = theme.inputBorder;
    contestFromInput.style.background = theme.inputBg; contestFromInput.style.color = theme.inputText; contestFromInput.style.borderColor = theme.inputBorder;
    contestToInput.style.background = theme.inputBg; contestToInput.style.color = theme.inputText; contestToInput.style.borderColor = theme.inputBorder;
    applyDateBtn.style.background = theme.btnActiveBg; applyDateBtn.style.color = theme.btnActiveText; applyDateBtn.style.borderColor = theme.btnActiveBorder;
    cancelDateBtn.style.background = theme.btnBg; cancelDateBtn.style.color = theme.btnText; cancelDateBtn.style.borderColor = theme.btnBorder;
    applyContestBtn.style.background = theme.btnActiveBg; applyContestBtn.style.color = theme.btnActiveText; applyContestBtn.style.borderColor = theme.btnActiveBorder;
    cancelContestBtn.style.background = theme.btnBg; cancelContestBtn.style.color = theme.btnText; cancelContestBtn.style.borderColor = theme.btnBorder;
    headerTitle.style.color = theme.muted; toggleBtn.style.color = theme.muted;
    applyToggleVisuals(); applyTableToggleBtnStyle(); updateTimelineBtn();
    timelineDd.style.background = theme.dropdownBg; timelineDd.style.borderColor = theme.dropdownBorder;
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k]; const active = k === currentCategory;
      b.style.background = active ? theme.btnActiveBg : theme.btnBg;
      b.style.color = active ? theme.btnActiveText : theme.btnText;
      b.style.borderColor = active ? theme.btnActiveBorder : theme.btnBorder;
    });
  }

  function updateTheme() {
    const newIsDark = detectDarkMode(); const newTheme = createTheme();
    if (newIsDark !== previousTheme.isDark || newTheme.bg !== previousTheme.bg || newTheme.border !== previousTheme.border) {
      theme = newTheme; previousTheme = { isDark: newIsDark, bg: theme.bg, border: theme.border };
      applyTheme();
      if (currentCategory && lastModeData) {
        renderTableForCategory(lastModeData, currentCategory, lastDeltaInfo);
        renderFrictionPanels(lastModeData, currentCategory);
      }
    }
  }

  setTimeout(applyTheme, 100);

  const themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  ['.info', '.roundbox', '#pageContent'].map(sel => document.querySelector(sel)).filter(Boolean)
    .forEach(el => themeObserver.observe(el, { attributes: true, attributeFilter: ['style','class'] }));

  if (window._cfpmThemeInterval) clearInterval(window._cfpmThemeInterval);
  window._cfpmThemeInterval = setInterval(updateTheme, 500);
  window.addEventListener('focus', updateTheme);

  function median(arr) {
    if (!arr || !arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function totalErrors(p) { return (p.wa || 0) + (p.tle || 0) + (p.rte || 0) + (p.mle || 0) + (p.other || 0); }

  function getRatingColor(r) {
    if (!r || r < 1200) return "#808080";
    if (r < 1400) return "#008000";
    if (r < 1600) return "#03a89e";
    if (r < 1900) return "#0000ff";
    if (r < 2100) return "#aa00aa";
    if (r < 2400) return "#ff8c00";
    if (r < 3000) return "#ff0000";
    return "#cc0000";
  }

  function calcDeltaRating(cat, timelineValue) {
    const nowSec = Math.floor(Date.now() / 1000);
    let cutoffTime = 0, endTime = nowSec;

    if (typeof timelineValue === 'object' && timelineValue.type === 'custom') {
      if (timelineValue.start && timelineValue.end) {
        cutoffTime = new Date(timelineValue.start).getTime() / 1000;
        endTime = new Date(timelineValue.end).getTime() / 1000 + 86399;
      }
    } else if (typeof timelineValue === 'object' && timelineValue.type === 'contests') {
      const n = timelineValue.n;
      const catRated = [...userRatingHistory]
        .filter(rc => {
          const contest = contestMap[rc.contestId]; if (!contest) return false;
          let cc = classifyContest(contest);
          if (cc === "Div1+Div2") cc = rc.oldRating >= 1900 ? "Div1" : "Div2";
          return cc === cat;
        })
        .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
        .slice(0, n);
      let delta = 0;
      catRated.forEach(rc => { delta += (rc.newRating - rc.oldRating); });
      return { delta, count: catRated.length };
    } else if (typeof timelineValue === 'object' && timelineValue.type === 'contestRank') {
      const { lo, hi } = timelineValue;
      const catRated = [...userRatingHistory]
        .filter(rc => {
          const contest = contestMap[rc.contestId]; if (!contest) return false;
          let cc = classifyContest(contest);
          if (cc === "Div1+Div2") cc = rc.oldRating >= 1900 ? "Div1" : "Div2";
          return cc === cat;
        })
        .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds);
      const slice = catRated.slice(lo - 1, hi);
      let delta = 0;
      slice.forEach(rc => { delta += (rc.newRating - rc.oldRating); });
      return { delta, count: slice.length };
    } else if (typeof timelineValue === 'string' && timelineValue !== "all") {
      cutoffTime = nowSec - parseInt(timelineValue) * 30 * 24 * 3600;
    }

    let delta = 0, count = 0;
    const sorted = [...userRatingHistory].sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
    sorted.forEach(rc => {
      const t = rc.ratingUpdateTimeSeconds;
      if (t < cutoffTime || t > endTime) return;
      const contest = contestMap[rc.contestId]; if (!contest) return;
      let contestCat = classifyContest(contest);
      if (contestCat === "Div1+Div2") contestCat = rc.oldRating >= 1900 ? "Div1" : "Div2";
      if (contestCat !== cat) return;
      delta += (rc.newRating - rc.oldRating); count++;
    });
    return { delta, count };
  }

  function decideUserDivisionForContest(cid, contest, isUnofficial) {
    if (!contest || typeof contest.startTimeSeconds !== "number") return "Div2";
    if (isUnofficial) return "Div2";
    let ratingBefore = 0;
    const sorted = [...userRatingHistory].sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
    for (const rc of sorted) {
      if (rc.contestId === cid) { ratingBefore = rc.oldRating; break; }
      if (rc.ratingUpdateTimeSeconds < contest.startTimeSeconds) ratingBefore = rc.newRating;
    }
    return ratingBefore >= 1900 ? "Div1" : "Div2";
  }

  function classifyContest(contest) {
    if (!contest || !contest.name) return "Other";
    const n = String(contest.name);
    if (/Div\.?\s*1\s*\+\s*Div\.?\s*2/i.test(n) || /Div\.?\s*2\s*\+\s*Div\.?\s*1/i.test(n) || /Global/i.test(n)) return "Div1+Div2";
    if (/Educational/i.test(n)) return "Div2";
    const m = n.match(/Div\.?\s*([1-4])|Division\s*([1-4])/i);
    if (m) return "Div" + (m[1] || m[2]);
    return "Other";
  }

  const contestMap = {};
  let rawSubmissions = [];
  let ratedContestSet = new Set();
  let userRatingHistory = [];
  const DEFAULT_INDICES = ["A", "B", "C", "D", "E", "F", "G", "H"];

  const ALL_CF_TAGS = [
    "*special", "2-sat", "binary search", "bitmasks", "brute force",
    "chinese remainder theorem", "combinatorics", "constructive algorithms",
    "data structures", "dfs and similar", "divide and conquer", "dp", "dsu",
    "expression parsing", "fft", "flows", "games", "geometry",
    "graph matchings", "graphs", "greedy", "hashing", "implementation",
    "interactive", "math", "matrices", "meet-in-the-middle", "number theory",
    "probabilities", "schedules", "shortest paths", "sortings", "special",
    "string suffix structures", "strings", "ternary search", "trees",
    "two pointers"
  ];

  async function fetchContests() {
    try {
      const res = await fetch("https://codeforces.com/api/contest.list");
      const json = await res.json();
      if (json.status === "OK") json.result.forEach(c => { contestMap[c.id] = c; });
    } catch(e) { info.textContent = "Contest list unavailable — some data may be incomplete."; }
  }

  async function fetchRatedSet(handle) {
    try {
      const r = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
      const d = await r.json();
      if (d.status === "OK") { userRatingHistory = d.result || []; return new Set(d.result.map(x => x.contestId)); }
    } catch(e) {}
    userRatingHistory = []; return new Set();
  }

  async function fetchAndStore(handle) {
    try {
      info.textContent = "Fetching your submissions from Codeforces…";
      const r = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&count=10000`);
      const d = await r.json();
      if (d.status !== "OK") { info.textContent = "Codeforces returned an error: " + (d.comment || "unknown"); return false; }
      rawSubmissions = d.result || []; ratedContestSet = await fetchRatedSet(handle); return true;
    } catch(e) { info.textContent = "Could not connect to Codeforces. Please check your connection and try again."; return false; }
  }

  function recordVerdict(prob, verdict, sid) {
    const vtype = verdict === "WRONG_ANSWER" ? "wa"
      : verdict === "TIME_LIMIT_EXCEEDED" ? "tle"
      : verdict === "RUNTIME_ERROR" ? "rte"
      : verdict === "MEMORY_LIMIT_EXCEEDED" ? "mle"
      : "other";
    prob[vtype]++;
    prob[vtype + "Ids"].push(sid);
  }

  function resolveTimelineValue() {
    if (savedTimeline === "custom") {
      return { type: "custom", start: startDateInput.value, end: endDateInput.value };
    }
    if (savedTimeline === "cc") {
      const lo = parseInt(lastAppliedCustomContestFrom);
      const hi = parseInt(lastAppliedCustomContestTo);
      if (!isNaN(lo) && lo >= 1 && !isNaN(hi) && hi >= 1) {
        return { type: "contestRank", lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
      }
      return "all";
    }
    if (savedTimeline === "c5") return { type: "contests", n: 5 };
    if (savedTimeline === "c10") return { type: "contests", n: 10 };
    if (savedTimeline === "c20") return { type: "contests", n: 20 };
    return savedTimeline;
  }

  function recalcForMode(mode, timelineValue) {
    const now = Math.floor(Date.now() / 1000);
    let cutoffTime = 0, endTime = now;
    let contestWiseN = null;
    let contestRankLo = null, contestRankHi = null;

    if (typeof timelineValue === 'object' && timelineValue.type === 'custom') {
      if (timelineValue.start && timelineValue.end) {
        cutoffTime = new Date(timelineValue.start).getTime() / 1000;
        endTime = new Date(timelineValue.end).getTime() / 1000 + 86399;
      }
    } else if (typeof timelineValue === 'object' && timelineValue.type === 'contests') {
      contestWiseN = timelineValue.n;
    } else if (typeof timelineValue === 'object' && timelineValue.type === 'contestRank') {
      contestRankLo = timelineValue.lo;
      contestRankHi = timelineValue.hi;
    } else if (typeof timelineValue === 'string' && timelineValue !== "all") {
      cutoffTime = now - (parseInt(timelineValue) * 30 * 24 * 60 * 60);
    }

    let contestWiseIds = null;

    function buildParticipatedBase(modeName, timeCutoffLow, timeCutoffHigh) {
      const allInWindow = new Set();
      rawSubmissions.forEach(s => {
        if (!s.problem) return;
        const cid = s.problem.contestId; const c = contestMap[cid];
        if (!c || typeof c.startTimeSeconds !== "number" || typeof c.durationSeconds !== "number") return;
        const st = s.creationTimeSeconds;
        if (typeof st === "number" && st >= c.startTimeSeconds && st <= c.startTimeSeconds + c.durationSeconds) allInWindow.add(cid);
      });
      let allParticipated = new Set();
      if (modeName === "total") allParticipated = new Set([...ratedContestSet, ...allInWindow]);
      else if (modeName === "rated") allParticipated = new Set([...ratedContestSet]);
      else allInWindow.forEach(cid => { if (!ratedContestSet.has(cid)) allParticipated.add(cid); });
      return allParticipated;
    }

    if (contestWiseN !== null) {
      const allParticipated = buildParticipatedBase(mode, 0, now);
      const sorted = Array.from(allParticipated)
        .filter(cid => contestMap[cid] && typeof contestMap[cid].startTimeSeconds === "number")
        .sort((a, b) => contestMap[b].startTimeSeconds - contestMap[a].startTimeSeconds);
      contestWiseIds = new Set(sorted.slice(0, contestWiseN));
    } else if (contestRankLo !== null) {
      const allParticipated = buildParticipatedBase(mode, 0, now);
      const sorted = Array.from(allParticipated)
        .filter(cid => contestMap[cid] && typeof contestMap[cid].startTimeSeconds === "number")
        .sort((a, b) => contestMap[b].startTimeSeconds - contestMap[a].startTimeSeconds);
      contestWiseIds = new Set(sorted.slice(contestRankLo - 1, contestRankHi));
    }

    const filteredSubmissions = rawSubmissions.filter(s => {
      if (!s.creationTimeSeconds) return false;
      if (contestWiseIds !== null) {
        return s.problem && contestWiseIds.has(s.problem.contestId);
      }
      if (cutoffTime === 0 && endTime === now) return true;
      return s.creationTimeSeconds >= cutoffTime && s.creationTimeSeconds <= endTime;
    });

    const inWindowSet = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId; const c = contestMap[cid];
      if (!c || typeof c.startTimeSeconds !== "number" || typeof c.durationSeconds !== "number") return;
      const st = s.creationTimeSeconds; const start = c.startTimeSeconds; const end = start + c.durationSeconds;
      if (typeof st === "number" && st >= start && st <= end) inWindowSet.add(cid);
    });

    let participated = new Set();
    if (contestWiseIds !== null) {
      participated = contestWiseIds;
    } else {
      if (mode === "total") participated = new Set([...ratedContestSet, ...inWindowSet]);
      else if (mode === "rated") participated = new Set([...ratedContestSet]);
      else inWindowSet.forEach(cid => { if (!ratedContestSet.has(cid)) participated.add(cid); });

      if (cutoffTime !== 0 || endTime !== now) {
        const tmp = new Set();
        participated.forEach(cid => {
          const c = contestMap[cid];
          if (c && c.startTimeSeconds >= cutoffTime && c.startTimeSeconds <= endTime) tmp.add(cid);
        });
        participated = tmp;
      }
    }

    const categoryIndexTimes = {}; const categoryIndexAttempts = {}; const categoryIndexSolved = {}; const categoryContestCount = {};
    const categoryIndexWrongIds = {}; const categoryIndexAcIds = {};
    CATEGORIES.forEach(c => {
      categoryIndexTimes[c] = {}; categoryIndexAttempts[c] = {}; categoryIndexSolved[c] = {}; categoryContestCount[c] = new Set();
      categoryIndexWrongIds[c] = {}; categoryIndexAcIds[c] = {};
    });

    const unofficialForTable = new Set();
    participated.forEach(cid => { if (!ratedContestSet.has(cid)) unofficialForTable.add(cid); });

    const firstACSet = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId; if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds; const end = start + contest.durationSeconds; const st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      const idx = s.problem.index; const pid = cid + "-" + idx;
      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") cat = decideUserDivisionForContest(cid, contest, unofficialForTable.has(cid));
      if (!categoryIndexAttempts[cat]) cat = "Other";
      categoryContestCount[cat].add(cid);
      categoryIndexAttempts[cat][idx] = (categoryIndexAttempts[cat][idx] || 0) + 1;
      categoryIndexTimes[cat][idx] = categoryIndexTimes[cat][idx] || [];

      if (s.verdict !== "OK") {
        if (!categoryIndexWrongIds[cat][idx]) categoryIndexWrongIds[cat][idx] = [];
        categoryIndexWrongIds[cat][idx].push(s.id);
      }

      if (s.verdict !== "OK") return;
      if (firstACSet.has(pid)) return;
      firstACSet.add(pid);
      categoryIndexSolved[cat][idx] = (categoryIndexSolved[cat][idx] || 0) + 1;

      if (!categoryIndexAcIds[cat][idx]) categoryIndexAcIds[cat][idx] = [];
      categoryIndexAcIds[cat][idx].push(s.id);

      const timeMin = (st - start) / 60; const maxAllowed = Math.max(1, Math.round(contest.durationSeconds / 60));
      if (timeMin >= 0 && timeMin <= maxAllowed) categoryIndexTimes[cat][idx].push(timeMin);
    });

    const everAC = new Set();
    rawSubmissions.forEach(s => { if (s.verdict === "OK" && s.problem) everAC.add(s.problem.contestId + "-" + s.problem.index); });

    const inContestCids = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId; const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds; const end = start + contest.durationSeconds; const st = s.creationTimeSeconds;
      if (typeof st === "number" && st >= start && st <= end) inContestCids.add(cid);
    });

    const unofficialForList = new Set();
    inContestCids.forEach(cid => { if (!ratedContestSet.has(cid)) unofficialForList.add(cid); });

    const submissionTimingMap = new Map();
    const submissionContestMap = new Map();

    function makeProbEntry(s, contestName) {
      return {
        pid: s.problem.contestId + "-" + s.problem.index,
        name: s.problem.name || s.problem.index,
        contestId: s.problem.contestId,
        contestName,
        index: s.problem.index,
        rating: s.problem.rating || null,
        tags: (s.problem.tags || []).slice(),
        solved: everAC.has(s.problem.contestId + "-" + s.problem.index),
        wa: 0, tle: 0, rte: 0, mle: 0, other: 0,
        acIds: [], waIds: [], tleIds: [], rteIds: [], mleIds: [], otherIds: []
      };
    }

    const categoryRawWAMap = {};
    CATEGORIES.forEach(c => { categoryRawWAMap[c] = new Map(); });

    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId; if (!inContestCids.has(cid)) return;
      const contest = contestMap[cid]; if (!contest) return;
      const start = contest.startTimeSeconds; const end = start + contest.durationSeconds; const st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      const pid = cid + "-" + s.problem.index;
      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") cat = decideUserDivisionForContest(cid, contest, unofficialForList.has(cid));
      if (!categoryRawWAMap[cat]) cat = "Other";
      if (!categoryRawWAMap[cat].has(pid)) {
        categoryRawWAMap[cat].set(pid, makeProbEntry(s, contest.name || ("Contest " + cid)));
      }
      const prob = categoryRawWAMap[cat].get(pid);

      submissionTimingMap.set(s.id, { contestStart: start, submittedAt: st });
      submissionContestMap.set(s.id, cid);

      if (s.verdict === "OK") { prob.acIds.push(s.id); }
      else { recordVerdict(prob, s.verdict, s.id); }
    });

    const inContestAcIds = new Set();
    CATEGORIES.forEach(c => {
      categoryRawWAMap[c].forEach(prob => {
        prob.acIds.forEach(id => inContestAcIds.add(id));
      });
    });
    rawSubmissions.forEach(s => {
      if (!s.problem || s.verdict !== "OK") return;
      const cid = s.problem.contestId;
      const pid = cid + "-" + s.problem.index;
      if (inContestAcIds.has(s.id)) return;
      const contest = contestMap[cid];
      if (contest && typeof contest.startTimeSeconds === "number" && typeof contest.durationSeconds === "number") {
        const start = contest.startTimeSeconds;
        const end = start + contest.durationSeconds;
        const st = s.creationTimeSeconds;
        if (typeof st === "number" && st >= start && st <= end) {
          submissionTimingMap.set(s.id, { contestStart: start, submittedAt: st });
          submissionContestMap.set(s.id, cid);
        }
      }
      for (const c of CATEGORIES) {
        const entry = categoryRawWAMap[c].get(pid);
        if (entry) { entry.acIds.push(s.id); break; }
      }
    });

    const categoryRawProblems = {};
    CATEGORIES.forEach(c => {
      categoryRawProblems[c] = Array.from((categoryRawWAMap[c] || new Map()).values()).filter(p => totalErrors(p) > 0);
    });

    const practiceRawWAMap = new Map();

    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId; const contest = contestMap[cid]; if (!contest) return;
      let duringContest = false;
      if (typeof contest.startTimeSeconds === "number" && typeof contest.durationSeconds === "number") {
        const start = contest.startTimeSeconds; const end = start + contest.durationSeconds; const st = s.creationTimeSeconds;
        if (typeof st === "number" && st >= start && st <= end) duringContest = true;
      }
      if (duringContest) return;
      const pid = cid + "-" + s.problem.index;
      if (!practiceRawWAMap.has(pid)) {
        practiceRawWAMap.set(pid, makeProbEntry(s, contest.name || ("Contest " + cid)));
      }
      const prob = practiceRawWAMap.get(pid);
      if (s.verdict === "OK") { prob.acIds.push(s.id); }
      else { recordVerdict(prob, s.verdict, s.id); }
    });

    const practiceRawProblems = Array.from(practiceRawWAMap.values()).filter(p => totalErrors(p) > 0);

    return {
      categoryIndexTimes, categoryIndexAttempts, categoryIndexSolved,
      categoryIndexWrongIds, categoryIndexAcIds,
      categoryRawProblems, practiceRawProblems,
      participatedCount: participated.size,
      categoryContestCount: Object.fromEntries(Object.entries(categoryContestCount).map(([c, s]) => [c, s.size])),
      submissionTimingMap,
      submissionContestMap,
    };
  }

  const MAX_VISIBLE_TAGS = 3;
  function buildTagChips(tags, isDark, muted) {
    const tw = document.createElement("span");
    tw.style.cssText = "display:flex;gap:3px;flex-wrap:nowrap;flex-shrink:0;align-items:center;";
    const visible = tags.slice(0, MAX_VISIBLE_TAGS); const hidden = tags.length - visible.length;
    visible.forEach(tag => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      chip.style.cssText = [`background:${isDark ? "#1e2e40" : "#e8f0fe"}`, `color:${isDark ? "#7aabff" : "#1a56c4"}`, "font-size:10px", "border-radius:3px", "padding:1px 5px", "white-space:nowrap", "flex-shrink:0"].join(";");
      tw.appendChild(chip);
    });
    if (hidden > 0) {
      const more = document.createElement("span");
      more.textContent = `+${hidden}`; more.title = tags.slice(MAX_VISIBLE_TAGS).join(", ");
      more.style.cssText = [`background:${isDark ? "#2e2e2e" : "#eee"}`, `color:${muted}`, "font-size:10px", "border-radius:3px", "padding:1px 5px", "white-space:nowrap", "flex-shrink:0", "cursor:default"].join(";");
      tw.appendChild(more);
    }
    return tw;
  }

  function renderFrictionPanels(modeData, cat) {
    if (_subPopupEl && _subPopupEl.style.display !== "none") {
      _subPopupEl.style.display = "none";
    }
    _subPopupAnchor = null;

    frictionScrollBox.innerHTML = "";
    frictionScrollBox.style.cssText = [
      "height:260px", "overflow:visible", `border:1px solid ${theme.borderLight}`,
      "border-radius:5px", "display:flex", "flex-direction:column", "padding:0", "position:relative"
    ].join(";");

    const isDark = detectDarkMode();

    let activeTab = frictionActiveTab; let sortMode = defaultSortMode;
    let localHideAC = hideAC; let localSolvedOnly = solvedOnlyGlobal;
    let localHideTags = hideTagsGlobal; let localHideRatings = hideRatingsGlobal;
    let localMinAttempts = minAttemptsGlobal; let localRatingMin = ratingMinGlobal;
    let localRatingMax = ratingMaxGlobal; let localTagFilters = new Set(activeTagFilters);

    let availableTags = []; let filterOpen = false; let sortOpen = false; let viewOpen = false; let topicPickerOpen = false;

    function getProblems() {
      return activeTab === "category" ? (modeData.categoryRawProblems?.[cat] || []) : (modeData.practiceRawProblems || []);
    }

    function applyFilters(problems) {
      const rMin = localRatingMin !== "" && !isNaN(parseInt(localRatingMin)) ? parseInt(localRatingMin) : null;
      const rMax = localRatingMax !== "" && !isNaN(parseInt(localRatingMax)) ? parseInt(localRatingMax) : null;
      return problems
        .filter(p => totalErrors(p) >= localMinAttempts)
        .filter(p => !localSolvedOnly || p.solved)
        .filter(p => !localHideAC || !p.solved)
        .filter(p => localTagFilters.size === 0 || [...localTagFilters].every(t => (p.tags || []).includes(t)))
        .filter(p => {
          if (rMin === null && rMax === null) return true;
          if (!p.rating) return false;
          if (rMin !== null && p.rating < rMin) return false;
          if (rMax !== null && p.rating > rMax) return false;
          return true;
        });
    }

    function getAllTags(problems) {
      const tagSet = new Set();
      problems.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
      return Array.from(tagSet).sort();
    }

    const topBar = document.createElement("div");
    topBar.style.cssText = [
      "display:flex", "align-items:center", "justify-content:space-between",
      `border-bottom:1px solid ${theme.borderLight}`, "min-height:42px", "padding:0 10px 0 12px",
      "flex-shrink:0", "gap:8px", `background:${theme.bg}`, "border-radius:5px 5px 0 0"
    ].join(";");

    const segWrap = document.createElement("div");
    segWrap.style.cssText = `display:flex;align-items:center;background:${theme.borderLighter};border-radius:5px;padding:3px;gap:2px;flex-shrink:0;`;

    const srcContestBtn = document.createElement("button"); const srcPracticeBtn = document.createElement("button");
    srcContestBtn.dataset.key = "category"; srcPracticeBtn.dataset.key = "practice";
    const srcContestCount = document.createElement("span"); const srcPracticeCount = document.createElement("span");

    function badgeCountStyle(active) {
      return `font-size:10px;font-weight:700;border-radius:9px;padding:0 5px;min-width:16px;text-align:center;display:inline-block;background:${active ? "rgba(128,128,128,0.18)" : (isDark ? "#3a3a3a" : "#d8d8d8")};color:${active ? theme.btnActiveText : theme.muted};`;
    }

    function updateSourceBtns() {
      [srcContestBtn, srcPracticeBtn].forEach(btn => {
        const active = btn.dataset.key === activeTab;
        btn.style.cssText = [`background:${active ? theme.btnActiveBg : "transparent"}`, `color:${active ? theme.btnActiveText : theme.muted}`, "border:none", "outline:none", "cursor:pointer", "height:26px", "padding:0 11px", "border-radius:3px", "font-size:11px", "font-weight:600", "display:inline-flex", "align-items:center", "gap:6px", "white-space:nowrap"].join(";");
        const badge = btn.dataset.key === "category" ? srcContestCount : srcPracticeCount;
        badge.style.cssText = badgeCountStyle(active);
      });
    }

    function updateSourceCounts() {
      srcContestCount.textContent = String(applyFilters(modeData.categoryRawProblems?.[cat] || []).length);
      srcPracticeCount.textContent = String(applyFilters(modeData.practiceRawProblems || []).length);
    }

    srcContestBtn.appendChild(document.createTextNode("In-contest")); srcContestBtn.appendChild(srcContestCount);
    srcPracticeBtn.appendChild(document.createTextNode("Practice")); srcPracticeBtn.appendChild(srcPracticeCount);
    segWrap.appendChild(srcContestBtn); segWrap.appendChild(srcPracticeBtn);
    updateSourceBtns(); updateSourceCounts();

    srcContestBtn.addEventListener("click", () => { activeTab = "category"; frictionActiveTab = "category"; updateSourceBtns(); refreshAvailableTags(); renderList(); });
    srcPracticeBtn.addEventListener("click", () => { activeTab = "practice"; frictionActiveTab = "practice"; updateSourceBtns(); refreshAvailableTags(); renderList(); });

    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display:flex;align-items:center;gap:6px;flex-shrink:0;";

    const filterBtnWrap = document.createElement("div");
    filterBtnWrap.style.cssText = "position:relative;display:flex;align-items:center;";

    const filterIconBtn = document.createElement("button");
    filterIconBtn.className = "cfpm-icon-btn"; filterIconBtn.title = "Filter";
    filterIconBtn.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.muted};`;
    filterIconBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 4h12M4 8h8M6 12h4"/></svg>`;

    const filterDd = document.createElement("div");
    filterDd.id = "cfpm-filter-dd";
    filterDd.style.cssText = `background:${theme.dropdownBg};border:1px solid ${theme.dropdownBorder};overflow:hidden;display:none;`;

    const minAttSection = document.createElement("div");
    minAttSection.style.cssText = `display:flex;flex-direction:column;padding:9px 12px;border-bottom:1px solid ${theme.dropdownBorder};gap:6px;`;
    const minAttTopRow = document.createElement("div");
    minAttTopRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;";
    const minAttLabel = document.createElement("span");
    minAttLabel.style.cssText = `font-size:12px;color:${theme.text};white-space:nowrap;`;
    minAttLabel.textContent = "Min. wrong attempts";
    minAttTopRow.appendChild(minAttLabel);
    const minAttControls = document.createElement("div");
    minAttControls.style.cssText = "display:flex;align-items:center;gap:5px;flex-shrink:0;";
    const minAttDec = document.createElement("button");
    minAttDec.className = "cfpm-step-btn";
    minAttDec.innerHTML = `<svg width="8" height="2" viewBox="0 0 8 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="8" y2="1"/></svg>`;
    minAttDec.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.text};`;
    const minAttVal = document.createElement("span");
    minAttVal.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:24px;font-size:13px;font-weight:700;color:${theme.text};border-radius:4px;background:${theme.inputBg};border:1px solid ${theme.btnBorder};`;
    minAttVal.textContent = String(localMinAttempts);
    const minAttInc = document.createElement("button");
    minAttInc.className = "cfpm-step-btn";
    minAttInc.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="0" x2="4" y2="8"/><line x1="0" y1="4" x2="8" y2="4"/></svg>`;
    minAttInc.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.text};`;
    minAttControls.appendChild(minAttDec); minAttControls.appendChild(minAttVal); minAttControls.appendChild(minAttInc);
    minAttTopRow.appendChild(minAttControls); minAttSection.appendChild(minAttTopRow);

    const ratingSection = document.createElement("div");
    ratingSection.style.cssText = `padding:9px 12px;border-bottom:1px solid ${theme.dropdownBorder};`;
    const ratingRow = document.createElement("div");
    ratingRow.style.cssText = "display:flex;align-items:center;gap:6px;";
    const ratingLabelEl = document.createElement("span");
    ratingLabelEl.style.cssText = `font-size:12px;color:${theme.text};white-space:nowrap;flex-shrink:0;`;
    ratingLabelEl.textContent = "Difficulty";
    const ratingMinInput = document.createElement("input");
    ratingMinInput.type = "number"; ratingMinInput.className = "cfpm-rating-input"; ratingMinInput.placeholder = "min";
    ratingMinInput.min = "800"; ratingMinInput.max = "3500"; ratingMinInput.step = "100"; ratingMinInput.value = localRatingMin;
    ratingMinInput.style.cssText = `width:58px;height:26px;padding:0 6px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;font-weight:600;text-align:center;font-family:Arial,sans-serif;outline:none;box-sizing:border-box;`;
    const ratingDashEl = document.createElement("span");
    ratingDashEl.textContent = "—"; ratingDashEl.style.cssText = `color:${theme.muted};font-size:13px;flex-shrink:0;`;
    const ratingMaxInput = document.createElement("input");
    ratingMaxInput.type = "number"; ratingMaxInput.className = "cfpm-rating-input"; ratingMaxInput.placeholder = "max";
    ratingMaxInput.min = "800"; ratingMaxInput.max = "3500"; ratingMaxInput.step = "100"; ratingMaxInput.value = localRatingMax;
    ratingMaxInput.style.cssText = `width:58px;height:26px;padding:0 6px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:12px;font-weight:600;text-align:center;font-family:Arial,sans-serif;outline:none;box-sizing:border-box;`;
    const ratingClearBtn = document.createElement("button");
    ratingClearBtn.textContent = "Clear";
    ratingClearBtn.style.cssText = `font-size:11px;font-weight:600;cursor:pointer;background:none;border:none;padding:0;outline:none;color:${theme.accentBlue};margin-left:auto;display:${(localRatingMin !== "" || localRatingMax !== "") ? "inline-block" : "none"};`;
    ratingRow.appendChild(ratingLabelEl); ratingRow.appendChild(ratingMinInput); ratingRow.appendChild(ratingDashEl); ratingRow.appendChild(ratingMaxInput); ratingRow.appendChild(ratingClearBtn);
    ratingSection.appendChild(ratingRow);

    function handleRatingChange() {
      localRatingMin = ratingMinInput.value; localRatingMax = ratingMaxInput.value;
      ratingMinGlobal = localRatingMin; ratingMaxGlobal = localRatingMax;
      ratingClearBtn.style.display = (localRatingMin !== "" || localRatingMax !== "") ? "inline-block" : "none";
      updateFilterBtnStyle(); updateSourceCounts(); renderList(); autoSave();
    }
    ratingMinInput.addEventListener("change", handleRatingChange); ratingMaxInput.addEventListener("change", handleRatingChange);
    ratingMinInput.addEventListener("keyup", handleRatingChange); ratingMaxInput.addEventListener("keyup", handleRatingChange);
    ratingMinInput.addEventListener("click", e => e.stopPropagation()); ratingMaxInput.addEventListener("click", e => e.stopPropagation());
    ratingClearBtn.addEventListener("click", e => {
      e.stopPropagation();
      localRatingMin = ""; localRatingMax = ""; ratingMinGlobal = ""; ratingMaxGlobal = "";
      ratingMinInput.value = ""; ratingMaxInput.value = ""; ratingClearBtn.style.display = "none";
      updateFilterBtnStyle(); updateSourceCounts(); renderList(); autoSave();
    });

    const topicsSection = document.createElement("div");
    topicsSection.style.cssText = `padding:9px 12px 10px 12px;`;
    const topicsRow = document.createElement("div");
    topicsRow.style.cssText = "display:flex;align-items:center;gap:8px;";
    const topicsLabelEl = document.createElement("span");
    topicsLabelEl.style.cssText = `font-size:12px;color:${theme.text};flex:1;font-weight:500;`;
    topicsLabelEl.textContent = "Topics";
    const topicClearBtn = document.createElement("button");
    topicClearBtn.textContent = "Clear";
    topicClearBtn.style.cssText = `font-size:11px;font-weight:600;cursor:pointer;background:none;border:none;padding:0;outline:none;color:${theme.accentBlue};display:${localTagFilters.size > 0 ? "inline-block" : "none"};`;
    const addTopicBtn = document.createElement("button");
    addTopicBtn.className = "cfpm-add-topic-btn";
    addTopicBtn.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.btnText};cursor:pointer;`;

    function updateAddTopicBtnLabel() {
      addTopicBtn.innerHTML = topicPickerOpen
        ? `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l6 6M7 1L1 7"/></svg>&nbsp;Close`
        : `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4.5" y1="1" x2="4.5" y2="8"/><line x1="1" y1="4.5" x2="8" y2="4.5"/></svg>&nbsp;Add tag`;
    }
    updateAddTopicBtnLabel();

    topicsRow.appendChild(topicsLabelEl); topicsRow.appendChild(topicClearBtn); topicsRow.appendChild(addTopicBtn);
    topicsSection.appendChild(topicsRow);

    const filterTagPillsRow = document.createElement("div");
    filterTagPillsRow.className = "cfpm-filter-tag-pills";
    filterTagPillsRow.style.display = localTagFilters.size > 0 ? "flex" : "none";
    filterTagPillsRow.style.marginTop = localTagFilters.size > 0 ? "7px" : "0";
    filterTagPillsRow.style.padding = "0";

    function renderFilterTagPills() {
      filterTagPillsRow.innerHTML = "";
      const hasFilters = localTagFilters.size > 0;
      filterTagPillsRow.style.display = hasFilters ? "flex" : "none";
      filterTagPillsRow.style.marginTop = hasFilters ? "7px" : "0";
      topicClearBtn.style.display = hasFilters ? "inline-block" : "none";
      localTagFilters.forEach(tag => {
        const pill = document.createElement("span");
        pill.className = "cfpm-filter-tag-pill";
        pill.style.cssText = `background:${isDark ? "#16244a" : "#dbeafe"};color:${isDark ? "#93c5fd" : "#1e40af"};border:1px solid ${isDark ? "#2d5ba6" : "#93c5fd"};`;
        const txt = document.createElement("span"); txt.textContent = tag;
        const x = document.createElement("span"); x.className = "cfpm-filter-tag-pill-x"; x.textContent = "✕";
        pill.appendChild(txt); pill.appendChild(x); pill.title = `Remove: ${tag}`;
        pill.addEventListener("click", e => {
          e.stopPropagation(); localTagFilters.delete(tag); activeTagFilters = new Set(localTagFilters);
          updateFilterBtnStyle(); renderFilterTagPills(); renderTagPills(); renderTagListOnly(); updateSourceCounts(); renderList(); autoSave();
        });
        filterTagPillsRow.appendChild(pill);
      });
    }
    renderFilterTagPills(); topicsSection.appendChild(filterTagPillsRow);

    const topicPickerPanel = document.createElement("div");
    topicPickerPanel.style.cssText = [
      "position:absolute", "top:calc(100% + 6px)", "right:0", "z-index:10001",
      `background:${theme.dropdownBg}`, `border:1px solid ${theme.dropdownBorder}`,
      "border-radius:6px", "min-width:260px", "max-width:300px", "overflow:hidden",
      "box-shadow:0 8px 32px rgba(0,0,0,0.16),0 2px 6px rgba(0,0,0,0.08)", "display:none", "flex-direction:column"
    ].join(";");

    const pickerHeader = document.createElement("div");
    pickerHeader.style.cssText = [`padding:8px 12px 7px 12px`, "font-size:12px", "font-weight:600", `color:${theme.mutedStrong}`, `border-bottom:1px solid ${theme.dropdownBorder}`, `background:${theme.dropdownSection}`, "flex-shrink:0"].join(";");
    pickerHeader.textContent = "Filter by topic";

    const tagSearchWrap = document.createElement("div");
    tagSearchWrap.className = "cfpm-tag-search-wrap";
    tagSearchWrap.style.cssText = `position:relative;display:flex;align-items:center;border-bottom:1px solid ${theme.dropdownBorder};background:${theme.dropdownSection};flex-shrink:0;`;
    tagSearchWrap.innerHTML = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="${theme.muted}" stroke-width="1.6" stroke-linecap="round" style="position:absolute;left:9px;pointer-events:none;"><circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5"/></svg>`;

    const tagSearchInput = document.createElement("input");
    tagSearchInput.type = "text"; tagSearchInput.placeholder = "Search topics…"; tagSearchInput.className = "cfpm-tag-search";
    tagSearchInput.style.cssText = `width:100%;box-sizing:border-box;height:30px;padding:0 10px 0 30px;font-size:12px;font-family:Arial,sans-serif;outline:none;border:none;background:transparent;color:${theme.inputText};`;
    tagSearchWrap.appendChild(tagSearchInput);

    const tagListEl = document.createElement("div");
    tagListEl.id = "cfpm-tag-list"; tagListEl.style.cssText = "overflow-y:auto;max-height:110px;flex:1;";

    const pickerFooter = document.createElement("div");
    pickerFooter.style.cssText = [`border-top:1px solid ${theme.dropdownBorder}`, `background:${theme.dropdownSection}`, "padding:8px 12px", "display:flex", "align-items:center", "justify-content:space-between", "gap:8px", "flex-shrink:0"].join(";");
    const pickerSelCount = document.createElement("span");
    pickerSelCount.style.cssText = `font-size:11px;color:${theme.muted};`;

    function updatePickerSelCount() { const n = localTagFilters.size; pickerSelCount.textContent = n > 0 ? `${n} selected` : ""; }
    updatePickerSelCount();

    const pickerDoneBtn = document.createElement("button");
    pickerDoneBtn.className = "cfpm-pill-btn"; pickerDoneBtn.textContent = "Done";
    pickerDoneBtn.style.cssText = [`background:${theme.btnActiveBg}`, `color:${theme.btnActiveText}`, `border:1px solid ${theme.btnActiveBorder}`, "cursor:pointer", "font-size:11px", "height:26px", "padding:0 14px", "border-radius:4px", "font-weight:700"].join(";");
    pickerDoneBtn.addEventListener("click", e => {
      e.stopPropagation(); topicPickerOpen = false; updateAddTopicBtnLabel();
      topicPickerPanel.style.display = "none"; openFilterDd();
    });

    pickerFooter.appendChild(pickerSelCount); pickerFooter.appendChild(pickerDoneBtn);
    topicPickerPanel.appendChild(pickerHeader); topicPickerPanel.appendChild(tagSearchWrap);
    topicPickerPanel.appendChild(tagListEl); topicPickerPanel.appendChild(pickerFooter);

    addTopicBtn.addEventListener("click", e => {
      e.stopPropagation(); topicPickerOpen = !topicPickerOpen; updateAddTopicBtnLabel();
      if (topicPickerOpen) {
        if (filterOpen) { filterDd.style.display = "none"; filterOpen = false; }
        topicPickerPanel.style.display = "flex"; tagSearchInput.value = "";
        renderTagListOnly(); updatePickerSelCount(); setTimeout(() => tagSearchInput.focus(), 50);
      } else { topicPickerPanel.style.display = "none"; }
    });

    tagSearchInput.addEventListener("input", () => renderTagListOnly());
    tagSearchInput.addEventListener("click", e => e.stopPropagation());
    tagSearchInput.addEventListener("keydown", e => {
      if (e.key === "Escape") { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; openFilterDd(); }
    });

    topicClearBtn.addEventListener("click", e => {
      e.stopPropagation(); localTagFilters.clear(); activeTagFilters.clear();
      updateFilterBtnStyle(); renderFilterTagPills(); renderTagPills(); renderTagListOnly(); updateSourceCounts(); renderList(); autoSave();
      updatePickerSelCount();
    });

    filterDd.appendChild(minAttSection); filterDd.appendChild(ratingSection); filterDd.appendChild(topicsSection);
    filterBtnWrap.appendChild(filterIconBtn); filterBtnWrap.appendChild(filterDd); filterBtnWrap.appendChild(topicPickerPanel);

    const sortBtnWrap = document.createElement("div");
    sortBtnWrap.style.cssText = "position:relative;display:flex;align-items:center;";
    const sortIconBtn = document.createElement("button");
    sortIconBtn.className = "cfpm-icon-btn";
    sortIconBtn.title = sortMode === "rating" ? "Sort: by rating" : "Sort: by errors";
    sortIconBtn.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.muted};`;
    sortIconBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v10M5 13l-2-2M5 13l2-2M11 13V3M11 3l-2 2M11 3l2 2"/></svg>`;
    const sortDd = document.createElement("div");
    sortDd.id = "cfpm-sort-dd";
    sortDd.style.cssText = `background:${theme.dropdownBg};border:1px solid ${theme.dropdownBorder};display:none;`;
    const sortDdLabel = document.createElement("div");
    sortDdLabel.textContent = "Sort by";
    sortDdLabel.style.cssText = `padding:10px 14px 8px 14px;font-size:11px;font-weight:600;color:${theme.mutedStrong};border-bottom:1px solid ${theme.dropdownBorder};background:${theme.dropdownSection};`;
    sortDd.appendChild(sortDdLabel);

    const sortOptions = [{ key: "errors", label: "Wrong attempts", desc: "Most errors first" }, { key: "rating", label: "Rating", desc: "Highest rated first" }];

    function buildSortOptions() {
      while (sortDd.children.length > 1) sortDd.removeChild(sortDd.lastChild);
      sortOptions.forEach(({ key, label, desc }) => {
        const opt = document.createElement("div"); opt.className = "cfpm-sort-opt";
        const isActive = sortMode === key;
        opt.style.cssText = [`background:${isActive ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") : "transparent"}`, `color:${theme.text}`].join(";");
        const leftCol = document.createElement("div"); leftCol.style.cssText = "display:flex;flex-direction:column;gap:2px;flex:1;";
        const lblEl = document.createElement("div");
        lblEl.style.cssText = `font-size:12px;font-weight:${isActive ? "700" : "600"};color:${isActive ? theme.mutedStrong : theme.text};`;
        lblEl.textContent = label;
        const descEl = document.createElement("div"); descEl.textContent = desc; descEl.style.cssText = `font-size:11px;color:${theme.muted};`;
        leftCol.appendChild(lblEl); leftCol.appendChild(descEl); opt.appendChild(leftCol);
        if (isActive) { const checkEl = document.createElement("span"); checkEl.textContent = "✓"; checkEl.style.cssText = `color:${theme.mutedStrong};font-size:13px;font-weight:700;flex-shrink:0;`; opt.appendChild(checkEl); }
        opt.addEventListener("click", e => {
          e.stopPropagation(); sortMode = key; defaultSortMode = key;
          sortIconBtn.title = key === "rating" ? "Sort: by rating" : "Sort: by errors";
          closeSortDd(); renderList(); autoSave();
        });
        sortDd.appendChild(opt);
      });
    }

    sortBtnWrap.appendChild(sortIconBtn); sortBtnWrap.appendChild(sortDd);

    const viewBtnWrap = document.createElement("div");
    viewBtnWrap.style.cssText = "position:relative;display:flex;align-items:center;";
    const viewIconBtn = document.createElement("button");
    viewIconBtn.className = "cfpm-icon-btn"; viewIconBtn.title = "View options";
    viewIconBtn.style.cssText = `background:${theme.btnBg};border:1px solid ${theme.btnBorder};color:${theme.muted};`;
    viewIconBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>`;
    const viewDd = document.createElement("div");
    viewDd.id = "cfpm-view-dd";
    viewDd.style.cssText = `background:${theme.dropdownBg};border:1px solid ${theme.dropdownBorder};display:none;`;
    const viewDdLabel = document.createElement("div");
    viewDdLabel.textContent = "View options";
    viewDdLabel.style.cssText = `padding:10px 14px 8px 14px;font-size:11px;font-weight:600;color:${theme.mutedStrong};border-bottom:1px solid ${theme.dropdownBorder};background:${theme.dropdownSection};`;
    viewDd.appendChild(viewDdLabel);
    viewBtnWrap.appendChild(viewIconBtn); viewBtnWrap.appendChild(viewDd);

    function buildViewOptions() {
      while (viewDd.children.length > 1) viewDd.removeChild(viewDd.lastChild);
      const opts = [
        { label: "Unsolved only", desc: "Hide already-solved problems", isActive: localHideAC, toggle: () => { localHideAC = !localHideAC; hideAC = localHideAC; if (localHideAC) { localSolvedOnly = false; solvedOnlyGlobal = false; } } },
        { label: "Solved only", desc: "Show only solved problems", isActive: localSolvedOnly, toggle: () => { localSolvedOnly = !localSolvedOnly; solvedOnlyGlobal = localSolvedOnly; if (localSolvedOnly) { localHideAC = false; hideAC = false; } } },
        { label: "Hide topic tags", desc: "Don't show topic tags", isActive: localHideTags, toggle: () => { localHideTags = !localHideTags; hideTagsGlobal = localHideTags; } },
        { label: "Hide ratings", desc: "Don't show difficulty ratings", isActive: localHideRatings, toggle: () => { localHideRatings = !localHideRatings; hideRatingsGlobal = localHideRatings; } },
      ];
      opts.forEach(({ label, desc, isActive, toggle }) => {
        const opt = document.createElement("div"); opt.className = "cfpm-view-opt";
        opt.style.cssText = [`background:${isActive ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)") : "transparent"}`, `color:${theme.text}`].join(";");
        const checkBox = document.createElement("span");
        checkBox.style.cssText = ["width:14px", "height:14px", "border-radius:3px", "flex-shrink:0", "display:inline-flex", "align-items:center", "justify-content:center", "font-size:9px", "color:#fff", "box-sizing:border-box", `border:1.5px solid ${isActive ? theme.mutedStrong : theme.btnBorder}`, `background:${isActive ? theme.mutedStrong : "transparent"}`].join(";");
        if (isActive) checkBox.textContent = "✓";
        const leftCol = document.createElement("div"); leftCol.style.cssText = "display:flex;flex-direction:column;gap:2px;flex:1;";
        const lblEl = document.createElement("div");
        lblEl.style.cssText = `font-size:12px;font-weight:${isActive ? "700" : "600"};color:${isActive ? theme.mutedStrong : theme.text};`;
        lblEl.textContent = label;
        const descEl = document.createElement("div"); descEl.textContent = desc; descEl.style.cssText = `font-size:11px;color:${theme.muted};`;
        leftCol.appendChild(lblEl); leftCol.appendChild(descEl);
        opt.appendChild(checkBox); opt.appendChild(leftCol);
        opt.addEventListener("click", e => { e.stopPropagation(); toggle(); buildViewOptions(); updateViewBtnStyle(); updateSourceCounts(); renderList(); autoSave(); });
        viewDd.appendChild(opt);
      });
    }

    function updateViewBtnStyle() {
      const hasActive = localHideAC || localSolvedOnly || localHideTags || localHideRatings;
      viewIconBtn.style.background = hasActive ? theme.btnActiveBg : theme.btnBg;
      viewIconBtn.style.color = hasActive ? theme.btnActiveText : theme.muted;
      viewIconBtn.style.borderColor = hasActive ? theme.btnActiveBorder : theme.btnBorder;
      const parts = [];
      if (localHideAC) parts.push("Unsolved only"); if (localSolvedOnly) parts.push("Solved only");
      if (localHideTags) parts.push("Tags hidden"); if (localHideRatings) parts.push("Ratings hidden");
      viewIconBtn.title = parts.length ? parts.join(" · ") : "View options";
    }
    updateViewBtnStyle();

    rightBtns.appendChild(filterBtnWrap); rightBtns.appendChild(sortBtnWrap); rightBtns.appendChild(viewBtnWrap);
    topBar.appendChild(segWrap); topBar.appendChild(rightBtns);

    const tagPillRow = document.createElement("div");
    tagPillRow.style.cssText = ["display:none", "align-items:center", "padding:5px 12px", `border-bottom:1px solid ${theme.borderLighter}`, "min-height:32px", "gap:5px", "flex-wrap:wrap", "flex-shrink:0"].join(";");

    function renderTagPills() {
      tagPillRow.innerHTML = ""; tagPillRow.style.display = localTagFilters.size > 0 ? "flex" : "none";
      if (!localTagFilters.size) return;
      localTagFilters.forEach(tag => {
        const pill = document.createElement("span"); pill.className = "cfpm-tag-pill";
        pill.style.cssText = [`background:${isDark ? "#16244a" : "#dbeafe"}`, `color:${isDark ? "#93c5fd" : "#1e40af"}`, `border:1px solid ${isDark ? "#2d5ba6" : "#93c5fd"}`].join(";");
        const tagText = document.createElement("span"); tagText.textContent = tag;
        const closeX = document.createElement("span"); closeX.textContent = "✕"; closeX.style.cssText = "opacity:0.5;font-size:9px;margin-left:1px;";
        pill.appendChild(tagText); pill.appendChild(closeX); pill.title = `Remove: ${tag}`;
        pill.addEventListener("click", () => {
          localTagFilters.delete(tag); activeTagFilters = new Set(localTagFilters);
          updateFilterBtnStyle(); renderTagPills(); renderFilterTagPills(); renderTagListOnly(); updateSourceCounts(); renderList(); autoSave();
          updatePickerSelCount();
        });
        tagPillRow.appendChild(pill);
      });
    }

    const listArea = document.createElement("div");
    listArea.className = "cfpm-list-scroll";
    listArea.style.cssText = "flex:1;overflow-y:auto;min-height:0;width:100%;box-sizing:border-box;";

    function getFilterTitle() {
      const parts = [];
      if (localMinAttempts !== 1) parts.push(`Min ${localMinAttempts} errors`);
      if (localRatingMin !== "" || localRatingMax !== "") parts.push(`Rating ${localRatingMin || "any"}–${localRatingMax || "any"}`);
      if (localTagFilters.size > 0) parts.push(`${localTagFilters.size} topic${localTagFilters.size > 1 ? "s" : ""}`);
      return parts.length ? `Filters: ${parts.join(", ")}` : "Filter";
    }

    function updateFilterBtnStyle() {
      const hasFilter = localTagFilters.size > 0 || localMinAttempts !== 1 || localRatingMin !== "" || localRatingMax !== "";
      filterIconBtn.style.background = hasFilter ? theme.btnActiveBg : theme.btnBg;
      filterIconBtn.style.color = hasFilter ? theme.btnActiveText : theme.muted;
      filterIconBtn.style.borderColor = hasFilter ? theme.btnActiveBorder : theme.btnBorder;
      filterIconBtn.title = getFilterTitle();
      topicClearBtn.style.display = localTagFilters.size > 0 ? "inline-block" : "none";
    }
    updateFilterBtnStyle();

    function updateSortBtnStyle() {
      const isCustom = sortMode !== "errors";
      sortIconBtn.style.background = isCustom ? theme.btnActiveBg : theme.btnBg;
      sortIconBtn.style.color = isCustom ? theme.btnActiveText : theme.muted;
      sortIconBtn.style.borderColor = isCustom ? theme.btnActiveBorder : theme.btnBorder;
      sortIconBtn.title = sortMode === "rating" ? "Sort: by rating" : "Sort: by errors";
    }
    updateSortBtnStyle();

    function renderTagListOnly() {
      tagListEl.innerHTML = "";
      const searchVal = tagSearchInput.value.toLowerCase().trim();
      const combinedTags = new Set([...ALL_CF_TAGS, ...availableTags, ...localTagFilters]);
      const allTagsSorted = Array.from(combinedTags).sort().filter(tag => !searchVal || tag.toLowerCase().includes(searchVal));
      if (!allTagsSorted.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:12px;color:${theme.emptyText};font-size:12px;font-style:italic;text-align:center;`;
        empty.textContent = searchVal ? "No matching topics." : "No topics available.";
        tagListEl.appendChild(empty); return;
      }
      allTagsSorted.forEach(tag => {
        const isActive = localTagFilters.has(tag); const isAvailable = availableTags.includes(tag);
        const row = document.createElement("div"); row.className = "cfpm-tag-opt";
        row.style.cssText = [`background:${isActive ? (isDark ? "#16244a" : "#eff6ff") : "transparent"}`, `color:${isAvailable ? theme.text : theme.muted}`, isAvailable ? "" : "opacity:0.55;"].join(";");
        const check = document.createElement("span"); check.className = "cfpm-tag-check";
        check.style.cssText = [`border:1.5px solid ${isActive ? theme.mutedStrong : theme.btnBorder}`, `background:${isActive ? theme.mutedStrong : "transparent"}`].join(";");
        if (isActive) check.textContent = "✓";
        const lbl = document.createElement("span");
        lbl.textContent = tag + (!isAvailable ? " (none here)" : "");
        lbl.style.cssText = `flex:1;word-break:break-word;line-height:1.4;font-weight:${isActive ? "600" : "400"};`;
        row.appendChild(check); row.appendChild(lbl);
        row.addEventListener("click", e => {
          e.stopPropagation();
          if (localTagFilters.has(tag)) localTagFilters.delete(tag); else localTagFilters.add(tag);
          activeTagFilters = new Set(localTagFilters);
          updateFilterBtnStyle(); renderTagListOnly(); renderTagPills(); renderFilterTagPills(); updateSourceCounts(); renderList(); autoSave();
          updatePickerSelCount();
        });
        tagListEl.appendChild(row);
      });
    }

    function refreshAvailableTags() {
      availableTags = getAllTags(getProblems()); renderTagListOnly(); renderTagPills(); renderFilterTagPills();
    }

    function renderList() {
      listArea.innerHTML = "";
      if (_subPopupEl && _subPopupEl.style.display !== "none") {
        _subPopupEl.style.display = "none";
      }
      _subPopupAnchor = null;

      const problems = applyFilters(getProblems()); updateSourceCounts();

      if (!problems.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:24px 14px;color:${theme.emptyText};font-style:italic;font-size:13px;text-align:center;`;
        const hasActiveFilters = localTagFilters.size > 0 || localRatingMin !== "" || localRatingMax !== "" || localSolvedOnly || localHideAC;
        empty.textContent = hasActiveFilters ? "No problems match the selected filters." : "No problems with errors found.";
        listArea.appendChild(empty); return;
      }

      const sorted = problems.slice().sort((a, b) =>
        sortMode === "rating" ? (b.rating || 0) - (a.rating || 0) : totalErrors(b) - totalErrors(a)
      );

      const maxErr = Math.max(...sorted.map(p => totalErrors(p)), 1);
      const subTimingMap = modeData.submissionTimingMap;
      const subContestMap = modeData.submissionContestMap;
      const srcLabel = activeTab === "category" ? "in-contest" : "practice";

      sorted.forEach((p, i) => {
        const row = document.createElement("div");
        const errCount = totalErrors(p);
        let borderClr;
        if (errCount === 0) { borderClr = "#27ae60"; }
        else { const intensity = errCount / maxErr; borderClr = intensity > 0.66 ? "#e74c3c" : intensity > 0.33 ? "#e67e22" : "#27ae60"; }

        row.style.cssText = [
          "display:flex", "align-items:center", "gap:8px",
          "padding:7px 14px",
          i > 0 ? `border-top:1px solid ${theme.borderLighter}` : "",
          "cursor:pointer", "min-width:0", `border-left:3px solid ${borderClr}`,
          "box-sizing:border-box", "width:100%"
        ].join(";");

        const link = document.createElement("a");
        link.href = `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
        link.target = "_blank"; link.rel = "noopener";
        link.style.cssText = [
          `color:${theme.problemLink}`, "text-decoration:none", "font-size:12px", "font-weight:600",
          "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap",
          "flex-shrink:0", "max-width:200px", "transition:opacity 0.15s ease"
        ].join(";");
        link.textContent = `${p.index}. ${p.name}`; link.title = p.name;
        link.addEventListener("mouseenter", () => { link.style.textDecoration = "underline"; link.style.opacity = "0.78"; });
        link.addEventListener("mouseleave", () => { link.style.textDecoration = "none"; link.style.opacity = "1"; });
        link.addEventListener("click", e => e.stopPropagation());
        row.appendChild(link);

        if (p.contestName) {
          const cNameEl = document.createElement("a");
          cNameEl.href = `https://codeforces.com/contest/${p.contestId}`;
          cNameEl.target = "_blank"; cNameEl.rel = "noopener";
          cNameEl.textContent = p.contestName;
          cNameEl.title = `Open contest: ${p.contestName}`;
          cNameEl.style.cssText = [
            "font-size:10px", `color:${theme.muted}`, "overflow:hidden", "text-overflow:ellipsis",
            "white-space:nowrap", "flex:1 1 0", "min-width:0", "line-height:1.3",
            "text-decoration:none"
          ].join(";");
          cNameEl.addEventListener("mouseenter", () => { cNameEl.style.textDecoration = "underline"; });
          cNameEl.addEventListener("mouseleave", () => { cNameEl.style.textDecoration = "none"; });
          cNameEl.addEventListener("click", e => e.stopPropagation());
          row.appendChild(cNameEl);
        } else {
          const fill = document.createElement("span"); fill.style.cssText = "flex:1 1 0;min-width:0;"; row.appendChild(fill);
        }

        if (p.tags && p.tags.length && !localHideTags) row.appendChild(buildTagChips(p.tags, isDark, theme.muted));

        if (p.rating && !localHideRatings) {
          const rb = document.createElement("span");
          rb.style.cssText = `font-size:11px;color:${getRatingColor(p.rating)};white-space:nowrap;flex-shrink:0;font-weight:700;`;
          rb.textContent = "★ " + p.rating; row.appendChild(rb);
        }

        if (errCount > 0) {
          [
            { key: "wa", label: "WA", bg: theme.waBadge, fg: theme.waBadgeText },
            { key: "tle", label: "TLE", bg: theme.tleBg, fg: theme.tleFg },
            { key: "rte", label: "RTE", bg: theme.rteBg, fg: theme.rteFg },
            { key: "mle", label: "MLE", bg: theme.mleBg, fg: theme.mleFg },
            { key: "other", label: "Err", bg: theme.errBg, fg: theme.errFg },
          ].forEach(({ key, label, bg, fg }) => {
            const cnt = p[key] || 0; if (!cnt) return;
            const ids = p[key + "Ids"] || [];
            const badge = document.createElement("span"); badge.className = "cfpm-verdict-badge";
            badge.style.cssText = [
              `background:${bg}`, `color:${fg}`,
              "font-size:10px", "font-weight:700", "padding:1px 6px",
              "white-space:nowrap", "flex-shrink:0",
            ].join(";");
            badge.textContent = `${label} ×${cnt}`;
            badge.title = ids.length
              ? `Click to view ${cnt} ${srcLabel} ${label} submission${cnt > 1 ? "s" : ""}`
              : `${cnt} ${srcLabel} ${label} submission${cnt > 1 ? "s" : ""}`;
            if (ids.length) {
              badge.addEventListener("click", e => {
                e.stopPropagation();
                showSubmissionPopup(badge, label, ids, p.contestId, bg, fg, subTimingMap, subContestMap);
              });
            }
            row.appendChild(badge);
          });
        }

        const sb = document.createElement("span");
        if (p.solved) {
          const acIds = p.acIds || [];
          sb.className = "cfpm-verdict-badge";
          sb.style.cssText = [
            `background:${theme.solvedBadge}`, `color:${theme.solvedBadgeText}`,
            "font-size:10px", "font-weight:700", "padding:1px 6px",
            "white-space:nowrap", "flex-shrink:0", "display:inline-block",
          ].join(";");
          sb.textContent = errCount === 0 ? "✓ AC (1st try)" : "✓ AC";

          if (acIds.length) {
            sb.title = `Click to view ${acIds.length} ${srcLabel} AC submission${acIds.length > 1 ? "s" : ""}`;
            sb.style.cursor = "pointer";
            sb.addEventListener("click", e => {
              e.stopPropagation();
              showSubmissionPopup(sb, "AC", acIds, p.contestId, theme.solvedBadge, theme.solvedBadgeText, subTimingMap, subContestMap);
            });
          } else {
            sb.title = "Solved (AC submission is outside the current time/mode filter)";
            sb.style.cursor = "default";
            sb.addEventListener("click", e => { e.stopPropagation(); });
          }
        } else {
          sb.style.cssText = [
            `background:${theme.waBadge}`, `color:${theme.waBadgeText}`,
            "font-size:10px", "padding:1px 6px",
            "white-space:nowrap", "flex-shrink:0", "opacity:0.7",
            "display:inline-block", "border-radius:3px",
            "cursor:default",
          ].join(";");
          sb.textContent = "Unsolved";
          sb.title = "Not yet solved";
          sb.addEventListener("click", e => { e.stopPropagation(); });
        }
        row.appendChild(sb);

        row.addEventListener("click", () => window.open(`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`, "_blank"));
        listArea.appendChild(row);
      });
    }

    function openFilterDd() {
      refreshAvailableTags(); filterDd.style.display = "flex"; filterOpen = true;
      filterIconBtn.style.background = theme.btnActiveBg; filterIconBtn.style.color = theme.btnActiveText; filterIconBtn.style.borderColor = theme.btnActiveBorder;
    }
    function closeFilterDd() {
      filterDd.style.display = "none"; filterOpen = false; updateFilterBtnStyle();
      if (topicPickerOpen) { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; }
    }
    function openSortDd() {
      buildSortOptions(); sortDd.style.display = "block"; sortOpen = true;
      sortIconBtn.style.background = theme.btnActiveBg; sortIconBtn.style.color = theme.btnActiveText; sortIconBtn.style.borderColor = theme.btnActiveBorder;
    }
    function closeSortDd() { sortDd.style.display = "none"; sortOpen = false; updateSortBtnStyle(); }
    function openViewDd() {
      buildViewOptions(); viewDd.style.display = "block"; viewOpen = true;
      viewIconBtn.style.background = theme.btnActiveBg; viewIconBtn.style.color = theme.btnActiveText; viewIconBtn.style.borderColor = theme.btnActiveBorder;
    }
    function closeViewDd() { viewDd.style.display = "none"; viewOpen = false; updateViewBtnStyle(); }

    filterIconBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (topicPickerOpen) { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; }
      if (filterOpen) { closeFilterDd(); } else { if (sortOpen) closeSortDd(); if (viewOpen) closeViewDd(); openFilterDd(); }
    });
    sortIconBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (sortOpen) { closeSortDd(); } else {
        if (filterOpen) closeFilterDd(); if (viewOpen) closeViewDd();
        if (topicPickerOpen) { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; }
        openSortDd();
      }
    });
    viewIconBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (viewOpen) { closeViewDd(); } else {
        if (filterOpen) closeFilterDd(); if (sortOpen) closeSortDd();
        if (topicPickerOpen) { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; }
        openViewDd();
      }
    });

    minAttDec.addEventListener("click", e => {
      e.stopPropagation();
      if (localMinAttempts > 1) { localMinAttempts--; minAttemptsGlobal = localMinAttempts; minAttVal.textContent = String(localMinAttempts); updateFilterBtnStyle(); updateSourceCounts(); renderList(); autoSave(); }
    });
    minAttInc.addEventListener("click", e => {
      e.stopPropagation();
      if (localMinAttempts < 99) { localMinAttempts++; minAttemptsGlobal = localMinAttempts; minAttVal.textContent = String(localMinAttempts); updateFilterBtnStyle(); updateSourceCounts(); renderList(); autoSave(); }
    });

    if (window._cfpmPanelClickHandler) document.removeEventListener("click", window._cfpmPanelClickHandler);
    window._cfpmPanelClickHandler = e => {
      if (filterOpen && !filterBtnWrap.contains(e.target)) closeFilterDd();
      if (sortOpen && !sortBtnWrap.contains(e.target)) closeSortDd();
      if (viewOpen && !viewBtnWrap.contains(e.target)) closeViewDd();
      if (topicPickerOpen && !filterBtnWrap.contains(e.target)) { topicPickerOpen = false; updateAddTopicBtnLabel(); topicPickerPanel.style.display = "none"; }
    };
    document.addEventListener("click", window._cfpmPanelClickHandler);

    frictionScrollBox.appendChild(topBar); frictionScrollBox.appendChild(tagPillRow); frictionScrollBox.appendChild(listArea);
    refreshAvailableTags(); renderTagPills(); renderList();
  }

  function renderTableForCategory(modeData, cat, deltaInfo) {
    const idxTimes = modeData.categoryIndexTimes[cat] || {};
    const idxAttempts = modeData.categoryIndexAttempts[cat] || {};
    const idxSolved = modeData.categoryIndexSolved[cat] || {};
    const idxWrongIds = (modeData.categoryIndexWrongIds && modeData.categoryIndexWrongIds[cat]) || {};
    const idxAcIds    = (modeData.categoryIndexAcIds    && modeData.categoryIndexAcIds[cat])    || {};
    const subTimingMap = modeData.submissionTimingMap;
    const subContestMap = modeData.submissionContestMap;

    const allIdx = Array.from(new Set([...DEFAULT_INDICES, ...Object.keys(idxTimes), ...Object.keys(idxAttempts)])).sort((a, b) => a.localeCompare(b));

    table.innerHTML = "";
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.style.cssText = `text-align:left;padding:5px 12px;border-bottom:2px solid ${theme.borderLight};vertical-align:middle;`;
    const cornerRow = document.createElement("div"); cornerRow.style.cssText = "display:flex;align-items:center;gap:7px;flex-wrap:wrap;";
    const cornerCatName = document.createElement("span");
    cornerCatName.style.cssText = `color:${theme.tableHeaderText};font-weight:700;font-size:12px;`;
    cornerCatName.textContent = cat; cornerRow.appendChild(cornerCatName);

    if (deltaInfo) {
      const isDark = detectDarkMode(); const sign = deltaInfo.delta > 0 ? "+" : "";
      const deltaColor = deltaInfo.delta > 0 ? "#27ae60" : deltaInfo.delta < 0 ? "#e74c3c" : theme.muted;
      const deltaBg = deltaInfo.delta > 0 ? (isDark ? "#0d2318" : "#e6f4ea") : deltaInfo.delta < 0 ? (isDark ? "#2a1212" : "#fdecea") : (isDark ? "#222" : "#f5f5f5");
      const deltaEl = document.createElement("span");
      deltaEl.style.cssText = `display:inline-flex;align-items:center;gap:3px;padding:1px 7px 1px 5px;border-radius:10px;background:${deltaBg};`;
      const deltaIcon = document.createElement("span"); deltaIcon.textContent = "Δ";
      deltaIcon.style.cssText = `font-size:11px;font-weight:900;color:${deltaColor};font-family:serif;line-height:1;`;
      const deltaVal = document.createElement("span");
      deltaVal.style.cssText = `font-size:11px;font-weight:700;color:${deltaColor};font-family:monospace;line-height:1;`;
      deltaVal.textContent = `${sign}${deltaInfo.delta}`;
      deltaEl.appendChild(deltaIcon); deltaEl.appendChild(deltaVal); cornerRow.appendChild(deltaEl);
      corner.title = deltaInfo.count > 0 ? `Rating change in ${deltaInfo.count} rated ${cat} contest${deltaInfo.count !== 1 ? "s" : ""} (selected period)` : `No rated ${cat} contests in the selected period`;
    }

    corner.appendChild(cornerRow); headRow.appendChild(corner);
    allIdx.forEach(idx => {
      const th = document.createElement("th");
      th.style.cssText = `text-align:center;padding:5px 14px;font-weight:700;font-size:13px;color:${theme.headingText};border-bottom:2px solid ${theme.borderLight};`;
      th.textContent = idx; headRow.appendChild(th);
    });
    table.appendChild(headRow);

    function makeRow(label, getCellContent) {
      const row = document.createElement("tr");
      const lbl = document.createElement("td");
      lbl.style.cssText = `padding:6px 12px;color:${theme.tableHeaderText};font-size:11px;font-weight:600;white-space:nowrap;`;
      lbl.textContent = label; row.appendChild(lbl);
      allIdx.forEach(idx => row.appendChild(getCellContent(idx))); return row;
    }

    table.appendChild(makeRow("Avg. time (min)", idx => {
      const arr = idxTimes[idx] || []; const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 14px;font-weight:700;color:${theme.accentBlue};font-size:13px;`;
      td.textContent = arr.length ? String(Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10) : "—";
      return td;
    }));

    table.appendChild(makeRow("Median time (min)", idx => {
      const arr = idxTimes[idx] || []; const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 14px;font-weight:700;color:#6b4fa0;font-size:13px;border-top:1px solid ${theme.borderLighter};`;
      const m = median(arr); td.textContent = m !== null ? String(Math.round(m * 10) / 10) : "—"; return td;
    }));

    table.appendChild(makeRow("Solved", idx => {
      const att = idxAttempts[idx] || 0;
      const sol = idxSolved[idx] || 0;
      const acIds = idxAcIds[idx] || [];
      const td = document.createElement("td");

      if (att > 0 && sol === 0) {
        td.style.cssText = `text-align:center;padding:6px 14px;font-size:13px;font-weight:700;color:#e74c3c;border-top:1px solid ${theme.borderLighter};`;
        td.textContent = `0 / ${att}`;
        td.title = `Never solved — ${att} attempt${att !== 1 ? "s" : ""}, no AC`;
      } else {
        td.style.cssText = `text-align:center;padding:6px 14px;color:${theme.tableCellText};font-size:13px;border-top:1px solid ${theme.borderLighter};`;
        td.textContent = String(sol);
        if (acIds.length > 0) {
          td.style.cursor = "pointer";
          td.style.textDecoration = "underline";
          td.style.textDecorationStyle = "dotted";
          td.style.textUnderlineOffset = "2px";
          td.title = `Click to view ${acIds.length} AC submission${acIds.length > 1 ? "s" : ""} for problem ${idx}`;
          td.addEventListener("click", e => {
            e.stopPropagation();
            showSubmissionPopup(td, "AC", acIds, 0, theme.solvedBadge, theme.solvedBadgeText, subTimingMap, subContestMap);
          });
        }
      }
      return td;
    }));

    table.appendChild(makeRow("Attempts", idx => {
      const att = idxAttempts[idx] || 0;
      const wrongIds = idxWrongIds[idx] || [];
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 14px;color:${theme.tableCellText};font-size:13px;`;
      td.textContent = String(att);
      if (wrongIds.length > 0) {
        td.style.cursor = "pointer";
        td.style.textDecoration = "underline";
        td.style.textDecorationStyle = "dotted";
        td.style.textUnderlineOffset = "2px";
        td.title = `Click to view ${wrongIds.length} wrong submission${wrongIds.length > 1 ? "s" : ""} for problem ${idx}`;
        td.addEventListener("click", e => {
          e.stopPropagation();
          showSubmissionPopup(td, "Errors", wrongIds, 0, theme.waBadge, theme.waBadgeText, subTimingMap, subContestMap);
        });
      }
      return td;
    }));

    table.appendChild(makeRow("Failure %", idx => {
      const att = idxAttempts[idx] || 0; const sol = idxSolved[idx] || 0;
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 14px;font-weight:700;font-size:13px;border-top:1px solid ${theme.borderLighter};`;
      if (att > 0) {
        const r = Math.round(((att - sol) / att) * 100);
        td.style.color = r < 40 ? "#27ae60" : r < 70 ? "#e67e22" : "#e74c3c"; td.textContent = r + "%";
      } else { td.style.color = theme.tableCellText; td.textContent = "—"; }
      return td;
    }));
  }

  function renderCategory(cat) {
    currentCategory = cat;
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k]; const active = k === cat;
      b.style.background = active ? theme.btnActiveBg : theme.btnBg;
      b.style.color = active ? theme.btnActiveText : theme.btnText;
      b.style.borderColor = active ? theme.btnActiveBorder : theme.btnBorder;
    });

    const mode = modeSelect.value;
    info.textContent = "Calculating…";

    const timelineValue = resolveTimelineValue();
    const modeData = recalcForMode(mode, timelineValue); lastModeData = modeData;
    const deltaInfo = calcDeltaRating(cat, timelineValue); lastDeltaInfo = deltaInfo;

    const categoryCount = modeData.categoryContestCount[cat] || 0;
    let infoText = `${modeData.participatedCount} contests total · ${cat}: ${categoryCount}`;
    if (deltaInfo.count > 0) { const sign = deltaInfo.delta >= 0 ? "+" : ""; infoText += ` · Δ ${sign}${deltaInfo.delta} (${deltaInfo.count} rated)`; }
    infoText += ` · ${mode[0].toUpperCase() + mode.slice(1)} · ${timelineLabel(savedTimeline)}`;
    info.textContent = infoText;

    renderTableForCategory(modeData, cat, deltaInfo);
    renderFrictionPanels(modeData, cat);
  }

  const handle = (window.location.pathname.split("/")[2] || "").trim();
  if (!handle || !/^[a-zA-Z0-9_\-\.]{2,24}$/.test(handle)) {
    info.textContent = "Could not detect a valid Codeforces username in the page URL.";
    return;
  }

  await fetchContests();
  const ok = await fetchAndStore(handle);
  if (!ok) return;

  renderCategory(DEFAULT_CATEGORY);

})();