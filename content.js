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
  const DEFAULT_CATEGORY  = _saved.category  || "Div4";
  const DEFAULT_MODE      = _saved.mode      || "total";
  const DEFAULT_TIMELINE  = _saved.timeline  || "all";
  const DEFAULT_FRICTION  = _saved.friction  || "topics";
  const DEFAULT_SORT_MODE = _saved.sortMode  || "wa";
  const DEFAULT_HIDE_AC   = _saved.hideAC    !== undefined ? _saved.hideAC : false;
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
      document.querySelector('.info'),
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

  function getBoxBackground() {
    const infoBox = document.querySelector('.info');
    if (infoBox) { const bg = window.getComputedStyle(infoBox).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; }
    const roundbox = document.querySelector('.roundbox');
    if (roundbox) { const bg = window.getComputedStyle(roundbox).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; }
    const pageContent = document.querySelector('#pageContent');
    if (pageContent) { const bg = window.getComputedStyle(pageContent).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; }
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
    return detectDarkMode() ? '#1a1a1a' : '#ffffff';
  }

  function getBoxBorderColor() {
    const roundbox = document.querySelector('.roundbox');
    if (roundbox) { const bc = window.getComputedStyle(roundbox).borderColor; if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') return bc; }
    const infoBox = document.querySelector('.info');
    if (infoBox) { const bc = window.getComputedStyle(infoBox).borderColor; if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') return bc; }
    const datatable = document.querySelector('.datatable');
    if (datatable) { const bc = window.getComputedStyle(datatable).borderColor; if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') return bc; }
    return detectDarkMode() ? '#444' : '#d4d4d4';
  }

  function createTheme() {
    const isDark = detectDarkMode();
    const boxBg = getBoxBackground();
    const boxBorderColor = getBoxBorderColor();
    return {
      bg: boxBg,
      text: isDark ? '#e8e8e8' : '#0b1220',
      border: boxBorderColor,
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
      weakTopicName: isDark ? '#ccc' : '#444',
      inputBg: isDark ? '#2a2a2a' : '#fff',
      inputText: isDark ? '#ddd' : '#333',
      inputBorder: isDark ? '#555' : '#ccc',
      dropdownBg: isDark ? '#252525' : '#fafafa',
      dropdownBorder: isDark ? '#3a3a3a' : '#e8e8e8',
      problemRowHover: isDark ? '#2e2e2e' : '#f0f4ff',
      problemLink: isDark ? '#7aabff' : '#1652d6',
      solvedBadge: isDark ? '#1a3a1a' : '#e8f5e9',
      solvedBadgeText: isDark ? '#4caf50' : '#2e7d32',
      waBadge: isDark ? '#3a1a1a' : '#fdecea',
      waBadgeText: isDark ? '#f48080' : '#c62828',
    };
  }

  let theme = createTheme();
  let frictionView   = DEFAULT_FRICTION;
  let defaultSortMode = DEFAULT_SORT_MODE;
  let hideAC          = DEFAULT_HIDE_AC;

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
    "padding:16px",
    "margin-top:10px",
    "max-width:920px"
  ].join(";");

  const controlsRow = document.createElement("div");
  controlsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;min-height:36px;";

  const leftControls = document.createElement("div");
  leftControls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;";
  const categoryButtons = {};
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.textContent = cat;
    b.dataset.cat = cat;
    b.style.cssText = [
      "padding:6px 12px","border-radius:12px",
      `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`,`color:${theme.buttonText}`,
      "cursor:pointer","font-weight:600","font-size:13px","white-space:nowrap","flex-shrink:0"
    ].join(";");
    b.addEventListener("click", () => renderCategory(cat));
    categoryButtons[cat] = b;
    leftControls.appendChild(b);
  });

  const rightControls = document.createElement("div");
  rightControls.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

  const timelineSelect = document.createElement("select");
  [
    { value: "all", label: "All Time" },
    { value: "1", label: "Last Month" },
    { value: "3", label: "Last 3 Months" },
    { value: "6", label: "Last 6 Months" },
    { value: "12", label: "Last Year" },
    { value: "24", label: "Last 2 Years" },
    { value: "custom", label: "Custom Range" }
  ].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value; o.textContent = opt.label;
    timelineSelect.appendChild(o);
  });
  timelineSelect.value = DEFAULT_TIMELINE;
  timelineSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:120px;`;

  const modeSelect = document.createElement("select");
  ["total", "rated", "unrated"].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt; o.textContent = opt[0].toUpperCase() + opt.slice(1);
    modeSelect.appendChild(o);
  });
  modeSelect.value = DEFAULT_MODE;
  modeSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:90px;`;
  modeSelect.addEventListener("change", () => renderCategory(currentCategory || DEFAULT_CATEGORY));
  timelineSelect.addEventListener("change", () => {
    if (timelineSelect.value === "custom") { customDateRow.style.display = "flex"; }
    else { customDateRow.style.display = "none"; renderCategory(currentCategory || DEFAULT_CATEGORY); }
  });

  function makeFrictionToggleBtn(label, value) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.fview = value;
    b.style.cssText = [
      "padding:6px 12px","border-radius:6px",
      `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`,`color:${theme.buttonText}`,
      "cursor:pointer","font-weight:600","font-size:13px","white-space:nowrap","transition:background 0.15s,color 0.15s"
    ].join(";");
    b.addEventListener("click", () => {
      frictionView = value;
      updateFrictionToggleBtns();
      if (lastModeData) renderFrictionPanels(lastModeData, currentCategory || DEFAULT_CATEGORY);
    });
    return b;
  }

  const btnTopics = makeFrictionToggleBtn("Topics", "topics");
  const btnRatings = makeFrictionToggleBtn("Ratings", "ratings");

  function updateFrictionToggleBtns() {
    [btnTopics, btnRatings].forEach(b => {
      if (b.dataset.fview === frictionView) {
        b.style.background = theme.activeButtonBg; b.style.color = theme.activeButtonText; b.style.border = `1px solid ${theme.activeButtonBg}`;
      } else {
        b.style.background = theme.buttonBg; b.style.color = theme.buttonText; b.style.border = `1px solid ${theme.buttonBorder}`;
      }
    });
  }
  updateFrictionToggleBtns();

  rightControls.appendChild(timelineSelect);
  rightControls.appendChild(modeSelect);

  const settingsBtn = document.createElement("button");
  settingsBtn.textContent = "⚙";
  settingsBtn.title = "Default settings";
  settingsBtn.style.cssText = [
    "padding:6px 10px","border-radius:6px",
    `border:1px solid ${theme.buttonBorder}`,
    `background:${theme.buttonBg}`,`color:${theme.buttonText}`,
    "cursor:pointer","font-size:15px","line-height:1","white-space:nowrap","flex-shrink:0"
  ].join(";");
  rightControls.appendChild(settingsBtn);

  controlsRow.appendChild(leftControls);
  controlsRow.appendChild(rightControls);
  card.appendChild(controlsRow);

  const settingsPanel = document.createElement("div");
  settingsPanel.style.cssText = [
    "display:none","flex-direction:row","align-items:flex-end","flex-wrap:nowrap","gap:8px","box-sizing:border-box","width:100%",
    "margin-bottom:8px","padding:8px 10px",
    `background:${theme.bg}`,`border:1px solid ${theme.border}`,"border-radius:6px"
  ].join(";");
  card.appendChild(settingsPanel);

  function makeSettingField(labelText, selectEl) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    lbl.style.cssText = `font-size:11px;font-weight:600;color:${theme.muted};text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;text-align:center;display:block;`;
    selectEl.style.width = "100%";
    wrap.appendChild(lbl);
    wrap.appendChild(selectEl);
    return wrap;
  }

  function makeSettingsSelect(options, currentVal) {
    const sel = document.createElement("select");
    sel.style.cssText = `padding:5px 6px;border-radius:5px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:12px;width:100%;box-sizing:border-box;`;
    options.forEach(({ value, label }) => {
      const o = document.createElement("option");
      o.value = value; o.textContent = label; sel.appendChild(o);
    });
    sel.value = currentVal;
    return sel;
  }

  const sCatSel      = makeSettingsSelect(CATEGORIES.map(c => ({ value: c, label: c })), DEFAULT_CATEGORY);
  const sTimelineSel = makeSettingsSelect([
    { value: "all", label: "All Time" },{ value: "1", label: "Last Month" },
    { value: "3", label: "Last 3 Months" },{ value: "6", label: "Last 6 Months" },
    { value: "12", label: "Last Year" },{ value: "24", label: "Last 2 Years" }
  ], DEFAULT_TIMELINE === "custom" ? "all" : DEFAULT_TIMELINE);
  const sModeSel     = makeSettingsSelect(["total","rated","unrated"].map(v => ({ value: v, label: v[0].toUpperCase()+v.slice(1) })), DEFAULT_MODE);
  const sFrictionSel = makeSettingsSelect([{ value: "topics", label: "Topics" },{ value: "ratings", label: "Ratings" }], DEFAULT_FRICTION);
  const sSortSel     = makeSettingsSelect([{ value: "wa", label: "WA%" },{ value: "attempts", label: "Attempts" }], DEFAULT_SORT_MODE);
  const sHideACSel   = makeSettingsSelect([{ value: "false", label: "Show All" },{ value: "true", label: "Hide AC'd" }], String(DEFAULT_HIDE_AC));

  const sSelectsRow = document.createElement("div");
  sSelectsRow.style.cssText = "display:flex;flex:1;flex-wrap:nowrap;gap:8px;align-items:flex-end;min-width:0;";
  sSelectsRow.appendChild(makeSettingField("Category", sCatSel));
  sSelectsRow.appendChild(makeSettingField("Timeline", sTimelineSel));
  sSelectsRow.appendChild(makeSettingField("Contest Type",     sModeSel));
  sSelectsRow.appendChild(makeSettingField("WA% View",         sFrictionSel));
  sSelectsRow.appendChild(makeSettingField("Sort By",          sSortSel));
  sSelectsRow.appendChild(makeSettingField("AC Problems",      sHideACSel));
  settingsPanel.appendChild(sSelectsRow);

  const sBtnRow = document.createElement("div");
  sBtnRow.style.cssText = "display:flex;gap:8px;align-items:flex-end;flex-shrink:0;padding-bottom:1px;";

  const sSaveBtn = document.createElement("button");
  sSaveBtn.textContent = "Save defaults";
  sSaveBtn.style.cssText = `padding:6px 14px;border-radius:5px;border:none;background:${theme.activeButtonBg};color:${theme.activeButtonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;

  const sCancelBtn = document.createElement("button");
  sCancelBtn.textContent = "Cancel";
  sCancelBtn.style.cssText = `padding:6px 12px;border-radius:5px;border:1px solid ${theme.buttonBorder};background:${theme.buttonBg};color:${theme.buttonText};cursor:pointer;font-size:13px;white-space:nowrap;`;

  sBtnRow.appendChild(sSaveBtn);
  sBtnRow.appendChild(sCancelBtn);
  settingsPanel.appendChild(sBtnRow);

  let settingsOpen = false;
  settingsBtn.addEventListener("click", () => {
    settingsOpen = !settingsOpen;
    settingsPanel.style.display = settingsOpen ? "flex" : "none";
    settingsBtn.style.background = settingsOpen ? theme.activeButtonBg : theme.buttonBg;
    settingsBtn.style.color = settingsOpen ? theme.activeButtonText : theme.buttonText;
    settingsBtn.style.border = settingsOpen ? `1px solid ${theme.activeButtonBg}` : `1px solid ${theme.buttonBorder}`;
  });

  sCancelBtn.addEventListener("click", () => {
    settingsOpen = false; settingsPanel.style.display = "none";
    settingsBtn.style.background = theme.buttonBg; settingsBtn.style.color = theme.buttonText;
    settingsBtn.style.border = `1px solid ${theme.buttonBorder}`;
  });

  sSaveBtn.addEventListener("click", () => {
    const newSettings = { category: sCatSel.value, timeline: sTimelineSel.value, mode: sModeSel.value, friction: sFrictionSel.value, sortMode: sSortSel.value, hideAC: sHideACSel.value === "true" };
    saveSettings(newSettings);
    timelineSelect.value = newSettings.timeline;
    modeSelect.value = newSettings.mode;
    frictionView    = newSettings.friction;
    defaultSortMode = newSettings.sortMode;
    hideAC          = newSettings.hideAC;
    updateFrictionToggleBtns();
    settingsOpen = false; settingsPanel.style.display = "none";
    settingsBtn.style.background = theme.buttonBg; settingsBtn.style.color = theme.buttonText;
    settingsBtn.style.border = `1px solid ${theme.buttonBorder}`;
    renderCategory(newSettings.category);
  });

  const customDateRow = document.createElement("div");
  customDateRow.style.cssText = "display:none;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:"+theme.bg+";border:1px solid "+theme.border+";border-radius:6px;flex-wrap:wrap;min-height:44px;";

  const dateFromLabel = document.createElement("span");
  dateFromLabel.textContent = "From:";
  dateFromLabel.style.cssText = `color:${theme.text};font-size:13px;font-weight:600;white-space:nowrap;`;
  const startDateInput = document.createElement("input");
  startDateInput.type = "date";
  startDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;color-scheme:${detectDarkMode()?"dark":"light"};`;
  const dateToLabel = document.createElement("span");
  dateToLabel.textContent = "To:";
  dateToLabel.style.cssText = `color:${theme.text};font-size:13px;font-weight:600;white-space:nowrap;`;
  const endDateInput = document.createElement("input");
  endDateInput.type = "date";
  endDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;color-scheme:${detectDarkMode()?"dark":"light"};`;

  const dateButtonGroup = document.createElement("div");
  dateButtonGroup.style.cssText = "display:flex;gap:6px;margin-left:auto;";
  const applyDateBtn = document.createElement("button");
  applyDateBtn.textContent = "Apply";
  applyDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.activeButtonBg};background:${theme.activeButtonBg};color:${theme.activeButtonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;
  const cancelDateBtn = document.createElement("button");
  cancelDateBtn.textContent = "Cancel";
  cancelDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.buttonBorder};background:${theme.buttonBg};color:${theme.buttonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;`;
  dateButtonGroup.appendChild(applyDateBtn);
  dateButtonGroup.appendChild(cancelDateBtn);
  customDateRow.appendChild(dateFromLabel);
  customDateRow.appendChild(startDateInput);
  customDateRow.appendChild(dateToLabel);
  customDateRow.appendChild(endDateInput);
  customDateRow.appendChild(dateButtonGroup);
  card.appendChild(customDateRow);

  const dateValidationMsg = document.createElement("span");
  dateValidationMsg.style.cssText = "color:#e74c3c;font-size:12px;font-weight:600;display:none;white-space:nowrap;";
  dateValidationMsg.textContent = "Please select both dates.";
  dateButtonGroup.insertBefore(dateValidationMsg, applyDateBtn);

  applyDateBtn.addEventListener("click", () => {
    if (startDateInput.value && endDateInput.value) {
      dateValidationMsg.style.display = "none";
      customDateRow.style.display = "none";
      renderCategory(currentCategory || DEFAULT_CATEGORY);
    } else {
      dateValidationMsg.style.display = "inline";
    }
  });
  cancelDateBtn.addEventListener("click", () => {
    customDateRow.style.display = "none"; timelineSelect.value = DEFAULT_TIMELINE;
    startDateInput.value = ""; endDateInput.value = "";
    dateValidationMsg.style.display = "none";
    renderCategory(currentCategory || DEFAULT_CATEGORY);
  });

  const info = document.createElement("div");
  info.style.cssText = `color:${theme.muted};font-size:13px;margin-top:4px;margin-bottom:12px;`;
  info.textContent = "Loading…";
  card.appendChild(info);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;margin-bottom:14px;";
  const table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;font-size:13px;width:100%;";
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  const frictionSection = document.createElement("div");
  frictionSection.style.cssText = `margin-top:12px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;

  const frictionToggleRow = document.createElement("div");
  frictionToggleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;";

  const frictionHeading = document.createElement("span");
  frictionHeading.style.cssText = `font-weight:600;color:${theme.headingText};font-size:14px;`;

  const frictionBtnGroup = document.createElement("div");
  frictionBtnGroup.style.cssText = "display:flex;gap:6px;";
  frictionBtnGroup.appendChild(btnTopics);
  frictionBtnGroup.appendChild(btnRatings);

  frictionToggleRow.appendChild(frictionHeading);
  frictionToggleRow.appendChild(frictionBtnGroup);
  frictionSection.appendChild(frictionToggleRow);

  const frictionScrollBox = document.createElement("div");
  frictionScrollBox.style.cssText = [
    "height:265px","overflow:hidden",
    `border:1px solid ${theme.borderLight}`,"border-radius:5px",
    "display:flex","flex-direction:column","padding:0"
  ].join(";");
  frictionSection.appendChild(frictionScrollBox);
  card.appendChild(frictionSection);

  function ratingBucket(rating) {
    if (!rating || isNaN(rating)) return "Unrated";
    const r = Math.floor(rating / 100) * 100;
    return `${r} ${r + 99}`;
  }

  function sortRatingBuckets(list) {
    return list.slice().sort((a, b) => {
      if (a.topic === "Unrated") return 1;
      if (b.topic === "Unrated") return -1;
      return b.waRatio - a.waRatio || (parseInt(a.topic) || 0) - (parseInt(b.topic) || 0);
    });
  }

  function insertCard() {
    const boxes = Array.from(document.querySelectorAll(".box"));
    const visible = boxes.filter(el => { const r = el.getBoundingClientRect(); return r.width > 220 && r.height > 50; });
    if (visible.length > 0) {
      const last = visible[visible.length - 1];
      const w = Math.round(last.getBoundingClientRect().width);
      card.style.width = (w > 220 ? (w + "px") : "880px");
      last.insertAdjacentElement("afterend", card);
      if (window.ResizeObserver) {
        new ResizeObserver(entries => { for (let e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }}).observe(last);
      }
      return true;
    }
    const main = document.querySelector("#pageContent, #mainContent, .mainContent, .content");
    if (main) {
      const w = Math.round(main.getBoundingClientRect().width);
      card.style.width = (w > 220 ? (w + "px") : "880px");
      main.appendChild(card);
      if (window.ResizeObserver) new ResizeObserver(entries => { for (let e of entries) { const nw = Math.round(e.contentRect.width); if (nw > 220) card.style.width = nw + "px"; }}).observe(main);
      return true;
    }
    document.body.appendChild(card); card.style.width = "880px"; return true;
  }
  insertCard();

  setTimeout(() => {
    theme = createTheme();
    card.style.background = theme.bg; card.style.border = `1px solid ${theme.border}`; card.style.color = theme.text;
    frictionHeading.style.color = theme.headingText;
    frictionSection.style.borderTop = `1px solid ${theme.borderLight}`;
    frictionScrollBox.style.border = `1px solid ${theme.borderLight}`;
    info.style.color = theme.muted;
    timelineSelect.style.background = theme.selectBg; timelineSelect.style.color = theme.selectText; timelineSelect.style.borderColor = theme.selectBorder;
    modeSelect.style.background = theme.selectBg; modeSelect.style.color = theme.selectText; modeSelect.style.borderColor = theme.selectBorder;
    settingsBtn.style.background = theme.buttonBg; settingsBtn.style.color = theme.buttonText; settingsBtn.style.border = `1px solid ${theme.buttonBorder}`;
    settingsPanel.style.background = theme.bg; settingsPanel.style.border = `1px solid ${theme.border}`;
    [sCatSel, sTimelineSel, sModeSel, sFrictionSel, sSortSel, sHideACSel].forEach(sel => {
      sel.style.background = theme.selectBg; sel.style.color = theme.selectText; sel.style.borderColor = theme.selectBorder;
    });
    const colorScheme = detectDarkMode() ? "dark" : "light";
    startDateInput.style.background = theme.inputBg; startDateInput.style.color = theme.inputText; startDateInput.style.borderColor = theme.inputBorder; startDateInput.style.colorScheme = colorScheme;
    endDateInput.style.background = theme.inputBg; endDateInput.style.color = theme.inputText; endDateInput.style.borderColor = theme.inputBorder; endDateInput.style.colorScheme = colorScheme;
    customDateRow.style.background = theme.bg; customDateRow.style.borderColor = theme.border;
    dateFromLabel.style.color = theme.text; dateToLabel.style.color = theme.text;
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k];
      if (k === currentCategory) { b.style.background = theme.activeButtonBg; b.style.color = theme.activeButtonText; b.style.border = `1px solid ${theme.activeButtonBg}`; }
      else { b.style.background = theme.buttonBg; b.style.color = theme.buttonText; b.style.border = `1px solid ${theme.buttonBorder}`; }
    });
    updateFrictionToggleBtns();
  }, 100);

  let previousTheme = { isDark: detectDarkMode(), bg: theme.bg, border: theme.border };

  function updateTheme() {
    const newIsDark = detectDarkMode();
    const newTheme = createTheme();
    if (newIsDark !== previousTheme.isDark || newTheme.bg !== previousTheme.bg || newTheme.border !== previousTheme.border) {
      theme = newTheme;
      previousTheme = { isDark: newIsDark, bg: theme.bg, border: theme.border };
      card.style.background = theme.bg; card.style.border = `1px solid ${theme.border}`; card.style.color = theme.text;
      info.style.color = theme.muted;
      frictionSection.style.borderTop = `1px solid ${theme.borderLight}`;
      frictionHeading.style.color = theme.headingText;
      frictionScrollBox.style.border = `1px solid ${theme.borderLight}`;
      Object.keys(categoryButtons).forEach(k => {
        const b = categoryButtons[k];
        if (k === currentCategory) { b.style.background = theme.activeButtonBg; b.style.color = theme.activeButtonText; b.style.border = `1px solid ${theme.activeButtonBg}`; }
        else { b.style.background = theme.buttonBg; b.style.color = theme.buttonText; b.style.border = `1px solid ${theme.buttonBorder}`; }
      });
      updateFrictionToggleBtns();
      timelineSelect.style.background = theme.selectBg; timelineSelect.style.color = theme.selectText; timelineSelect.style.border = `1px solid ${theme.selectBorder}`;
      modeSelect.style.background = theme.selectBg; modeSelect.style.color = theme.selectText; modeSelect.style.border = `1px solid ${theme.selectBorder}`;
      settingsPanel.style.background = theme.bg; settingsPanel.style.border = `1px solid ${theme.border}`;
      if (!settingsOpen) { settingsBtn.style.background = theme.buttonBg; settingsBtn.style.color = theme.buttonText; settingsBtn.style.border = `1px solid ${theme.buttonBorder}`; }

      customDateRow.style.background = theme.bg; customDateRow.style.borderColor = theme.border;
      dateFromLabel.style.color = theme.text; dateToLabel.style.color = theme.text;
      const colorScheme = detectDarkMode() ? "dark" : "light";
      startDateInput.style.background = theme.inputBg; startDateInput.style.color = theme.inputText; startDateInput.style.borderColor = theme.inputBorder; startDateInput.style.colorScheme = colorScheme;
      endDateInput.style.background = theme.inputBg; endDateInput.style.color = theme.inputText; endDateInput.style.borderColor = theme.inputBorder; endDateInput.style.colorScheme = colorScheme;
      cancelDateBtn.style.background = theme.buttonBg; cancelDateBtn.style.color = theme.buttonText; cancelDateBtn.style.borderColor = theme.buttonBorder;
      applyDateBtn.style.background = theme.activeButtonBg; applyDateBtn.style.color = theme.activeButtonText; applyDateBtn.style.borderColor = theme.activeButtonBg;
      sSaveBtn.style.background = theme.activeButtonBg; sSaveBtn.style.color = theme.activeButtonText;

      [sCatSel, sTimelineSel, sModeSel, sFrictionSel, sSortSel, sHideACSel].forEach(sel => {
        sel.style.background = theme.selectBg; sel.style.color = theme.selectText; sel.style.borderColor = theme.selectBorder;
      });
      sCancelBtn.style.background = theme.buttonBg; sCancelBtn.style.color = theme.buttonText; sCancelBtn.style.borderColor = theme.buttonBorder;

      if (currentCategory && lastModeData) { renderTableForCategory(lastModeData, currentCategory); renderFrictionPanels(lastModeData, currentCategory); }
    }
  }

  const themeObserver = new MutationObserver(() => { updateTheme(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class','style','data-theme'] });
  [document.querySelector('.info'), document.querySelector('.roundbox'), document.querySelector('#pageContent'), document.body].filter(Boolean).forEach(el => themeObserver.observe(el, { attributes: true, attributeFilter: ['style','class'] }));
  setInterval(() => { updateTheme(); }, 500);
  window.addEventListener('focus', () => { updateTheme(); });

  function median(arr) {
    if (!arr || arr.length === 0) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  }

  function totalErrors(p) {
    return (p.wa||0) + (p.tle||0) + (p.rte||0) + (p.mle||0) + (p.other||0);
  }

  function decideUserDivisionForContest(cid, contest, isUnofficial) {
    if (!contest || typeof contest.startTimeSeconds !== "number") return "Div2";
    if (isUnofficial) return "Div2";
    const contestTime = contest.startTimeSeconds;
    let ratingBeforeContest = 0;
    const sortedHistory = [...userRatingHistory].sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
    for (let i = 0; i < sortedHistory.length; i++) {
      const rc = sortedHistory[i];
      if (rc.contestId === cid) { ratingBeforeContest = rc.oldRating; break; }
      if (rc.ratingUpdateTimeSeconds < contestTime) ratingBeforeContest = rc.newRating;
    }
    return ratingBeforeContest >= 1900 ? "Div1" : "Div2";
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
    } catch (e) { info.textContent = "Contest list unavailable — some data may be incomplete."; }
  }

  async function fetchRatedSet(handle) {
    try {
      const r = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
      const d = await r.json();
      if (d.status === "OK") { userRatingHistory = d.result || []; return new Set(d.result.map(x => x.contestId)); }
    } catch (e) {}
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
    } catch (e) { info.textContent = "Could not connect to Codeforces. Please check your connection and try again."; return false; }
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
    if (mode === "total") participated = new Set([...ratedContestSet, ...inWindowSet]);
    else if (mode === "rated") participated = new Set([...ratedContestSet]);
    else inWindowSet.forEach(cid => { if (!ratedContestSet.has(cid)) participated.add(cid); });

    if (cutoffTime !== 0 || endTime !== now) {
      const tmp = new Set();
      participated.forEach(cid => {
        const contest = contestMap[cid];
        if (contest && contest.startTimeSeconds >= cutoffTime && contest.startTimeSeconds <= endTime) tmp.add(cid);
      });
      participated = tmp;
    }

    const categoryIndexTimes = {}, categoryIndexAttempts = {}, categoryIndexSolved = {};
    const categoryTopicAttempts = {}, categoryTopicSolved = {};
    const categoryRatingAttempts = {}, categoryRatingSolved = {};
    const globalRatingAttempts = {}, globalRatingSolved = {};
    const categoryContestCount = {};

    const categoryTopicWAProblems = {};
    const categoryRatingWAProblems = {};
    const globalTopicWAProblems = {};
    const globalRatingWAProblems = {};

    CATEGORIES.forEach(c => {
      categoryIndexTimes[c] = {}; categoryIndexAttempts[c] = {}; categoryIndexSolved[c] = {};
      categoryTopicAttempts[c] = {}; categoryTopicSolved[c] = {};
      categoryRatingAttempts[c] = {}; categoryRatingSolved[c] = {};
      categoryContestCount[c] = new Set();
      categoryTopicWAProblems[c] = {};
      categoryRatingWAProblems[c] = {};
    });

    const subsByContest = {};
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds, st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      subsByContest[cid] = subsByContest[cid] || [];
      subsByContest[cid].push(s);
    });

    const unofficialContests = new Set();
    participated.forEach(cid => { if (!ratedContestSet.has(cid)) unofficialContests.add(cid); });

    const everAC = new Set();
    rawSubmissions.forEach(s => {
      if (s.verdict === "OK" && s.problem) {
        everAC.add(s.problem.contestId + "-" + s.problem.index);
      }
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

      const idx = s.problem.index;
      const pid = cid + "-" + idx;
      const tags = s.problem.tags || [];
      const bucket = ratingBucket(s.problem.rating);

      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") {
        cat = decideUserDivisionForContest(cid, contest, unofficialContests.has(cid));
      }
      if (!categoryIndexAttempts[cat]) {
        cat = "Other";
        if (!categoryIndexAttempts[cat])     categoryIndexAttempts[cat]     = {};
        if (!categoryIndexTimes[cat])        categoryIndexTimes[cat]        = {};
        if (!categoryIndexSolved[cat])       categoryIndexSolved[cat]       = {};
        if (!categoryTopicAttempts[cat])     categoryTopicAttempts[cat]     = {};
        if (!categoryTopicSolved[cat])       categoryTopicSolved[cat]       = {};
        if (!categoryRatingAttempts[cat])    categoryRatingAttempts[cat]    = {};
        if (!categoryRatingSolved[cat])      categoryRatingSolved[cat]      = {};
        if (!categoryTopicWAProblems[cat])   categoryTopicWAProblems[cat]   = {};
        if (!categoryRatingWAProblems[cat])  categoryRatingWAProblems[cat]  = {};
        if (!categoryContestCount[cat])      categoryContestCount[cat]      = new Set();
      }

      categoryContestCount[cat].add(cid);
      categoryIndexAttempts[cat][idx] = (categoryIndexAttempts[cat][idx] || 0) + 1;
      categoryIndexTimes[cat][idx] = categoryIndexTimes[cat][idx] || [];

      if (s.verdict !== "OK") {
        tags.forEach(t => { categoryTopicAttempts[cat][t] = (categoryTopicAttempts[cat][t] || 0) + 1; });
        categoryRatingAttempts[cat][bucket] = (categoryRatingAttempts[cat][bucket] || 0) + 1;
        const vtype = s.verdict === "WRONG_ANSWER" ? "wa"
                    : s.verdict === "TIME_LIMIT_EXCEEDED" ? "tle"
                    : s.verdict === "RUNTIME_ERROR" ? "rte"
                    : s.verdict === "MEMORY_LIMIT_EXCEEDED" ? "mle"
                    : "other";
        const problemInfo = {
          pid, name: s.problem.name || idx, contestId: cid,
          contestName: contest.name || ("Contest " + cid),
          index: idx, rating: s.problem.rating || null,
          solved: everAC.has(pid),
          wa: 0, tle: 0, rte: 0, mle: 0, other: 0
        };
        if (!categoryTopicWAProblems[cat]) categoryTopicWAProblems[cat] = {};
        tags.forEach(t => {
          if (!categoryTopicWAProblems[cat][t]) categoryTopicWAProblems[cat][t] = new Map();
          if (!categoryTopicWAProblems[cat][t].has(pid)) categoryTopicWAProblems[cat][t].set(pid, { ...problemInfo });
          categoryTopicWAProblems[cat][t].get(pid)[vtype]++;
          categoryTopicWAProblems[cat][t].get(pid).solved = everAC.has(pid);
        });
        if (!categoryRatingWAProblems[cat]) categoryRatingWAProblems[cat] = {};
        if (!categoryRatingWAProblems[cat][bucket]) categoryRatingWAProblems[cat][bucket] = new Map();
        if (!categoryRatingWAProblems[cat][bucket].has(pid)) categoryRatingWAProblems[cat][bucket].set(pid, { ...problemInfo });
        categoryRatingWAProblems[cat][bucket].get(pid)[vtype]++;
        categoryRatingWAProblems[cat][bucket].get(pid).solved = everAC.has(pid);
      }

      if (s.verdict !== "OK") return;

      tags.forEach(t => { categoryTopicSolved[cat][t] = (categoryTopicSolved[cat][t] || 0) + 1; });
      categoryRatingSolved[cat][bucket] = (categoryRatingSolved[cat][bucket] || 0) + 1;

      if (firstACSet.has(pid)) return;
      firstACSet.add(pid);
      categoryIndexSolved[cat][idx] = (categoryIndexSolved[cat][idx] || 0) + 1;
      const timeMin = (st - start) / 60;
      const maxAllowed = Math.max(1, Math.round(contest.durationSeconds / 60));
      if (timeMin >= 0 && timeMin <= maxAllowed) categoryIndexTimes[cat][idx].push(timeMin);
    });

    const globalAttempts = {}, globalSolved = {};
    filteredSubmissions.forEach(s => {
      if (!s.problem) return;
      const cid = s.problem.contestId;
      if (!participated.has(cid)) return;
      const contest = contestMap[cid];
      if (!contest || typeof contest.startTimeSeconds !== "number" || typeof contest.durationSeconds !== "number") return;
      const start = contest.startTimeSeconds, end = start + contest.durationSeconds, st = s.creationTimeSeconds;
      if (typeof st !== "number" || st < start || st > end) return;
      const tags = s.problem.tags || [];
      const bucket = ratingBucket(s.problem.rating);
      const idx = s.problem.index;
      const pid = cid + "-" + idx;
      const contestName = contest.name || ("Contest " + cid);

      if (s.verdict !== "OK") {
        tags.forEach(t => { globalAttempts[t] = (globalAttempts[t] || 0) + 1; });
        globalRatingAttempts[bucket] = (globalRatingAttempts[bucket] || 0) + 1;
        const vtype = s.verdict === "WRONG_ANSWER" ? "wa"
                    : s.verdict === "TIME_LIMIT_EXCEEDED" ? "tle"
                    : s.verdict === "RUNTIME_ERROR" ? "rte"
                    : s.verdict === "MEMORY_LIMIT_EXCEEDED" ? "mle"
                    : "other";
        const problemInfo = {
          pid, name: s.problem.name || idx, contestId: cid,
          contestName, index: idx,
          rating: s.problem.rating || null,
          solved: everAC.has(pid),
          wa: 0, tle: 0, rte: 0, mle: 0, other: 0
        };
        tags.forEach(t => {
          if (!globalTopicWAProblems[t]) globalTopicWAProblems[t] = new Map();
          if (!globalTopicWAProblems[t].has(pid)) globalTopicWAProblems[t].set(pid, { ...problemInfo });
          globalTopicWAProblems[t].get(pid)[vtype]++;
          globalTopicWAProblems[t].get(pid).solved = everAC.has(pid);
        });
        if (!globalRatingWAProblems[bucket]) globalRatingWAProblems[bucket] = new Map();
        if (!globalRatingWAProblems[bucket].has(pid)) globalRatingWAProblems[bucket].set(pid, { ...problemInfo });
        globalRatingWAProblems[bucket].get(pid)[vtype]++;
        globalRatingWAProblems[bucket].get(pid).solved = everAC.has(pid);
      }

      if (s.verdict !== "OK") return;
      tags.forEach(t => { globalSolved[t] = (globalSolved[t] || 0) + 1; });
      globalRatingSolved[bucket] = (globalRatingSolved[bucket] || 0) + 1;
    });

    const contestFriction = [];
    if (categoryFilter && categoryTopicAttempts[categoryFilter]) {
      Object.keys(categoryTopicAttempts[categoryFilter]).forEach(t => {
        const a = categoryTopicAttempts[categoryFilter][t] || 0;
        const s = categoryTopicSolved[categoryFilter][t] || 0;
        const waRatio = (a + s) > 0 ? Math.round((a / (a + s)) * 100) : 0;
        if (a >= 3) contestFriction.push({
          topic: t, waRatio, attempts: a,
          waProblems: categoryTopicWAProblems[categoryFilter] && categoryTopicWAProblems[categoryFilter][t]
            ? Array.from(categoryTopicWAProblems[categoryFilter][t].values()).sort((x, y) => totalErrors(y) - totalErrors(x))
            : []
        });
      });
    }
    contestFriction.sort((x, y) => y.waRatio - x.waRatio);

    const globalFriction = [];
    Object.keys(globalAttempts).forEach(t => {
      const a = globalAttempts[t] || 0, s = globalSolved[t] || 0;
      const waRatio = (a + s) > 0 ? Math.round((a / (a + s)) * 100) : 0;
      if (a >= 5) globalFriction.push({
        topic: t, waRatio, attempts: a,
        waProblems: globalTopicWAProblems[t]
          ? Array.from(globalTopicWAProblems[t].values()).sort((x, y) => totalErrors(y) - totalErrors(x))
          : []
      });
    });
    globalFriction.sort((x, y) => y.waRatio - x.waRatio);

    const contestRatingFriction = [];
    if (categoryFilter && categoryRatingAttempts[categoryFilter]) {
      Object.keys(categoryRatingAttempts[categoryFilter]).forEach(bucket => {
        const a = categoryRatingAttempts[categoryFilter][bucket] || 0;
        const s = categoryRatingSolved[categoryFilter][bucket] || 0;
        const waRatio = (a + s) > 0 ? Math.round((a / (a + s)) * 100) : 0;
        if (a >= 1) contestRatingFriction.push({
          topic: bucket, waRatio, attempts: a,
          waProblems: categoryRatingWAProblems[categoryFilter] && categoryRatingWAProblems[categoryFilter][bucket]
            ? Array.from(categoryRatingWAProblems[categoryFilter][bucket].values()).sort((x, y) => totalErrors(y) - totalErrors(x))
            : []
        });
      });
    }

    const globalRatingFriction = [];
    Object.keys(globalRatingAttempts).forEach(bucket => {
      const a = globalRatingAttempts[bucket] || 0, s = globalRatingSolved[bucket] || 0;
      const waRatio = (a + s) > 0 ? Math.round((a / (a + s)) * 100) : 0;
      if (a >= 1) globalRatingFriction.push({
        topic: bucket, waRatio, attempts: a,
        waProblems: globalRatingWAProblems[bucket]
          ? Array.from(globalRatingWAProblems[bucket].values()).sort((x, y) => totalErrors(y) - totalErrors(x))
          : []
      });
    });

    return {
      categoryIndexTimes, categoryIndexAttempts, categoryIndexSolved,
      contestFriction, globalFriction,
      contestRatingFriction, globalRatingFriction,
      participatedCount: participated.size,
      categoryContestCount: Object.fromEntries(Object.entries(categoryContestCount).map(([cat, set]) => [cat, set.size]))
    };
  }

  function makeWAProblemDropdown(waProblems, shouldHideAC) {
    const dropdown = document.createElement("div");
    dropdown.style.cssText = [
      `background:${theme.dropdownBg}`,
      `border:1px solid ${theme.dropdownBorder}`,
      "border-radius:5px",
      "margin:4px 8px 6px 8px",
      "overflow:hidden",
      "animation:cfpm-slide-down 0.18s ease"
    ].join(";");

    if (!document.getElementById("cfpm-anim")) {
      const style = document.createElement("style");
      style.id = "cfpm-anim";
      style.textContent = `
        @keyframes cfpm-slide-down {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const sorted = (waProblems || [])
      .filter(p => !shouldHideAC || !p.solved)
      .slice().sort((a, b) => totalErrors(b) - totalErrors(a));

    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.style.cssText = `padding:8px 12px;color:${theme.emptyText};font-style:italic;font-size:12px;`;
      empty.textContent = shouldHideAC ? "All problems have been AC'd." : "No problems recorded.";
      dropdown.appendChild(empty);
      return dropdown;
    }

    sorted.forEach((p, i) => {
      const row = document.createElement("div");
      row.style.cssText = [
        "display:flex","align-items:center","gap:8px",
        "padding:6px 12px",
        i > 0 ? `border-top:1px solid ${theme.dropdownBorder}` : "",
        "transition:background 0.12s","cursor:pointer"
      ].join(";");
      row.onmouseenter = () => row.style.background = theme.problemRowHover;
      row.onmouseleave = () => row.style.background = "";

      const link = document.createElement("a");
      link.href = `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
      link.target = "_blank"; link.rel = "noopener";
      link.style.cssText = [
        `color:${theme.problemLink}`,
        "text-decoration:none","font-size:12px","font-weight:600",
        "flex:1","min-width:0","overflow:hidden","text-overflow:ellipsis","white-space:nowrap"
      ].join(";");
      link.textContent = `${p.index}. ${p.name}`;
      link.title = p.name;
      link.onmouseenter = () => link.style.textDecoration = "underline";
      link.onmouseleave = () => link.style.textDecoration = "none";
      link.addEventListener("click", e => e.stopPropagation());
      row.appendChild(link);

      const contestSpan = document.createElement("span");
      contestSpan.style.cssText = `color:${theme.muted};font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;flex-shrink:1;`;
      contestSpan.textContent = p.contestName;
      contestSpan.title = p.contestName;
      row.appendChild(contestSpan);

      if (p.rating) {
        const ratingBadge = document.createElement("span");
        ratingBadge.style.cssText = `font-size:11px;color:${theme.muted};white-space:nowrap;flex-shrink:0;`;
        ratingBadge.textContent = "★" + p.rating;
        row.appendChild(ratingBadge);
      }

      const isDark = detectDarkMode();
      const tleBg  = isDark ? "#2a2000"  : "#fff8e1";
      const tleFg  = isDark ? "#ffd54f"  : "#e65100";
      const rteBg  = isDark ? "#1a1a2e"  : "#ede7f6";
      const rteFg  = isDark ? "#9fa8da"  : "#4527a0";
      const mleBg  = isDark ? "#002828"  : "#e0f2f1";
      const mleFg  = isDark ? "#4db6ac"  : "#00695c";
      const errBg  = isDark ? "#2a2a2a"  : "#f5f5f5";
      const verdictDefs = [
        { key: "wa",    label: "WA",  bg: theme.waBadge, fg: theme.waBadgeText },
        { key: "tle",   label: "TLE", bg: tleBg,          fg: tleFg },
        { key: "rte",   label: "RTE", bg: rteBg,          fg: rteFg },
        { key: "mle",   label: "MLE", bg: mleBg,          fg: mleFg },
        { key: "other", label: "ERR", bg: errBg,          fg: theme.muted },
      ];
      verdictDefs.forEach(({ key, label, bg, fg }) => {
        const cnt = p[key] || 0;
        if (!cnt) return;
        const badge = document.createElement("span");
        badge.style.cssText = [
          `background:${bg}`,`color:${fg}`,
          "font-size:11px","font-weight:700","border-radius:4px","padding:1px 6px",
          "white-space:nowrap","flex-shrink:0"
        ].join(";");
        badge.textContent = `${label} ×${cnt}`;
        row.appendChild(badge);
      });

      if (p.solved) {
        const b = document.createElement("span");
        b.style.cssText = `background:${theme.solvedBadge};color:${theme.solvedBadgeText};font-size:11px;font-weight:700;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;`;
        b.textContent = "✓ AC'd";
        row.appendChild(b);
      } else {
        const b = document.createElement("span");
        b.style.cssText = `background:${theme.waBadge};color:${theme.waBadgeText};font-size:11px;border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;opacity:0.75;`;
        b.textContent = "Unsolved";
        row.appendChild(b);
      }

      row.addEventListener("click", () => {
        window.open(`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`, "_blank");
      });
      dropdown.appendChild(row);
    });

    return dropdown;
  }

  function renderFrictionPanels(modeData, cat) {
    frictionScrollBox.innerHTML = "";

    let contestList, globalList;
    if (frictionView === "topics") {
      contestList = modeData.contestFriction || [];
      globalList  = modeData.globalFriction  || [];
      frictionHeading.textContent = "Topic Wise";
    } else {
      contestList = sortRatingBuckets(modeData.contestRatingFriction || []);
      globalList  = sortRatingBuckets(modeData.globalRatingFriction  || []);
      frictionHeading.textContent = "Rating Wise";
    }

    let activeTab  = "category";
    let sortMode   = defaultSortMode;
    let localHideAC = hideAC;

    function waColor(r) {
      if (r < 40) return "#27ae60";
      if (r < 70) return "#e67e22";
      return "#e74c3c";
    }

    function sortedList(items) {
      const list = items.slice();
      if (sortMode === "attempts") list.sort((a, b) => b.attempts - a.attempts);
      else list.sort((a, b) => b.waRatio - a.waRatio);
      return list;
    }

    function unsolvedCount(item) {
      return (item.waProblems || []).filter(p => !p.solved).length;
    }

    const topBar = document.createElement("div");
    topBar.style.cssText = [
      "display:flex","align-items:stretch","justify-content:space-between",
      `border-bottom:1px solid ${theme.borderLight}`,
      "min-height:38px"
    ].join(";");

    const tabsWrap = document.createElement("div");
    tabsWrap.style.cssText = "display:flex;";

    function makeTab(label, count, key) {
      const t = document.createElement("button");
      t.dataset.key = key;

      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;

      const badge = document.createElement("span");
      badge.textContent = count;
      badge.style.cssText = [
        "margin-left:5px","font-size:10px","font-weight:700",
        "border-radius:10px","padding:1px 6px",
        `background:${theme.borderLight}`,`color:${theme.muted}`
      ].join(";");

      t.appendChild(labelSpan);
      t.appendChild(badge);
      t.style.cssText = [
        "display:flex","align-items:center",
        "padding:8px 16px","font-size:13px","font-weight:600",
        "border:none","border-bottom:2px solid transparent",
        "background:transparent","cursor:pointer",
        `color:${theme.muted}`,"transition:color 0.15s,border-color 0.15s",
        "margin-bottom:-1px"
      ].join(";");
      t.addEventListener("click", () => { activeTab = key; renderTabContent(); updateTabStyles(); });
      return { el: t, badge };
    }

    const { el: tabCatEl } = makeTab(cat, contestList.length, "category");
    const { el: tabOverallEl } = makeTab("Overall", globalList.length, "overall");
    tabsWrap.appendChild(tabCatEl);
    tabsWrap.appendChild(tabOverallEl);

    function updateTabStyles() {
      [tabCatEl, tabOverallEl].forEach(t => {
        const active = t.dataset.key === activeTab;
        t.style.color       = active ? theme.text           : theme.muted;
        t.style.borderColor = active ? theme.activeButtonBg : "transparent";
      });
    }
    updateTabStyles();

    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display:flex;align-items:center;gap:8px;padding:0 10px;";

    const sortToggle = document.createElement("div");
    sortToggle.style.cssText = [
      "display:flex","border-radius:6px","overflow:hidden",
      `border:1px solid ${theme.buttonBorder}`
    ].join(";");

    function makeSortBtn(label, mode) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = [
        "padding:5px 12px","font-size:12px","font-weight:600",
        "border:none","cursor:pointer","transition:background 0.15s,color 0.15s",
        "white-space:nowrap"
      ].join(";");
      b.addEventListener("click", () => { sortMode = mode; updateSortStyles(); renderTabContent(); });
      return b;
    }

    const btnSortWA  = makeSortBtn("WA%",      "wa");
    const btnSortAtt = makeSortBtn("Attempts", "attempts");
    sortToggle.appendChild(btnSortWA);
    sortToggle.appendChild(btnSortAtt);

    function updateSortStyles() {
      [btnSortWA, btnSortAtt].forEach(b => {
        const active = (b.textContent === "WA%" && sortMode === "wa") ||
                       (b.textContent === "Attempts" && sortMode === "attempts");
        b.style.background = active ? theme.activeButtonBg : theme.buttonBg;
        b.style.color      = active ? theme.activeButtonText : theme.buttonText;
      });
    }
    updateSortStyles();

    const hideACBtn = document.createElement("button");
    hideACBtn.style.cssText = [
      "padding:5px 12px","font-size:12px","font-weight:600",
      "border-radius:6px",`border:1px solid ${theme.buttonBorder}`,
      "cursor:pointer","transition:background 0.15s,color 0.15s,border-color 0.15s",
      "white-space:nowrap"
    ].join(";");

    function updateHideACBtn() {
      hideACBtn.textContent  = localHideAC ? "Show AC'd" : "Hide AC'd";
      hideACBtn.style.background = localHideAC ? theme.activeButtonBg : theme.buttonBg;
      hideACBtn.style.color      = localHideAC ? theme.activeButtonText : theme.buttonText;
      hideACBtn.style.borderColor = localHideAC ? theme.activeButtonBg : theme.buttonBorder;
    }
    updateHideACBtn();

    hideACBtn.addEventListener("click", () => {
      localHideAC = !localHideAC;
      hideAC = localHideAC;
      updateHideACBtn();
      renderTabContent();
    });

    rightBtns.appendChild(sortToggle);
    rightBtns.appendChild(hideACBtn);

    topBar.appendChild(tabsWrap);
    topBar.appendChild(rightBtns);

    const listArea = document.createElement("div");
    listArea.style.cssText = "flex:1;overflow-y:auto;";

    function makeList(items) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;";

      if (!items.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:16px 12px;color:${theme.emptyText};font-style:italic;font-size:13px;text-align:center;`;
        empty.textContent = "No data";
        wrap.appendChild(empty);
        return wrap;
      }

      let openDropdown = null;
      let openRowEl    = null;

      items.forEach((t) => {
        const rowWrap = document.createElement("div");

        const row = document.createElement("div");
        row.style.cssText = [
          "display:flex","align-items:center","gap:12px",
          "padding:9px 16px",
          `border-bottom:1px solid ${theme.borderLighter}`,
          "cursor:pointer","transition:background 0.1s",
          "border-left:3px solid transparent"
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
        const unsolved = unsolvedCount(t);
        if (localHideAC) {
          if (unsolved > 0) {
            attSpan.innerHTML = `${t.attempts} attempts · <span style="color:${theme.waBadgeText};font-weight:600;">${unsolved} unsolved</span>`;
          } else {
            attSpan.innerHTML = `${t.attempts} attempts · <span style="color:${theme.solvedBadgeText};font-weight:600;">all AC'd</span>`;
          }
        } else {
          if (unsolved > 0) {
            attSpan.innerHTML = `${t.attempts} attempts · <span style="color:${theme.waBadgeText};font-weight:600;">${unsolved} unsolved</span>`;
          } else {
            attSpan.textContent = `${t.attempts} attempts`;
          }
        }

        const pct = document.createElement("span");
        pct.style.cssText = [
          `color:${c}`,"font-size:13px","font-weight:700",
          "white-space:nowrap","flex-shrink:0","min-width:42px","text-align:right"
        ].join(";");
        pct.textContent = `${t.waRatio}%`;

        row.appendChild(chevron);
        row.appendChild(name);
        row.appendChild(attSpan);
        row.appendChild(pct);
        rowWrap.appendChild(row);
        wrap.appendChild(rowWrap);

        const waProblems = t.waProblems || [];
        row.addEventListener("click", () => {
          if (openDropdown && openDropdown.parentNode === rowWrap) {
            openDropdown.remove(); openDropdown = null;
            chevron.style.transform = ""; row.style.background = "";
            row.style.borderLeftColor = c;
            openRowEl = null; return;
          }
          if (openDropdown) {
            openDropdown.remove();
            if (openRowEl) { openRowEl.style.background = ""; openRowEl._chevron.style.transform = ""; }
          }
          const dd = makeWAProblemDropdown(waProblems, localHideAC);
          rowWrap.appendChild(dd);
          openDropdown = dd; openRowEl = row;
          row._chevron = chevron;
          chevron.style.transform = "rotate(90deg)";
          row.style.background = theme.problemRowHover;
        });
      });

      return wrap;
    }

    function renderTabContent() {
      listArea.innerHTML = "";
      const rawItems = activeTab === "category" ? contestList : globalList;
      listArea.appendChild(makeList(sortedList(rawItems)));
    }

    renderTabContent();

    frictionScrollBox.style.cssText = [
      "height:265px","overflow:hidden",
      `border:1px solid ${theme.borderLight}`,
      "border-radius:5px","display:flex","flex-direction:column","padding:0"
    ].join(";");
    frictionScrollBox.appendChild(topBar);
    frictionScrollBox.appendChild(listArea);

    const existingFiEl = frictionSection.querySelector(".friction-info");
    if (existingFiEl) existingFiEl.remove();
  }

  function renderTableForCategory(modeData, cat) {
    const idxTimes = modeData.categoryIndexTimes[cat] || {};
    const idxAttempts = modeData.categoryIndexAttempts[cat] || {};
    const idxSolved = modeData.categoryIndexSolved[cat] || {};
    const presentIdx = Array.from(new Set([...Object.keys(idxTimes), ...Object.keys(idxAttempts)]));
    const allIdxSet = new Set([...DEFAULT_INDICES, ...presentIdx]);
    const allIdx = Array.from(allIdxSet).sort((a, b) => a.localeCompare(b));

    table.innerHTML = "";
    const headRow = document.createElement("tr");
    const corner = document.createElement("th");
    corner.style.cssText = `text-align:left;padding:4px 14px;color:${theme.tableHeaderText};font-weight:600;border-bottom:2px solid ${theme.borderLight};`;
    corner.textContent = cat;
    headRow.appendChild(corner);
    allIdx.forEach(idx => {
      const th = document.createElement("th");
      th.style.cssText = `text-align:center;padding:4px 14px;font-weight:700;color:${theme.headingText};border-bottom:2px solid ${theme.borderLight};`;
      th.textContent = idx;
      headRow.appendChild(th);
    });
    table.appendChild(headRow);

    if (allIdx.length === 0) {
      const eRow = document.createElement("tr");
      const eTd = document.createElement("td");
      eTd.colSpan = 2; eTd.style.cssText = `padding:12px 8px;color:${theme.emptyText};font-style:italic;`;
      eTd.textContent = "No contest data for " + cat + ".";
      eRow.appendChild(eTd); table.appendChild(eRow); return;
    }

    function makeRow(label, getCellContent, borderTop) {
      const row = document.createElement("tr");
      const lbl = document.createElement("td");
      lbl.style.cssText = `padding:7px 14px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;${borderTop ? `border-top:1px solid ${theme.borderLighter};` : ""}`;
      lbl.textContent = label;
      row.appendChild(lbl);
      allIdx.forEach(idx => { row.appendChild(getCellContent(idx, borderTop)); });
      return row;
    }

    const avgRow = makeRow("Avg min", (idx) => {
      const arr = idxTimes[idx] || [];
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:7px 14px;font-weight:700;color:#1652d6;";
      td.textContent = arr.length > 0 ? String(Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*10)/10) : "—";
      return td;
    });
    table.appendChild(avgRow);

    const medRow = makeRow("Med min", (idx) => {
      const arr = idxTimes[idx] || [];
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;font-weight:700;color:#6b4fa0;border-top:1px solid ${theme.borderLighter};`;
      const m = median(arr);
      td.textContent = m !== null ? String(Math.round(m*10)/10) : "—";
      return td;
    });
    table.appendChild(medRow);

    const solvedRow = makeRow("Solved", (idx) => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;color:${theme.tableCellText};border-top:1px solid ${theme.borderLighter};`;
      td.textContent = String(idxSolved[idx] || 0);
      return td;
    });
    table.appendChild(solvedRow);

    const attRow = makeRow("Attempts", (idx) => {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;color:${theme.tableCellText};`;
      td.textContent = String(idxAttempts[idx] || 0);
      return td;
    });
    table.appendChild(attRow);

    const waRow = makeRow("WA%", (idx) => {
      const att = idxAttempts[idx] || 0;
      const sol = idxSolved[idx] || 0;
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:7px 14px;font-weight:700;border-top:1px solid ${theme.borderLighter};`;
      if (att > 0) {
        const waRatio = Math.round(((att - sol) / att) * 100);
        let color = "#e74c3c";
        if (waRatio < 40) color = "#27ae60";
        else if (waRatio < 70) color = "#e67e22";
        td.style.color = color;
        td.textContent = waRatio + "%";
      } else {
        td.style.color = theme.tableCellText; td.textContent = "—";
      }
      return td;
    });
    table.appendChild(waRow);
  }

  let currentCategory = DEFAULT_CATEGORY;
  let lastModeData = null;

  function renderCategory(cat) {
    currentCategory = cat;
    Object.keys(categoryButtons).forEach(k => {
      const b = categoryButtons[k];
      if (k === cat) { b.style.background = theme.activeButtonBg; b.style.color = theme.activeButtonText; b.style.border = `1px solid ${theme.activeButtonBg}`; }
      else { b.style.background = theme.buttonBg; b.style.color = theme.buttonText; b.style.border = `1px solid ${theme.buttonBorder}`; }
    });

    const mode = modeSelect.value;
    const timeline = timelineSelect.value;
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
      timelineLabel = timelineSelect.options[timelineSelect.selectedIndex].text;
    }

    const categoryCount = modeData.categoryContestCount[cat] || 0;
    info.textContent = `Participated in ${modeData.participatedCount} contests (${cat}: ${categoryCount}) · ${mode[0].toUpperCase()+mode.slice(1)} · ${timelineLabel}`;

    renderTableForCategory(modeData, cat);
    renderFrictionPanels(modeData, cat);
  }

  const handle = (window.location.pathname.split("/")[2] || "").trim();
  if (!handle) { info.textContent = "Could not detect a Codeforces username in the page URL."; return; }

  await fetchContests();
  const ok = await fetchAndStore(handle);
  if (!ok) return;

  renderCategory(DEFAULT_CATEGORY);

})();