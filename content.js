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
  let DEFAULT_FRICTION     = _saved.friction    || "topics";
  let DEFAULT_SORT_MODE    = _saved.sortMode    || "wa";
  let DEFAULT_HIDE_AC      = _saved.hideAC      !== undefined ? _saved.hideAC      : false;
  let DEFAULT_MIN_ATTEMPTS = _saved.minAttempts !== undefined ? _saved.minAttempts : 1;
  let DEFAULT_CUSTOM_START = _saved.customStart || "";
  let DEFAULT_CUSTOM_END   = _saved.customEnd   || "";

  // Toggle state (persisted separately so it survives settings resets)
  const TOGGLE_KEY = "cfpm_enabled";
  function loadToggle() {
    try { const v = localStorage.getItem(TOGGLE_KEY); return v === null ? true : v === "true"; } catch(e) { return true; }
  }
  function saveToggle(val) {
    try { localStorage.setItem(TOGGLE_KEY, String(val)); } catch(e) {}
  }
  let isEnabled = loadToggle();

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
      document.querySelector('.info'), document.querySelector('.datatable'),
      document.querySelector('.roundbox'), document.querySelector('#pageContent'),
      document.querySelector('.second-level-menu-list'), document.body
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
      if (el) { const bg = window.getComputedStyle(el).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; }
    }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
    return detectDarkMode() ? '#1a1a1a' : '#ffffff';
  }

  function getBoxBorderColor() {
    for (const sel of ['.roundbox', '.info', '.datatable']) {
      const el = document.querySelector(sel);
      if (el) { const bc = window.getComputedStyle(el).borderColor; if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') return bc; }
    }
    return detectDarkMode() ? '#444' : '#d4d4d4';
  }

  function createTheme() {
    const isDark = detectDarkMode();
    return {
      bg: getBoxBackground(), text: isDark ? '#e8e8e8' : '#0b1220',
      border: getBoxBorderColor(),
      borderLight: isDark ? '#444' : '#eee', borderLighter: isDark ? '#333' : '#f0f0f0',
      muted: isDark ? '#aaa' : '#666', headingText: isDark ? '#ddd' : '#222',
      buttonBg: isDark ? '#3a3a3a' : '#f5f5f5', buttonText: isDark ? '#ddd' : '#333',
      buttonBorder: isDark ? '#555' : '#ccc',
      activeButtonBg: '#1652d6', activeButtonText: '#fff',
      tableHeaderText: isDark ? '#ccc' : '#666', tableCellText: isDark ? '#ddd' : '#444',
      emptyText: isDark ? '#777' : '#999',
      selectBg: isDark ? '#2a2a2a' : '#fff', selectText: isDark ? '#ddd' : '#333',
      selectBorder: isDark ? '#555' : '#ccc',
      weakTopicName: isDark ? '#ccc' : '#444',
      inputBg: isDark ? '#2a2a2a' : '#fff', inputText: isDark ? '#ddd' : '#333',
      inputBorder: isDark ? '#555' : '#ccc',
      dropdownBg: isDark ? '#252525' : '#fafafa', dropdownBorder: isDark ? '#3a3a3a' : '#e8e8e8',
      problemRowHover: isDark ? '#2e2e2e' : '#f0f4ff',
      problemLink: isDark ? '#7aabff' : '#1652d6',
      solvedBadge: isDark ? '#1a3a1a' : '#e8f5e9', solvedBadgeText: isDark ? '#4caf50' : '#2e7d32',
      waBadge: isDark ? '#3a1a1a' : '#fdecea', waBadgeText: isDark ? '#f48080' : '#c62828',
    };
  }

  let theme = createTheme();
  let frictionView      = DEFAULT_FRICTION === "problems" ? "problems" : "topics";
  let defaultSortMode   = DEFAULT_SORT_MODE;
  let hideAC            = DEFAULT_HIDE_AC;
  let minAttemptsGlobal = DEFAULT_MIN_ATTEMPTS;

  let frictionActiveTab = "category";

  let savedTimeline = DEFAULT_TIMELINE;
  let lastAppliedCustomStart = DEFAULT_CUSTOM_START;
  let lastAppliedCustomEnd   = DEFAULT_CUSTOM_END;

  function autoSave() {
    saveSettings({
      category:    currentCategory || DEFAULT_CATEGORY,
      timeline:    savedTimeline,
      mode:        modeSelect.value,
      friction:    frictionView,
      sortMode:    defaultSortMode,
      hideAC:      hideAC,
      minAttempts: minAttemptsGlobal,
      customStart: startDateInput ? startDateInput.value : "",
      customEnd:   endDateInput   ? endDateInput.value   : "",
    });
  }

  // Inject collapse animation CSS 
  if (!document.getElementById("cfpm-toggle-style")) {
    const s = document.createElement("style");
    s.id = "cfpm-toggle-style";
    s.textContent = `
      #cfpm-compact { transition: box-shadow 0.2s; }
      #cfpm-body {
        overflow: hidden;
        transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease;
        max-height: 2000px;
        opacity: 1;
      }
      #cfpm-body.cfpm-collapsed {
        max-height: 0 !important;
        opacity: 0;
        pointer-events: none;
      }
      #cfpm-toggle-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 9px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        border: 1.5px solid;
        transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
        letter-spacing: 0.03em;
        flex-shrink: 0;
        white-space: nowrap;
        outline: none;
        user-select: none;
      }
      #cfpm-toggle-btn:hover {
        box-shadow: 0 0 0 3px rgba(22,82,214,0.18);
      }
      #cfpm-toggle-btn .cfpm-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        display: inline-block;
        transition: background 0.18s;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(s);
  }

  const card = document.createElement("div");
  card.id = "cfpm-compact";
  card.style.cssText = [
    "box-sizing:border-box", "font-family:Arial,sans-serif", "font-size:14px",
    `color:${theme.text}`, `background:${theme.bg}`, `border:1px solid ${theme.border}`,
    "border-radius:6px", "padding:0", "margin-top:10px", "max-width:920px"
  ].join(";");

  //  Header bar (always visible)
  const headerBar = document.createElement("div");
  headerBar.style.cssText = [
    "display:flex", "align-items:center", "justify-content:space-between",
    "padding:5px 16px", "gap:10px", "min-height:32px", "box-sizing:border-box"
  ].join(";");

  const headerTitle = document.createElement("span");
  headerTitle.style.cssText = `font-size:11px;font-weight:700;color:${theme.muted};letter-spacing:0.04em;opacity:0.75;cursor:default;user-select:none;`;
  headerTitle.textContent = "⚡ CF Performance Mirror";

  // Toggle button 
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "cfpm-toggle-btn";

  const dot = document.createElement("span");
  dot.className = "cfpm-dot";

  const toggleLabel = document.createElement("span");

  toggleBtn.appendChild(dot);
  toggleBtn.appendChild(toggleLabel);

  function applyToggleVisuals() {
    if (isEnabled) {
      dot.style.background       = "#22c55e";
      toggleLabel.textContent    = "ON";
      toggleBtn.style.background = detectDarkMode() ? "#1a2e1a" : "#f0fdf4";
      toggleBtn.style.color      = "#22c55e";
      toggleBtn.style.borderColor= "#22c55e";
    } else {
      dot.style.background       = detectDarkMode() ? "#888" : "#aaa";
      toggleLabel.textContent    = "OFF";
      toggleBtn.style.background = detectDarkMode() ? "#2a2a2a" : "#f5f5f5";
      toggleBtn.style.color      = detectDarkMode() ? "#999" : "#888";
      toggleBtn.style.borderColor= detectDarkMode() ? "#555" : "#ccc";
    }
  }
  applyToggleVisuals();

  // Body wrapper (everything that collapses) 
  const body = document.createElement("div");
  body.id = "cfpm-body";
  body.style.cssText = "padding:0 16px 16px 16px;box-sizing:border-box;";
  if (!isEnabled) body.classList.add("cfpm-collapsed");

  toggleBtn.addEventListener("click", () => {
    isEnabled = !isEnabled;
    saveToggle(isEnabled);
    applyToggleVisuals();
    if (isEnabled) {
      body.classList.remove("cfpm-collapsed");
      headerTitle.style.opacity = "0.75";
    } else {
      body.classList.add("cfpm-collapsed");
      headerTitle.style.opacity = "0.45";
    }
  });

  headerBar.appendChild(headerTitle);
  headerBar.appendChild(toggleBtn);
  card.appendChild(headerBar);

  //  Divider between header and body 
  const headerDivider = document.createElement("div");
  headerDivider.id = "cfpm-header-divider";
  headerDivider.style.cssText = `height:1px;background:${theme.borderLight};margin:0;transition:opacity 0.28s;`;
  card.appendChild(headerDivider);

  card.appendChild(body);

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;min-height:36px;margin-top:14px;";

  const leftControls = document.createElement("div");
  leftControls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;";

  const categoryButtons = {};
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.textContent = cat; b.dataset.cat = cat;
    b.style.cssText = [
      "padding:6px 12px", "border-radius:12px", `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`, `color:${theme.buttonText}`,
      "cursor:pointer", "font-weight:600", "font-size:13px", "white-space:nowrap", "flex-shrink:0"
    ].join(";");
    b.addEventListener("click", () => { renderCategory(cat); autoSave(); });
    categoryButtons[cat] = b;
    leftControls.appendChild(b);
  });

  const rightControls = document.createElement("div");
  rightControls.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

  const timelineSelect = document.createElement("select");
  [
    { value: "all",    label: "All Time"      },
    { value: "1",      label: "Last Month"    },
    { value: "3",      label: "Last 3 Months" },
    { value: "6",      label: "Last 6 Months" },
    { value: "12",     label: "Last Year"     },
    { value: "24",     label: "Last 2 Years"  },
    { value: "custom", label: "Custom Range"  }
  ].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value; o.textContent = opt.label; timelineSelect.appendChild(o);
  });
  timelineSelect.value = DEFAULT_TIMELINE;
  timelineSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:120px;`;

  let timelineValueOnFocus = timelineSelect.value;
  timelineSelect.addEventListener("mousedown", () => { timelineValueOnFocus = timelineSelect.value; });
  timelineSelect.addEventListener("change", () => {
    if (timelineSelect.value === "custom") {
      customDateRow.style.display = "flex";
    } else {
      savedTimeline = timelineSelect.value;
      customDateRow.style.display = "none";
      renderCategory(currentCategory || DEFAULT_CATEGORY);
      autoSave();
    }
  });
  timelineSelect.addEventListener("click", () => {
    if (timelineSelect.value === "custom" && timelineValueOnFocus === "custom") {
      customDateRow.style.display = "flex";
    }
  });

  const modeSelect = document.createElement("select");
  ["total", "rated", "unrated"].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt; o.textContent = opt[0].toUpperCase() + opt.slice(1); modeSelect.appendChild(o);
  });
  modeSelect.value = DEFAULT_MODE;
  modeSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:90px;`;
  modeSelect.addEventListener("change", () => { renderCategory(currentCategory || DEFAULT_CATEGORY); autoSave(); });

  rightControls.appendChild(timelineSelect);
  rightControls.appendChild(modeSelect);
  controlsRow.appendChild(leftControls);
  controlsRow.appendChild(rightControls);
  body.appendChild(controlsRow);

  const customDateRow = document.createElement("div");
  customDateRow.style.cssText = `display:none;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:${theme.bg};border:1px solid ${theme.border};border-radius:6px;flex-wrap:wrap;min-height:44px;`;

  const dateFromLabel = document.createElement("span");
  dateFromLabel.textContent = "From:";
  dateFromLabel.style.cssText = `color:${theme.text};font-size:13px;font-weight:600;white-space:nowrap;`;
  const startDateInput = document.createElement("input");
  startDateInput.type = "date";
  startDateInput.value = DEFAULT_CUSTOM_START;
  startDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;color-scheme:${detectDarkMode()?"dark":"light"};`;
  const dateToLabel = document.createElement("span");
  dateToLabel.textContent = "To:";
  dateToLabel.style.cssText = `color:${theme.text};font-size:13px;font-weight:600;white-space:nowrap;`;
  const endDateInput = document.createElement("input");
  endDateInput.type = "date";
  endDateInput.value = DEFAULT_CUSTOM_END;
  endDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;color-scheme:${detectDarkMode()?"dark":"light"};`;

  const dateButtonGroup = document.createElement("div");
  dateButtonGroup.style.cssText = "display:flex;gap:6px;margin-left:auto;";
  const applyDateBtn = document.createElement("button");
  applyDateBtn.textContent = "Apply";
  applyDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.activeButtonBg};background:${theme.activeButtonBg};color:${theme.activeButtonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;
  const cancelDateBtn = document.createElement("button");
  cancelDateBtn.textContent = "Cancel";
  cancelDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.buttonBorder};background:${theme.buttonBg};color:${theme.buttonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;
  const dateValidationMsg = document.createElement("span");
  dateValidationMsg.style.cssText = "color:#e74c3c;font-size:12px;font-weight:600;display:none;white-space:nowrap;";
  dateValidationMsg.textContent = "Please select both dates.";

  dateButtonGroup.appendChild(dateValidationMsg);
  dateButtonGroup.appendChild(applyDateBtn);
  dateButtonGroup.appendChild(cancelDateBtn);
  customDateRow.appendChild(dateFromLabel);
  customDateRow.appendChild(startDateInput);
  customDateRow.appendChild(dateToLabel);
  customDateRow.appendChild(endDateInput);
  customDateRow.appendChild(dateButtonGroup);
  body.appendChild(customDateRow);

  applyDateBtn.addEventListener("click", () => {
    if (startDateInput.value && endDateInput.value) {
      dateValidationMsg.style.display = "none";
      customDateRow.style.display = "none";
      savedTimeline = "custom";
      lastAppliedCustomStart = startDateInput.value;
      lastAppliedCustomEnd   = endDateInput.value;
      autoSave();
      renderCategory(currentCategory || DEFAULT_CATEGORY);
    } else { dateValidationMsg.style.display = "inline"; }
  });
  cancelDateBtn.addEventListener("click", () => {
    customDateRow.style.display = "none";
    dateValidationMsg.style.display = "none";
    startDateInput.value = lastAppliedCustomStart;
    endDateInput.value   = lastAppliedCustomEnd;
    timelineSelect.value = savedTimeline;
    renderCategory(currentCategory || DEFAULT_CATEGORY);
  });

  const info = document.createElement("div");
  info.style.cssText = `color:${theme.muted};font-size:13px;margin-top:4px;margin-bottom:12px;`;
  info.textContent = "Loading…";
  body.appendChild(info);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;margin-bottom:14px;";
  const table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;font-size:13px;width:100%;";
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  const frictionSection = document.createElement("div");
  frictionSection.style.cssText = `margin-top:12px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;

  function makeFrictionToggleBtn(label, value) {
    const b = document.createElement("button");
    b.textContent = label; b.dataset.fview = value;
    b.style.cssText = [
      "padding:6px 12px", "border-radius:6px", `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`, `color:${theme.buttonText}`,
      "cursor:pointer", "font-weight:600", "font-size:13px", "white-space:nowrap",
      "transition:background 0.15s,color 0.15s"
    ].join(";");
    b.addEventListener("click", () => {
      frictionView = value;
      defaultSortMode = value === "problems" ? "errors" : "wa";
      updateFrictionToggleBtns();
      if (lastModeData) renderFrictionPanels(lastModeData, currentCategory || DEFAULT_CATEGORY);
      autoSave();
    });
    return b;
  }

  const btnTopics   = makeFrictionToggleBtn("Topics",   "topics");
  const btnProblems = makeFrictionToggleBtn("Problems", "problems");

  function updateFrictionToggleBtns() {
    [btnTopics, btnProblems].forEach(b => {
      const active = b.dataset.fview === frictionView;
      b.style.background = active ? theme.activeButtonBg : theme.buttonBg;
      b.style.color      = active ? theme.activeButtonText : theme.buttonText;
      b.style.border     = active ? `1px solid ${theme.activeButtonBg}` : `1px solid ${theme.buttonBorder}`;
    });
  }
  updateFrictionToggleBtns();

  const frictionToggleRow = document.createElement("div");
  frictionToggleRow.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:8px;";

  const frictionToggleBtns = document.createElement("div");
  frictionToggleBtns.style.cssText = "display:flex;gap:6px;flex-shrink:0;";
  frictionToggleBtns.appendChild(btnTopics);
  frictionToggleBtns.appendChild(btnProblems);

  frictionToggleRow.appendChild(frictionToggleBtns);
  frictionSection.appendChild(frictionToggleRow);

  const frictionScrollBox = document.createElement("div");
  frictionScrollBox.style.cssText = [
    "height:265px", "overflow:hidden", `border:1px solid ${theme.borderLight}`,
    "border-radius:5px", "display:flex", "flex-direction:column", "padding:0"
  ].join(";");
  frictionSection.appendChild(frictionScrollBox);
  body.appendChild(frictionSection);

  function insertCard() {
    const visible = Array.from(document.querySelectorAll(".box")).filter(el => { const r = el.getBoundingClientRect(); return r.width > 220 && r.height > 50; });
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      card.style.width = Math.round(last.getBoundingClientRect().width) + "px";
      last.insertAdjacentElement("afterend", card);
      if (window.ResizeObserver) new ResizeObserver(entries => { for (const e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }}).observe(last);
      return;
    }
    const main = document.querySelector("#pageContent, #mainContent, .mainContent, .content");
    if (main) {
      card.style.width = Math.round(main.getBoundingClientRect().width) + "px";
      main.appendChild(card);
      if (window.ResizeObserver) new ResizeObserver(entries => { for (const e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }}).observe(main);
      return;
    }
    document.body.appendChild(card); card.style.width = "880px";
  }
  insertCard();

  let previousTheme = { isDark: detectDarkMode(), bg: theme.bg, border: theme.border };

  function applyTheme() {
    card.style.background = theme.bg; card.style.border = `1px solid ${theme.border}`; card.style.color = theme.text;
    headerDivider.style.background = theme.borderLight;
    info.style.color = theme.muted;
    frictionSection.style.borderTop = `1px solid ${theme.borderLight}`;
    frictionScrollBox.style.border = `1px solid ${theme.borderLight}`;
    timelineSelect.style.background = theme.selectBg; timelineSelect.style.color = theme.selectText; timelineSelect.style.borderColor = theme.selectBorder;
    modeSelect.style.background = theme.selectBg; modeSelect.style.color = theme.selectText; modeSelect.style.borderColor = theme.selectBorder;
    customDateRow.style.background = theme.bg; customDateRow.style.borderColor = theme.border;
    dateFromLabel.style.color = theme.text; dateToLabel.style.color = theme.text;
    const cs = detectDarkMode() ? "dark" : "light";
    startDateInput.style.colorScheme = cs; endDateInput.style.colorScheme = cs;
    startDateInput.style.background = theme.inputBg; startDateInput.style.color = theme.inputText; startDateInput.style.borderColor = theme.inputBorder;
    endDateInput.style.background   = theme.inputBg; endDateInput.style.color   = theme.inputText; endDateInput.style.borderColor   = theme.inputBorder;
    applyDateBtn.style.background = theme.activeButtonBg; applyDateBtn.style.color = theme.activeButtonText;
    cancelDateBtn.style.background = theme.buttonBg; cancelDateBtn.style.color = theme.buttonText; cancelDateBtn.style.borderColor = theme.buttonBorder;
    headerTitle.style.color = theme.muted;
    applyToggleVisuals();
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k], active = k === currentCategory;
      b.style.background = active ? theme.activeButtonBg : theme.buttonBg;
      b.style.color      = active ? theme.activeButtonText : theme.buttonText;
      b.style.border     = active ? `1px solid ${theme.activeButtonBg}` : `1px solid ${theme.buttonBorder}`;
    });
    updateFrictionToggleBtns();
  }

  function updateTheme() {
    const newIsDark = detectDarkMode(), newTheme = createTheme();
    if (newIsDark !== previousTheme.isDark || newTheme.bg !== previousTheme.bg || newTheme.border !== previousTheme.border) {
      theme = newTheme;
      previousTheme = { isDark: newIsDark, bg: theme.bg, border: theme.border };
      applyTheme();
      if (currentCategory && lastModeData) { renderTableForCategory(lastModeData, currentCategory); renderFrictionPanels(lastModeData, currentCategory); }
    }
  }

  setTimeout(applyTheme, 100);
  const themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  ['.info','.roundbox','#pageContent'].map(sel => document.querySelector(sel)).filter(Boolean)
    .forEach(el => themeObserver.observe(el, { attributes: true, attributeFilter: ['style','class'] }));
  const _themeInterval = setInterval(updateTheme, 500); void _themeInterval;
  window.addEventListener('focus', updateTheme);

  function median(arr) {
    if (!arr || !arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  }

  function totalErrors(p) { return (p.wa||0) + (p.tle||0) + (p.rte||0) + (p.mle||0) + (p.other||0); }

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
      rawSubmissions = d.result || [];
      ratedContestSet = await fetchRatedSet(handle);
      return true;
    } catch(e) { info.textContent = "Could not connect to Codeforces. Please check your connection and try again."; return false; }
  }

  function recalcForMode(mode, timelineMonths, categoryFilter) {
    const now = Math.floor(Date.now() / 1000);
    let cutoffTime = 0, endTime = now;

    if (typeof timelineMonths === 'object' && timelineMonths.type === 'custom') {
      if (timelineMonths.start && timelineMonths.end) {
        cutoffTime = new Date(timelineMonths.start).getTime() / 1000;
        endTime    = new Date(timelineMonths.end).getTime() / 1000 + 86399;
      }
    } else if (timelineMonths !== "all") {
      cutoffTime = now - (parseInt(timelineMonths) * 30 * 24 * 60 * 60);
    }

    const filteredSubmissions = (cutoffTime === 0 && endTime === now)
      ? rawSubmissions
      : rawSubmissions.filter(s => s.creationTimeSeconds && s.creationTimeSeconds >= cutoffTime && s.creationTimeSeconds <= endTime);

    const inWindowSet = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId, c = contestMap[cid];
      if (!c || typeof c.startTimeSeconds !== "number" || typeof c.durationSeconds !== "number") return;
      const st = s.creationTimeSeconds, start = c.startTimeSeconds, end = start + c.durationSeconds;
      if (typeof st === "number" && st >= start && st <= end) inWindowSet.add(cid);
    });

    let participated = new Set();
    if (mode === "total")       participated = new Set([...ratedContestSet, ...inWindowSet]);
    else if (mode === "rated")  participated = new Set([...ratedContestSet]);
    else inWindowSet.forEach(cid => { if (!ratedContestSet.has(cid)) participated.add(cid); });

    if (cutoffTime !== 0 || endTime !== now) {
      const tmp = new Set();
      participated.forEach(cid => {
        const c = contestMap[cid];
        if (c && c.startTimeSeconds >= cutoffTime && c.startTimeSeconds <= endTime) tmp.add(cid);
      });
      participated = tmp;
    }

    const categoryIndexTimes = {}, categoryIndexAttempts = {}, categoryIndexSolved = {};
    const categoryTopicAttempts = {}, categoryTopicSolved = {};
    const categoryContestCount = {};
    const categoryTopicWAProblems = {};
    const categoryRawWAMap = {};

    CATEGORIES.forEach(c => {
      categoryIndexTimes[c] = {}; categoryIndexAttempts[c] = {}; categoryIndexSolved[c] = {};
      categoryTopicAttempts[c] = {}; categoryTopicSolved[c] = {};
      categoryContestCount[c] = new Set();
      categoryTopicWAProblems[c] = {};
      categoryRawWAMap[c] = new Map();
    });

    const globalTopicWAProblems = {};
    const globalAttempts = {}, globalSolved = {};
    const practiceAttempts = {}, practiceSolved = {};
    const globalRawWAMap   = new Map();
    const practiceRawWAMap = new Map();

    const unofficialContests = new Set();
    participated.forEach(cid => { if (!ratedContestSet.has(cid)) unofficialContests.add(cid); });

    const everAC = new Set();
    rawSubmissions.forEach(s => { if (s.verdict === "OK" && s.problem) everAC.add(s.problem.contestId + "-" + s.problem.index); });

    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds, st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;

      const idx = s.problem.index, pid = cid + "-" + idx;
      const tags = s.problem.tags || [];
      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") cat = decideUserDivisionForContest(cid, contest, unofficialContests.has(cid));
      if (!categoryIndexAttempts[cat]) cat = "Other";
      if (!categoryIndexAttempts[cat]) return;

      const info_ = { pid, name: s.problem.name||idx, contestId: cid, contestName: contest.name||("Contest "+cid), index: idx, rating: s.problem.rating||null, tags: tags.slice(), solved: everAC.has(pid), wa:0, tle:0, rte:0, mle:0, other:0 };
      tags.forEach(t => {
        if (!categoryTopicWAProblems[cat][t]) categoryTopicWAProblems[cat][t] = new Map();
        if (!categoryTopicWAProblems[cat][t].has(pid)) categoryTopicWAProblems[cat][t].set(pid, { ...info_ });
        categoryTopicWAProblems[cat][t].get(pid).solved = everAC.has(pid);
      });
      if (!categoryRawWAMap[cat].has(pid)) categoryRawWAMap[cat].set(pid, { ...info_ });
      categoryRawWAMap[cat].get(pid).solved = everAC.has(pid);
    });

    const firstACSet = new Set();
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds, st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;

      const idx = s.problem.index, pid = cid + "-" + idx;
      const tags = s.problem.tags || [];
      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") cat = decideUserDivisionForContest(cid, contest, unofficialContests.has(cid));
      if (!categoryIndexAttempts[cat]) {
        cat = "Other";
        if (!categoryIndexAttempts[cat]) {
          categoryIndexAttempts[cat]={}; categoryIndexTimes[cat]={}; categoryIndexSolved[cat]={};
          categoryTopicAttempts[cat]={}; categoryTopicSolved[cat]={};
          categoryTopicWAProblems[cat]={}; categoryRawWAMap[cat]=new Map(); categoryContestCount[cat]=new Set();
        }
      }

      categoryContestCount[cat].add(cid);
      categoryIndexAttempts[cat][idx] = (categoryIndexAttempts[cat][idx]||0) + 1;
      categoryIndexTimes[cat][idx] = categoryIndexTimes[cat][idx] || [];

      if (s.verdict !== "OK") {
        tags.forEach(t => { categoryTopicAttempts[cat][t] = (categoryTopicAttempts[cat][t]||0)+1; });
        return;
      }
      tags.forEach(t => { categoryTopicSolved[cat][t] = (categoryTopicSolved[cat][t]||0)+1; });
      if (firstACSet.has(pid)) return;
      firstACSet.add(pid);
      categoryIndexSolved[cat][idx] = (categoryIndexSolved[cat][idx]||0)+1;
      const timeMin = (st - start) / 60, maxAllowed = Math.max(1, Math.round(contest.durationSeconds / 60));
      if (timeMin >= 0 && timeMin <= maxAllowed) categoryIndexTimes[cat][idx].push(timeMin);
    });

    filteredSubmissions.forEach(s => {
      if (!s.problem || s.verdict === "OK") return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds, st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      const idx = s.problem.index, pid = cid + "-" + idx;
      const tags = s.problem.tags || [];
      const vtype = s.verdict === "WRONG_ANSWER" ? "wa" : s.verdict === "TIME_LIMIT_EXCEEDED" ? "tle" : s.verdict === "RUNTIME_ERROR" ? "rte" : s.verdict === "MEMORY_LIMIT_EXCEEDED" ? "mle" : "other";
      let cat = classifyContest(contestMap[cid]);
      if (cat === "Div1+Div2") cat = decideUserDivisionForContest(cid, contestMap[cid], unofficialContests.has(cid));
      if (!categoryTopicWAProblems[cat]) cat = "Other";
      if (!categoryTopicWAProblems[cat]) return;
      tags.forEach(t => { if (categoryTopicWAProblems[cat][t]?.has(pid)) categoryTopicWAProblems[cat][t].get(pid)[vtype]++; });
      if (categoryRawWAMap[cat]?.has(pid)) categoryRawWAMap[cat].get(pid)[vtype]++;
    });

    const practiceTopicWAProblems = {};

    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId, contest = contestMap[cid];
      if (!contest) return;
      const tags = s.problem.tags || [];
      const idx = s.problem.index, pid = cid + "-" + idx;
      const contestName = contest.name || ("Contest " + cid);
      const start = contest.startTimeSeconds, dur = contest.durationSeconds, st = s.creationTimeSeconds;
      const duringContest = typeof start === "number" && typeof dur === "number" && typeof st === "number" && st >= start && st <= start + dur;
      const mkInfo = () => ({ pid, name: s.problem.name||idx, contestId: cid, contestName, index: idx, rating: s.problem.rating||null, tags: tags.slice(), solved: everAC.has(pid), wa:0, tle:0, rte:0, mle:0, other:0 });

      if (!globalRawWAMap.has(pid)) globalRawWAMap.set(pid, mkInfo());
      globalRawWAMap.get(pid).solved = everAC.has(pid);
      if (!duringContest) {
        if (!practiceRawWAMap.has(pid)) practiceRawWAMap.set(pid, mkInfo());
        practiceRawWAMap.get(pid).solved = everAC.has(pid);
      }

      if (s.verdict !== "OK") {
        const vtype = s.verdict === "WRONG_ANSWER" ? "wa" : s.verdict === "TIME_LIMIT_EXCEEDED" ? "tle" : s.verdict === "RUNTIME_ERROR" ? "rte" : s.verdict === "MEMORY_LIMIT_EXCEEDED" ? "mle" : "other";

        tags.forEach(t => {
          if (!globalTopicWAProblems[t]) globalTopicWAProblems[t] = new Map();
          if (!globalTopicWAProblems[t].has(pid)) globalTopicWAProblems[t].set(pid, mkInfo());
          globalTopicWAProblems[t].get(pid).solved = everAC.has(pid);
          globalTopicWAProblems[t].get(pid)[vtype]++;
        });
        globalRawWAMap.get(pid)[vtype]++;

        if (!duringContest) {
          tags.forEach(t => {
            if (!practiceTopicWAProblems[t]) practiceTopicWAProblems[t] = new Map();
            if (!practiceTopicWAProblems[t].has(pid)) practiceTopicWAProblems[t].set(pid, mkInfo());
            practiceTopicWAProblems[t].get(pid).solved = everAC.has(pid);
            practiceTopicWAProblems[t].get(pid)[vtype]++;
          });
          practiceRawWAMap.get(pid)[vtype]++;
        }

        tags.forEach(t => { globalAttempts[t] = (globalAttempts[t]||0)+1; });
        if (!duringContest) tags.forEach(t => { practiceAttempts[t] = (practiceAttempts[t]||0)+1; });
        return;
      }

      tags.forEach(t => { globalSolved[t] = (globalSolved[t]||0)+1; });
      if (!duringContest) tags.forEach(t => { practiceSolved[t] = (practiceSolved[t]||0)+1; });
    });

    function buildTopicFriction(attMap, waMap) {
      return Object.keys(attMap).map(t => {
        // Only include problems that actually have at least one error
        const waProblems = waMap[t]
          ? Array.from(waMap[t].values()).filter(p => totalErrors(p) > 0).sort((x,y) => totalErrors(y)-totalErrors(x))
          : [];
        // WA% = total errors / (total errors + number of those problems that were eventually solved)
        const totalWrong = waProblems.reduce((s, p) => s + totalErrors(p), 0);
        const totalAC    = waProblems.filter(p => p.solved).length;
        const waRatio    = (totalWrong + totalAC) > 0 ? Math.round((totalWrong / (totalWrong + totalAC)) * 100) : 0;
        const attempts   = attMap[t] || 0;
        return { topic: t, waRatio, attempts, waProblems };
      }).filter(x => x.attempts >= 1).sort((a, b) => b.waRatio - a.waRatio);
    }

    const contestFriction  = buildTopicFriction(categoryTopicAttempts[categoryFilter]||{}, categoryTopicWAProblems[categoryFilter]||{});
    const globalFriction   = buildTopicFriction(globalAttempts, globalTopicWAProblems);
    const practiceFriction = buildTopicFriction(practiceAttempts, practiceTopicWAProblems);

    const categoryRawProblems = {};
    CATEGORIES.forEach(c => {
      categoryRawProblems[c] = Array.from((categoryRawWAMap[c]||new Map()).values()).filter(p => totalErrors(p) > 0);
    });
    const globalRawProblems   = Array.from(globalRawWAMap.values()).filter(p => totalErrors(p) > 0);
    const practiceRawProblems = Array.from(practiceRawWAMap.values()).filter(p => totalErrors(p) > 0);

    return {
      categoryIndexTimes, categoryIndexAttempts, categoryIndexSolved,
      contestFriction, globalFriction, practiceFriction,
      categoryRawProblems, globalRawProblems, practiceRawProblems,
      participatedCount: participated.size,
      categoryContestCount: Object.fromEntries(Object.entries(categoryContestCount).map(([c, s]) => [c, s.size]))
    };
  }

  const MAX_VISIBLE_TAGS = 3;
  function buildTagChips(tags, isDark, muted) {
    const tw = document.createElement("span");
    tw.style.cssText = [
      "display:flex", "gap:3px", "flex-wrap:nowrap",
      "flex-shrink:0", "align-items:center"
    ].join(";");
    const visible = tags.slice(0, MAX_VISIBLE_TAGS);
    const hidden  = tags.length - visible.length;
    visible.forEach(tag => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      chip.style.cssText = [
        `background:${isDark ? "#2a3a4a" : "#e8f0fe"}`,
        `color:${isDark ? "#8ab4f8" : "#1a56c4"}`,
        "font-size:10px", "border-radius:3px", "padding:1px 5px",
        "white-space:nowrap", "flex-shrink:0"
      ].join(";");
      tw.appendChild(chip);
    });
    if (hidden > 0) {
      const more = document.createElement("span");
      more.textContent = `+${hidden}`;
      more.title = tags.slice(MAX_VISIBLE_TAGS).join(", ");
      more.style.cssText = [
        `background:${isDark ? "#3a3a3a" : "#eee"}`,
        `color:${muted}`,
        "font-size:10px", "border-radius:3px", "padding:1px 5px",
        "white-space:nowrap", "flex-shrink:0", "cursor:default"
      ].join(";");
      tw.appendChild(more);
    }
    return tw;
  }

  function makeWAProblemDropdown(waProblems, shouldHideAC, minAttempts) {
    const dropdown = document.createElement("div");
    dropdown.style.cssText = [
      `background:${theme.dropdownBg}`, `border:1px solid ${theme.dropdownBorder}`,
      "border-radius:5px", "margin:4px 8px 6px 8px", "overflow:hidden",
      "animation:cfpm-slide-down 0.18s ease"
    ].join(";");

    if (!document.getElementById("cfpm-anim")) {
      const style = document.createElement("style"); style.id = "cfpm-anim";
      style.textContent = `@keyframes cfpm-slide-down{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`;
      document.head.appendChild(style);
    }

    const sorted = (waProblems||[])
      .filter(p => totalErrors(p) >= minAttempts)
      .filter(p => !shouldHideAC || !p.solved)
      .slice().sort((a,b) => totalErrors(b)-totalErrors(a));

    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.style.cssText = `padding:8px 12px;color:${theme.emptyText};font-style:italic;font-size:12px;`;
      empty.textContent = shouldHideAC ? "All problems have been AC'd." : "No problems recorded.";
      dropdown.appendChild(empty); return dropdown;
    }

    const isDark = detectDarkMode();
    const tleBg = isDark?"#2a2000":"#fff8e1", tleFg = isDark?"#ffd54f":"#e65100";
    const rteBg = isDark?"#1a1a2e":"#ede7f6", rteFg = isDark?"#9fa8da":"#4527a0";
    const mleBg = isDark?"#002828":"#e0f2f1", mleFg = isDark?"#4db6ac":"#00695c";
    const errBg = isDark?"#2a2a2a":"#f5f5f5";

    sorted.forEach((p, i) => {
      const row = document.createElement("div");
      row.style.cssText = [
        "display:flex", "align-items:center", "gap:6px", "padding:6px 12px",
        i > 0 ? `border-top:1px solid ${theme.dropdownBorder}` : "",
        "transition:background 0.12s", "cursor:pointer", "min-width:0"
      ].join(";");
      row.onmouseenter = () => row.style.background = theme.problemRowHover;
      row.onmouseleave = () => row.style.background = "";

      const link = document.createElement("a");
      link.href = `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
      link.target = "_blank"; link.rel = "noopener";
      link.style.cssText = [
        `color:${theme.problemLink}`, "text-decoration:none", "font-size:12px",
        "font-weight:600", "flex:0 0 auto", "min-width:110px", "max-width:180px",
        "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap"
      ].join(";");
      link.textContent = `${p.index}. ${p.name}`; link.title = p.name;
      link.onmouseenter = () => link.style.textDecoration = "underline";
      link.onmouseleave = () => link.style.textDecoration = "none";
      link.addEventListener("click", e => e.stopPropagation());
      row.appendChild(link);

      const spacer = document.createElement("span");
      spacer.style.cssText = "flex:1 1 0;min-width:8px;";
      row.appendChild(spacer);

      if (p.tags && p.tags.length > 0) {
        row.appendChild(buildTagChips(p.tags, isDark, theme.muted));
      }

      const cs = document.createElement("span");
      cs.style.cssText = `color:${theme.muted};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1;min-width:0;max-width:180px;`;
      cs.textContent = p.contestName; cs.title = p.contestName;
      row.appendChild(cs);

      if (p.rating) {
        const rb = document.createElement("span");
        rb.style.cssText = `font-size:11px;color:${theme.muted};white-space:nowrap;flex-shrink:0;`;
        rb.textContent = "★" + p.rating; row.appendChild(rb);
      }

      [
        { key:"wa",    label:"WA",  bg:theme.waBadge,  fg:theme.waBadgeText },
        { key:"tle",   label:"TLE", bg:tleBg,           fg:tleFg },
        { key:"rte",   label:"RTE", bg:rteBg,           fg:rteFg },
        { key:"mle",   label:"MLE", bg:mleBg,           fg:mleFg },
        { key:"other", label:"ERR", bg:errBg,           fg:theme.muted },
      ].forEach(({ key, label, bg, fg }) => {
        const cnt = p[key]||0; if (!cnt) return;
        const badge = document.createElement("span");
        badge.style.cssText = [
          `background:${bg}`, `color:${fg}`, "font-size:11px", "font-weight:700",
          "border-radius:4px", "padding:1px 6px", "white-space:nowrap", "flex-shrink:0"
        ].join(";");
        badge.textContent = `${label} ×${cnt}`; row.appendChild(badge);
      });

      const sb = document.createElement("span");
      if (p.solved) {
        sb.style.cssText = `background:${theme.solvedBadge};color:${theme.solvedBadgeText};font-size:11px;font-weight:700;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;`;
        sb.textContent = "✓ AC'd";
      } else {
        sb.style.cssText = `background:${theme.waBadge};color:${theme.waBadgeText};font-size:11px;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;opacity:0.75;`;
        sb.textContent = "Unsolved";
      }
      row.appendChild(sb);
      row.addEventListener("click", () => window.open(`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`, "_blank"));
      dropdown.appendChild(row);
    });
    return dropdown;
  }

  function renderFrictionPanels(modeData, cat) {
    frictionScrollBox.innerHTML = "";

    const contestList  = modeData.contestFriction  || [];
    const globalList   = modeData.globalFriction   || [];
    const practiceList = modeData.practiceFriction || [];

    let activeTab = frictionActiveTab;
    let sortMode = defaultSortMode;
    let localHideAC = hideAC, localMinAttempts = minAttemptsGlobal;
    let localPracticeOnly = false;

    function waColor(r) { return r < 40 ? "#27ae60" : r < 70 ? "#e67e22" : "#e74c3c"; }

    const topBar = document.createElement("div");
    topBar.style.cssText = [
      "display:flex", "align-items:stretch", "justify-content:space-between",
      `border-bottom:1px solid ${theme.borderLight}`, "min-height:38px"
    ].join(";");

    const tabsWrap = document.createElement("div");
    tabsWrap.style.cssText = "display:flex;align-items:stretch;";

    function countProblems(src) {
      return src.filter(p => totalErrors(p) >= localMinAttempts && (!localHideAC || !p.solved)).length;
    }
    function countTopics(items) {
      return items.filter(x => (x.waProblems||[]).some(p => totalErrors(p) >= localMinAttempts && (!localHideAC || !p.solved))).length;
    }

    function getCatCount()     { return frictionView === "problems" ? countProblems(modeData.categoryRawProblems?.[cat] || []) : countTopics(contestList); }
    function getOverallCount() {
      if (frictionView === "problems") return countProblems(localPracticeOnly ? (modeData.practiceRawProblems||[]) : (modeData.globalRawProblems||[]));
      return countTopics(localPracticeOnly ? practiceList : globalList);
    }

    function makeTab(labelText, key) {
      const t = document.createElement("button"); t.dataset.key = key;
      const labelSpan = document.createElement("span"); labelSpan.textContent = labelText;
      const badge = document.createElement("span");
      badge.style.cssText = [
        "margin-left:5px", "font-size:10px", "font-weight:700", "border-radius:10px",
        "padding:1px 6px", `background:${theme.borderLight}`, `color:${theme.muted}`
      ].join(";");
      t.appendChild(labelSpan); t.appendChild(badge);
      t.style.cssText = [
        "display:flex", "align-items:center", "padding:8px 16px", "font-size:13px",
        "font-weight:600", "border:none", "border-bottom:2px solid transparent",
        "background:transparent", "cursor:pointer", `color:${theme.muted}`,
        "transition:color 0.15s,border-color 0.15s", "margin-bottom:-1px"
      ].join(";");
      t.addEventListener("click", () => {
        activeTab = key; frictionActiveTab = key;
        updateTabStyles(); renderTabContent();
      });
      return { el: t, badge };
    }

    const { el: tabCatEl, badge: tabCatBadge }         = makeTab(cat, "category");
    const { el: tabOverallEl, badge: tabOverallBadge } = makeTab("Overall", "overall");
    tabsWrap.appendChild(tabCatEl); tabsWrap.appendChild(tabOverallEl);

    function updateTabBadges() {
      tabCatBadge.textContent     = getCatCount();
      tabOverallBadge.textContent = getOverallCount();
    }
    updateTabBadges();

    function updateTabStyles() {
      [tabCatEl, tabOverallEl].forEach(t => {
        const active = t.dataset.key === activeTab;
        t.style.color       = active ? theme.text : theme.muted;
        t.style.borderColor = active ? theme.activeButtonBg : "transparent";
      });
    }
    updateTabStyles();

    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display:flex;align-items:center;gap:8px;padding:0 10px;flex-shrink:0;";

    const sortToggle = document.createElement("div");
    sortToggle.style.cssText = ["display:flex","border-radius:6px","overflow:hidden",`border:1px solid ${theme.buttonBorder}`].join(";");

    const sortOpts = frictionView === "problems"
      ? [{ label: "Errors", mode: "errors" }, { label: "Rating", mode: "rating" }]
      : [{ label: "WA%",    mode: "wa"     }, { label: "Attempts", mode: "attempts" }];

    if (frictionView === "problems" && (sortMode === "wa" || sortMode === "attempts")) sortMode = "errors";
    if (frictionView === "topics"   && (sortMode === "errors" || sortMode === "rating")) sortMode = "wa";

    const sortBtns = sortOpts.map(({ label, mode }) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = [
        "padding:5px 12px", "font-size:12px", "font-weight:600", "border:none",
        "cursor:pointer", "transition:background 0.15s,color 0.15s", "white-space:nowrap"
      ].join(";");
      b.addEventListener("click", () => { sortMode = mode; defaultSortMode = mode; updateSortStyles(); renderTabContent(); autoSave(); });
      sortToggle.appendChild(b);
      return { b, mode };
    });

    function updateSortStyles() {
      sortBtns.forEach(({ b, mode }) => {
        b.style.background = sortMode === mode ? theme.activeButtonBg : theme.buttonBg;
        b.style.color      = sortMode === mode ? theme.activeButtonText : theme.buttonText;
      });
    }
    updateSortStyles();

    const minWAWrap = document.createElement("div");
    minWAWrap.style.cssText = "display:flex;align-items:center;gap:4px;flex-shrink:0;";
    const minWALabel = document.createElement("span");
    minWALabel.textContent = "Min WA:";
    minWALabel.style.cssText = `font-size:12px;font-weight:600;color:${theme.muted};white-space:nowrap;`;
    const minWAInput = document.createElement("input");
    minWAInput.type = "number"; minWAInput.min = "1"; minWAInput.max = "99"; minWAInput.value = String(localMinAttempts);
    minWAInput.style.cssText = [
      "width:44px", "padding:4px 6px", "border-radius:5px",
      `border:1px solid ${theme.inputBorder}`, `background:${theme.inputBg}`,
      `color:${theme.inputText}`, "font-size:12px", "font-weight:600",
      "text-align:center", "-moz-appearance:textfield"
    ].join(";");
    minWAInput.addEventListener("input", () => {
      const v = parseInt(minWAInput.value);
      if (v >= 1) { localMinAttempts = v; minAttemptsGlobal = v; updateTabBadges(); renderTabContent(); autoSave(); }
    });
    minWAWrap.appendChild(minWALabel); minWAWrap.appendChild(minWAInput);

    const hideACBtn = document.createElement("button");
    hideACBtn.style.cssText = [
      "padding:5px 12px", "font-size:12px", "font-weight:600", "border-radius:6px",
      `border:1px solid ${theme.buttonBorder}`, "cursor:pointer",
      "transition:background 0.15s,color 0.15s,border-color 0.15s", "white-space:nowrap"
    ].join(";");
    function updateHideACBtn() {
      hideACBtn.textContent       = localHideAC ? "Show AC'd" : "Hide AC'd";
      hideACBtn.style.background  = localHideAC ? theme.activeButtonBg : theme.buttonBg;
      hideACBtn.style.color       = localHideAC ? theme.activeButtonText : theme.buttonText;
      hideACBtn.style.borderColor = localHideAC ? theme.activeButtonBg : theme.buttonBorder;
    }
    updateHideACBtn();
    hideACBtn.addEventListener("click", () => {
      localHideAC = !localHideAC; hideAC = localHideAC;
      updateHideACBtn(); updateTabBadges(); renderTabContent(); autoSave();
    });

    const practiceBtn = document.createElement("button");
    practiceBtn.style.cssText = [
      "padding:5px 12px", "font-size:12px", "font-weight:600", "border-radius:6px",
      `border:1px solid ${theme.buttonBorder}`, "cursor:pointer",
      "transition:background 0.15s,color 0.15s,border-color 0.15s",
      "white-space:nowrap", "display:none"
    ].join(";");
    function updatePracticeBtn() {
      practiceBtn.textContent       = localPracticeOnly ? "All" : "Practice Only";
      practiceBtn.style.background  = localPracticeOnly ? theme.activeButtonBg : theme.buttonBg;
      practiceBtn.style.color       = localPracticeOnly ? theme.activeButtonText : theme.buttonText;
      practiceBtn.style.borderColor = localPracticeOnly ? theme.activeButtonBg : theme.buttonBorder;
    }
    updatePracticeBtn();
    practiceBtn.addEventListener("click", () => {
      localPracticeOnly = !localPracticeOnly;
      updatePracticeBtn(); updateTabBadges(); renderTabContent();
    });

    rightBtns.appendChild(sortToggle);
    rightBtns.appendChild(minWAWrap);
    rightBtns.appendChild(hideACBtn);
    rightBtns.appendChild(practiceBtn);

    topBar.appendChild(tabsWrap);
    topBar.appendChild(rightBtns);

    const listArea = document.createElement("div");
    listArea.style.cssText = "flex:1;overflow-y:auto;";

    function makeTopicList(items) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;";

      const filtered = items.filter(x =>
        (x.waProblems||[]).some(p => totalErrors(p) >= localMinAttempts && (!localHideAC || !p.solved))
      );
      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:16px 12px;color:${theme.emptyText};font-style:italic;font-size:13px;text-align:center;`;
        empty.textContent = "No data"; wrap.appendChild(empty); return wrap;
      }

      const sorted = filtered.slice().sort((a, b) =>
        sortMode === "attempts" ? b.attempts - a.attempts : b.waRatio - a.waRatio
      );
      let openDropdown = null, openRowEl = null;
      const chevronMap = new WeakMap();

      sorted.forEach(t => {
        const rowWrap = document.createElement("div");
        const row = document.createElement("div");
        row.style.cssText = [
          "display:flex", "align-items:center", "gap:12px", "padding:9px 16px",
          `border-bottom:1px solid ${theme.borderLighter}`,
          "cursor:pointer", "transition:background 0.1s", "border-left:3px solid transparent"
        ].join(";");
        const c = waColor(t.waRatio);
        row.style.borderLeftColor = c;
        row.onmouseenter = () => { if (openRowEl !== row) row.style.background = theme.problemRowHover; };
        row.onmouseleave = () => { if (openRowEl !== row) row.style.background = ""; };

        const chevron = document.createElement("span");
        chevron.textContent = "▶";
        chevron.style.cssText = `font-size:8px;color:${theme.muted};transition:transform 0.18s;flex-shrink:0;`;

        const name = document.createElement("span");
        name.style.cssText = `font-size:13px;font-weight:500;color:${theme.weakTopicName};flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        name.textContent = t.topic;

        const attSpan = document.createElement("span");
        attSpan.style.cssText = `font-size:12px;color:${theme.muted};white-space:nowrap;flex-shrink:0;`;
        const filteredProblems = (t.waProblems||[]).filter(p => totalErrors(p) >= localMinAttempts);
        const visibleProblems  = filteredProblems.filter(p => !localHideAC || !p.solved);
        const visibleAttempts  = visibleProblems.reduce((sum, p) => sum + totalErrors(p), 0);
        attSpan.appendChild(document.createTextNode(`${visibleAttempts} attempt${visibleAttempts !== 1 ? "s" : ""}`));
        const unsolved = visibleProblems.filter(p => !p.solved).length;
        if (unsolved > 0) {
          attSpan.appendChild(document.createTextNode(" · "));
          const b = document.createElement("span");
          b.style.cssText = `color:${theme.waBadgeText};font-weight:600;`;
          b.textContent = `${unsolved} unsolved`; attSpan.appendChild(b);
        } else if (localHideAC) {
          attSpan.appendChild(document.createTextNode(" · "));
          const b = document.createElement("span");
          b.style.cssText = `color:${theme.solvedBadgeText};font-weight:600;`;
          b.textContent = "all AC'd"; attSpan.appendChild(b);
        }

        const pct = document.createElement("span");
        pct.style.cssText = [
          `color:${c}`, "font-size:13px", "font-weight:700",
          "white-space:nowrap", "flex-shrink:0", "min-width:42px", "text-align:right"
        ].join(";");
        pct.textContent = `${t.waRatio}%`;

        row.appendChild(chevron); row.appendChild(name); row.appendChild(attSpan); row.appendChild(pct);
        rowWrap.appendChild(row); wrap.appendChild(rowWrap);

        row.addEventListener("click", () => {
          if (openDropdown && openDropdown.parentNode === rowWrap) {
            openDropdown.remove(); openDropdown = null;
            chevron.style.transform = ""; row.style.background = "";
            row.style.borderLeftColor = c; openRowEl = null; return;
          }
          if (openDropdown) {
            openDropdown.remove();
            if (openRowEl) { openRowEl.style.background = ""; const oc = chevronMap.get(openRowEl); if (oc) oc.style.transform = ""; }
          }
          const dd = makeWAProblemDropdown(t.waProblems||[], localHideAC, localMinAttempts);
          rowWrap.appendChild(dd);
          openDropdown = dd; openRowEl = row; chevronMap.set(row, chevron);
          chevron.style.transform = "rotate(90deg)"; row.style.background = theme.problemRowHover;
        });
      });
      return wrap;
    }

    function makeProblemList(problems) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;";

      const filtered = problems.filter(p =>
        totalErrors(p) >= localMinAttempts && (!localHideAC || !p.solved)
      );
      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:16px 12px;color:${theme.emptyText};font-style:italic;font-size:13px;text-align:center;`;
        empty.textContent = "No problems"; wrap.appendChild(empty); return wrap;
      }

      const sorted = filtered.slice().sort((a, b) =>
        sortMode === "rating" ? (b.rating||0) - (a.rating||0) : totalErrors(b) - totalErrors(a)
      );

      const isDark = detectDarkMode();
      const tleBg = isDark?"#2a2000":"#fff8e1", tleFg = isDark?"#ffd54f":"#e65100";
      const rteBg = isDark?"#1a1a2e":"#ede7f6", rteFg = isDark?"#9fa8da":"#4527a0";
      const mleBg = isDark?"#002828":"#e0f2f1", mleFg = isDark?"#4db6ac":"#00695c";
      const errBg = isDark?"#2a2a2a":"#f5f5f5";
      const maxErr = totalErrors(sorted[0]) || 1;

      sorted.forEach((p, i) => {
        const row = document.createElement("div");
        row.style.cssText = [
          "display:flex", "align-items:center", "gap:6px", "padding:7px 14px",
          i > 0 ? `border-top:1px solid ${theme.borderLighter}` : "",
          "cursor:pointer", "transition:background 0.1s", "min-width:0"
        ].join(";");
        row.onmouseenter = () => row.style.background = theme.problemRowHover;
        row.onmouseleave = () => row.style.background = "";

        const intensity = totalErrors(p) / maxErr;
        row.style.borderLeft = `3px solid ${intensity > 0.66 ? "#e74c3c" : intensity > 0.33 ? "#e67e22" : "#27ae60"}`;

        const link = document.createElement("a");
        link.href = `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
        link.target = "_blank"; link.rel = "noopener";
        link.style.cssText = [
          `color:${theme.problemLink}`, "text-decoration:none", "font-size:12px",
          "font-weight:600", "flex:0 0 auto", "min-width:110px", "max-width:180px",
          "overflow:hidden", "text-overflow:ellipsis", "white-space:nowrap"
        ].join(";");
        link.textContent = `${p.index}. ${p.name}`; link.title = p.name;
        link.onmouseenter = () => link.style.textDecoration = "underline";
        link.onmouseleave = () => link.style.textDecoration = "none";
        link.addEventListener("click", e => e.stopPropagation());
        row.appendChild(link);

        const fill = document.createElement("span");
        fill.style.cssText = "flex:1 1 0;min-width:8px;";
        row.appendChild(fill);

        if (p.tags && p.tags.length) {
          row.appendChild(buildTagChips(p.tags, isDark, theme.muted));
        }

        if (p.rating) {
          const rb = document.createElement("span");
          rb.style.cssText = `font-size:11px;color:${theme.muted};white-space:nowrap;flex-shrink:0;`;
          rb.textContent = "★" + p.rating; row.appendChild(rb);
        }

        [
          { key:"wa",    label:"WA",  bg:theme.waBadge,  fg:theme.waBadgeText },
          { key:"tle",   label:"TLE", bg:tleBg,           fg:tleFg },
          { key:"rte",   label:"RTE", bg:rteBg,           fg:rteFg },
          { key:"mle",   label:"MLE", bg:mleBg,           fg:mleFg },
          { key:"other", label:"ERR", bg:errBg,           fg:theme.muted },
        ].forEach(({ key, label, bg, fg }) => {
          const cnt = p[key]||0; if (!cnt) return;
          const badge = document.createElement("span");
          badge.style.cssText = [
            `background:${bg}`, `color:${fg}`, "font-size:11px", "font-weight:700",
            "border-radius:4px", "padding:1px 6px", "white-space:nowrap", "flex-shrink:0"
          ].join(";");
          badge.textContent = `${label} ×${cnt}`; row.appendChild(badge);
        });

        const sb = document.createElement("span");
        if (p.solved) {
          sb.style.cssText = `background:${theme.solvedBadge};color:${theme.solvedBadgeText};font-size:11px;font-weight:700;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;`;
          sb.textContent = "✓ AC'd";
        } else {
          sb.style.cssText = `background:${theme.waBadge};color:${theme.waBadgeText};font-size:11px;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;opacity:0.75;`;
          sb.textContent = "Unsolved";
        }
        row.appendChild(sb);
        row.addEventListener("click", () => window.open(`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`, "_blank"));
        wrap.appendChild(row);
      });
      return wrap;
    }

    function renderTabContent() {
      listArea.innerHTML = "";
      if (activeTab === "category") {
        practiceBtn.style.display = "none";
        if (frictionView === "problems") {
          listArea.appendChild(makeProblemList(modeData.categoryRawProblems?.[cat] || []));
        } else {
          listArea.appendChild(makeTopicList(contestList));
        }
      } else {
        practiceBtn.style.display = "";
        if (frictionView === "problems") {
          listArea.appendChild(makeProblemList(localPracticeOnly ? (modeData.practiceRawProblems||[]) : (modeData.globalRawProblems||[])));
        } else {
          listArea.appendChild(makeTopicList(localPracticeOnly ? practiceList : globalList));
        }
      }
    }
    renderTabContent();

    frictionScrollBox.style.cssText = [
      "height:265px", "overflow:hidden", `border:1px solid ${theme.borderLight}`,
      "border-radius:5px", "display:flex", "flex-direction:column", "padding:0"
    ].join(";");
    frictionScrollBox.appendChild(topBar);
    frictionScrollBox.appendChild(listArea);
  }

  function renderTableForCategory(modeData, cat) {
    const idxTimes    = modeData.categoryIndexTimes[cat]    || {};
    const idxAttempts = modeData.categoryIndexAttempts[cat] || {};
    const idxSolved   = modeData.categoryIndexSolved[cat]   || {};
    const allIdx = Array.from(new Set([...DEFAULT_INDICES, ...Object.keys(idxTimes), ...Object.keys(idxAttempts)])).sort((a, b) => a.localeCompare(b));

    table.innerHTML = "";
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.style.cssText = `text-align:left;padding:4px 14px;color:${theme.tableHeaderText};font-weight:600;border-bottom:2px solid ${theme.borderLight};`;
    corner.textContent = cat; headRow.appendChild(corner);
    allIdx.forEach(idx => {
      const th = document.createElement("th");
      th.style.cssText = `text-align:center;padding:4px 14px;font-weight:700;color:${theme.headingText};border-bottom:2px solid ${theme.borderLight};`;
      th.textContent = idx; headRow.appendChild(th);
    });
    table.appendChild(headRow);

    if (!allIdx.length) {
      const eRow = document.createElement("tr"), eTd = document.createElement("td");
      eTd.colSpan = 2; eTd.style.cssText = `padding:12px 8px;color:${theme.emptyText};font-style:italic;`;
      eTd.textContent = "No contest data for " + cat + "."; eRow.appendChild(eTd); table.appendChild(eRow); return;
    }

    function makeRow(label, getCellContent) {
      const row = document.createElement("tr");
      const lbl = document.createElement("td");
      lbl.style.cssText = `padding:7px 14px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;`;
      lbl.textContent = label; row.appendChild(lbl);
      allIdx.forEach(idx => row.appendChild(getCellContent(idx)));
      return row;
    }

    table.appendChild(makeRow("Avg min", idx => {
      const arr = idxTimes[idx]||[], td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:7px 14px;font-weight:700;color:#1652d6;";
      td.textContent = arr.length ? String(Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*10)/10) : "—"; return td;
    }));
    table.appendChild(makeRow("Med min", idx => {
      const arr = idxTimes[idx]||[], td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;font-weight:700;color:#6b4fa0;border-top:1px solid ${theme.borderLighter};`;
      const m = median(arr); td.textContent = m !== null ? String(Math.round(m*10)/10) : "—"; return td;
    }));
    table.appendChild(makeRow("Solved", idx => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;color:${theme.tableCellText};border-top:1px solid ${theme.borderLighter};`;
      td.textContent = String(idxSolved[idx]||0); return td;
    }));
    table.appendChild(makeRow("Attempts", idx => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;color:${theme.tableCellText};`;
      td.textContent = String(idxAttempts[idx]||0); return td;
    }));
    table.appendChild(makeRow("WA%", idx => {
      const att = idxAttempts[idx]||0, sol = idxSolved[idx]||0, td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;font-weight:700;border-top:1px solid ${theme.borderLighter};`;
      if (att > 0) {
        const r = Math.round(((att-sol)/att)*100);
        td.style.color = r < 40 ? "#27ae60" : r < 70 ? "#e67e22" : "#e74c3c";
        td.textContent = r + "%";
      } else { td.style.color = theme.tableCellText; td.textContent = "—"; }
      return td;
    }));
  }

  let currentCategory = DEFAULT_CATEGORY;
  let lastModeData    = null;

  function renderCategory(cat) {
    currentCategory = cat;
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k], active = k === cat;
      b.style.background = active ? theme.activeButtonBg : theme.buttonBg;
      b.style.color      = active ? theme.activeButtonText : theme.buttonText;
      b.style.border     = active ? `1px solid ${theme.activeButtonBg}` : `1px solid ${theme.buttonBorder}`;
    });

    const mode = modeSelect.value, timeline = savedTimeline;
    info.textContent = "Calculating stats…";

    const timelineValue = timeline === "custom"
      ? { type: "custom", start: startDateInput.value, end: endDateInput.value }
      : timeline;

    const modeData = recalcForMode(mode, timelineValue, cat);
    lastModeData = modeData;

    let timelineLabel;
    if (timeline === "custom" && startDateInput.value && endDateInput.value) {
      timelineLabel = `${startDateInput.value} to ${endDateInput.value}`;
    } else {
      const opt = Array.from(timelineSelect.options).find(o => o.value === timeline);
      timelineLabel = opt ? opt.text : "All Time";
    }

    const categoryCount = modeData.categoryContestCount[cat] || 0;
    info.textContent = `Participated in ${modeData.participatedCount} contests (${cat}: ${categoryCount}) · ${mode[0].toUpperCase()+mode.slice(1)} · ${timelineLabel}`;

    renderTableForCategory(modeData, cat);
    renderFrictionPanels(modeData, cat);
  }

  const handle = (window.location.pathname.split("/")[2] || "").trim();
  if (!handle || !/^[a-zA-Z0-9_\-\.]{2,24}$/.test(handle)) { info.textContent = "Could not detect a valid Codeforces username in the page URL."; return; }

  await fetchContests();
  const ok = await fetchAndStore(handle);
  if (!ok) return;

  renderCategory(DEFAULT_CATEGORY);

})();