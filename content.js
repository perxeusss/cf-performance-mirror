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
  const DEFAULT_CATEGORY = _saved.category || "Div4";
  const DEFAULT_MODE     = _saved.mode     || "total";
  const DEFAULT_TIMELINE = _saved.timeline || "all";
  const DEFAULT_FRICTION = _saved.friction || "topics";
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
    if (infoBox) {
      const bg = window.getComputedStyle(infoBox).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
    }

    const roundbox = document.querySelector('.roundbox');
    if (roundbox) {
      const bg = window.getComputedStyle(roundbox).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
    }

    const pageContent = document.querySelector('#pageContent');
    if (pageContent) {
      const bg = window.getComputedStyle(pageContent).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
    }

    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
      return bodyBg;
    }

    const isDarkFallback = detectDarkMode();
    return isDarkFallback ? '#1a1a1a' : '#ffffff';
  }

  function getBoxBorderColor() {
    const roundbox = document.querySelector('.roundbox');
    if (roundbox) {
      const borderColor = window.getComputedStyle(roundbox).borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
        return borderColor;
      }
    }

    const infoBox = document.querySelector('.info');
    if (infoBox) {
      const borderColor = window.getComputedStyle(infoBox).borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
        return borderColor;
      }
    }

    const datatable = document.querySelector('.datatable');
    if (datatable) {
      const borderColor = window.getComputedStyle(datatable).borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
        return borderColor;
      }
    }

    const isDarkFallback = detectDarkMode();
    return isDarkFallback ? '#444' : '#d4d4d4';
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
      inputBorder: isDark ? '#555' : '#ccc'
    };
  }

  let theme = createTheme();

  // ── friction view state ──────────────────────────────────────────────────────
  // "topics" | "ratings"
  let frictionView = DEFAULT_FRICTION;

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
  controlsRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;min-height:36px;";

  const leftControls = document.createElement("div");
  leftControls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;";
  const categoryButtons = {};
  CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.textContent = cat;
    b.dataset.cat = cat;
    b.style.cssText = [
      "padding:6px 12px",
      "border-radius:12px",
      `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`,
      `color:${theme.buttonText}`,
      "cursor:pointer",
      "font-weight:600",
      "font-size:13px",
      "white-space:nowrap",
      "flex-shrink:0"
    ].join(";");
    b.addEventListener("click", () => renderCategory(cat));
    categoryButtons[cat] = b;
    leftControls.appendChild(b);
  });

  const rightControls = document.createElement("div");
  rightControls.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

  const timelineSelect = document.createElement("select");
  const timelineOptions = [
    { value: "all", label: "All Time" },
    { value: "1", label: "Last Month" },
    { value: "3", label: "Last 3 Months" },
    { value: "6", label: "Last 6 Months" },
    { value: "12", label: "Last Year" },
    { value: "24", label: "Last 2 Years" },
    { value: "custom", label: "Custom Range" }
  ];
  timelineOptions.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    timelineSelect.appendChild(o);
  });
  timelineSelect.value = DEFAULT_TIMELINE;
  timelineSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:120px;`;

  const modeSelect = document.createElement("select");
  ["total", "rated", "unrated"].forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt[0].toUpperCase() + opt.slice(1);
    modeSelect.appendChild(o);
  });
  modeSelect.value = DEFAULT_MODE;
  modeSelect.style.cssText = `padding:6px 8px;border-radius:6px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;white-space:nowrap;min-width:90px;`;
  modeSelect.addEventListener("change", () => renderCategory(currentCategory || DEFAULT_CATEGORY));

  function makeFrictionToggleBtn(label, value) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.fview = value;
    b.style.cssText = [
      "padding:6px 12px",
      "border-radius:6px",
      `border:1px solid ${theme.buttonBorder}`,
      `background:${theme.buttonBg}`,
      `color:${theme.buttonText}`,
      "cursor:pointer",
      "font-weight:600",
      "font-size:13px",
      "white-space:nowrap",
      "transition:background 0.15s,color 0.15s"
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
        b.style.background = theme.activeButtonBg;
        b.style.color = theme.activeButtonText;
        b.style.border = `1px solid ${theme.activeButtonBg}`;
      } else {
        b.style.background = theme.buttonBg;
        b.style.color = theme.buttonText;
        b.style.border = `1px solid ${theme.buttonBorder}`;
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
    "padding:6px 10px",
    "border-radius:6px",
    `border:1px solid ${theme.buttonBorder}`,
    `background:${theme.buttonBg}`,
    `color:${theme.buttonText}`,
    "cursor:pointer",
    "font-size:15px",
    "line-height:1",
    "white-space:nowrap",
    "flex-shrink:0"
  ].join(";");
  rightControls.appendChild(settingsBtn);

  controlsRow.appendChild(leftControls);
  controlsRow.appendChild(rightControls);
  card.appendChild(controlsRow);

  // ── settings panel ────────────────────────────────────────────────────────────
  const settingsPanel = document.createElement("div");
  settingsPanel.style.cssText = [
    "display:none",
    "flex-wrap:wrap",
    "gap:12px",
    "align-items:flex-end",
    "margin-bottom:8px",
    "padding:10px 12px",
    `background:${theme.bg}`,
    `border:1px solid ${theme.border}`,
    "border-radius:6px"
  ].join(";");
  card.appendChild(settingsPanel);

  function makeSettingField(labelText, selectEl) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;";
    const lbl = document.createElement("label");
    lbl.textContent = labelText;
    lbl.style.cssText = `font-size:11px;font-weight:600;color:${theme.muted};text-transform:uppercase;letter-spacing:0.04em;`;
    wrap.appendChild(lbl);
    wrap.appendChild(selectEl);
    return wrap;
  }

  function makeSettingsSelect(options, currentVal) {
    const sel = document.createElement("select");
    sel.style.cssText = `padding:5px 8px;border-radius:5px;border:1px solid ${theme.selectBorder};background:${theme.selectBg};color:${theme.selectText};font-size:13px;`;
    options.forEach(({ value, label }) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      sel.appendChild(o);
    });
    sel.value = currentVal;
    return sel;
  }

  const sCatSel = makeSettingsSelect(
    CATEGORIES.map(c => ({ value: c, label: c })),
    DEFAULT_CATEGORY
  );
  const sTimelineSel = makeSettingsSelect(
    [
      { value: "all", label: "All Time" },
      { value: "1",   label: "Last Month" },
      { value: "3",   label: "Last 3 Months" },
      { value: "6",   label: "Last 6 Months" },
      { value: "12",  label: "Last Year" },
      { value: "24",  label: "Last 2 Years" }
    ],
    DEFAULT_TIMELINE === "custom" ? "all" : DEFAULT_TIMELINE
  );
  const sModeSel = makeSettingsSelect(
    ["total","rated","unrated"].map(v => ({ value: v, label: v[0].toUpperCase()+v.slice(1) })),
    DEFAULT_MODE
  );
  const sFrictionSel = makeSettingsSelect(
    [{ value: "topics", label: "Topics" }, { value: "ratings", label: "Ratings" }],
    DEFAULT_FRICTION
  );

  settingsPanel.appendChild(makeSettingField("Default Category", sCatSel));
  settingsPanel.appendChild(makeSettingField("Default Timeline", sTimelineSel));
  settingsPanel.appendChild(makeSettingField("Contest Type", sModeSel));
  settingsPanel.appendChild(makeSettingField("WA% View", sFrictionSel));

  const sBtnRow = document.createElement("div");
  sBtnRow.style.cssText = "display:flex;gap:8px;align-items:flex-end;margin-left:auto;";

  const sSaveBtn = document.createElement("button");
  sSaveBtn.textContent = "Save defaults";
  sSaveBtn.style.cssText = `padding:6px 14px;border-radius:5px;border:none;background:${theme.activeButtonBg};color:${theme.activeButtonText};cursor:pointer;font-size:13px;font-weight:600;`;

  const sCancelBtn = document.createElement("button");
  sCancelBtn.textContent = "Cancel";
  sCancelBtn.style.cssText = `padding:6px 12px;border-radius:5px;border:1px solid ${theme.buttonBorder};background:${theme.buttonBg};color:${theme.buttonText};cursor:pointer;font-size:13px;`;

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
    settingsOpen = false;
    settingsPanel.style.display = "none";
    settingsBtn.style.background = theme.buttonBg;
    settingsBtn.style.color = theme.buttonText;
    settingsBtn.style.border = `1px solid ${theme.buttonBorder}`;
  });

  sSaveBtn.addEventListener("click", () => {
    const newSettings = {
      category: sCatSel.value,
      timeline: sTimelineSel.value,
      mode:     sModeSel.value,
      friction: sFrictionSel.value
    };
    saveSettings(newSettings);

    // Apply immediately
    timelineSelect.value = newSettings.timeline;
    modeSelect.value = newSettings.mode;
    frictionView = newSettings.friction;
    updateFrictionToggleBtns();

    settingsOpen = false;
    settingsPanel.style.display = "none";
    settingsBtn.style.background = theme.buttonBg;
    settingsBtn.style.color = theme.buttonText;
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
  startDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;`;

  const dateToLabel = document.createElement("span");
  dateToLabel.textContent = "To:";
  dateToLabel.style.cssText = `color:${theme.text};font-size:13px;font-weight:600;white-space:nowrap;`;

  const endDateInput = document.createElement("input");
  endDateInput.type = "date";
  endDateInput.style.cssText = `padding:6px 8px;border-radius:4px;border:1px solid ${theme.inputBorder};background:${theme.inputBg};color:${theme.inputText};font-size:13px;flex:1 1 140px;min-width:140px;max-width:180px;`;

  const dateButtonGroup = document.createElement("div");
  dateButtonGroup.style.cssText = "display:flex;gap:6px;margin-left:auto;";

  const applyDateBtn = document.createElement("button");
  applyDateBtn.textContent = "Apply";
  applyDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.buttonBorder};background:${theme.activeButtonBg};color:${theme.activeButtonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:opacity 0.2s;`;
  applyDateBtn.onmouseenter = () => applyDateBtn.style.opacity = '0.9';
  applyDateBtn.onmouseleave = () => applyDateBtn.style.opacity = '1';

  const cancelDateBtn = document.createElement("button");
  cancelDateBtn.textContent = "Cancel";
  cancelDateBtn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid ${theme.buttonBorder};background:${theme.buttonBg};color:${theme.buttonText};cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;transition:opacity 0.2s;`;
  cancelDateBtn.onmouseenter = () => cancelDateBtn.style.opacity = '0.9';
  cancelDateBtn.onmouseleave = () => cancelDateBtn.style.opacity = '1';

  dateButtonGroup.appendChild(applyDateBtn);
  dateButtonGroup.appendChild(cancelDateBtn);

  customDateRow.appendChild(dateFromLabel);
  customDateRow.appendChild(startDateInput);
  customDateRow.appendChild(dateToLabel);
  customDateRow.appendChild(endDateInput);
  customDateRow.appendChild(dateButtonGroup);

  card.appendChild(customDateRow);

  timelineSelect.addEventListener("change", () => {
    if (timelineSelect.value === "custom") {
      customDateRow.style.display = "flex";
    } else {
      customDateRow.style.display = "none";
      renderCategory(currentCategory || DEFAULT_CATEGORY);
    }
  });

  applyDateBtn.addEventListener("click", () => {
    if (startDateInput.value && endDateInput.value) {
      renderCategory(currentCategory || DEFAULT_CATEGORY);
    } else {
      alert("Please select both start and end dates");
    }
  });

  cancelDateBtn.addEventListener("click", () => {
    customDateRow.style.display = "none";
    timelineSelect.value = DEFAULT_TIMELINE;
    startDateInput.value = "";
    endDateInput.value = "";
    renderCategory(currentCategory || DEFAULT_CATEGORY);
  });

  const info = document.createElement("div");
  info.style.cssText = `color:${theme.muted};font-size:13px;margin-bottom:8px;`;
  info.textContent = "Loading…";
  card.appendChild(info);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-x:auto;margin-bottom:12px;";
  const table = document.createElement("table");
  table.style.cssText = "border-collapse:collapse;font-size:13px;width:100%;";
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  // ── friction section ─────────────────────────────────────────────────────────
  const frictionSection = document.createElement("div");
  frictionSection.style.cssText = `margin-top:12px;border-top:1px solid ${theme.borderLight};padding-top:10px;`;

  const frictionToggleRow = document.createElement("div");
  frictionToggleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;";

  const frictionHeading = document.createElement("span");
  frictionHeading.style.cssText = `font-weight:600;color:${theme.headingText};font-size:14px;`;
  frictionHeading.textContent = "High WA%";

  const frictionBtnGroup = document.createElement("div");
  frictionBtnGroup.style.cssText = "display:flex;gap:6px;";
  frictionBtnGroup.appendChild(btnTopics);
  frictionBtnGroup.appendChild(btnRatings);

  frictionToggleRow.appendChild(frictionHeading);
  frictionToggleRow.appendChild(frictionBtnGroup);
  frictionSection.appendChild(frictionToggleRow);

  const frictionScrollBox = document.createElement("div");
  frictionScrollBox.style.cssText = [
    "height:180px",
    "overflow-y:auto",
    `border:1px solid ${theme.borderLight}`,
    "border-radius:5px",
    "padding:4px 0"
  ].join(";");
  frictionSection.appendChild(frictionScrollBox);
  card.appendChild(frictionSection);

  // keep these as dummy refs so nothing else breaks
  const weakContest = document.createElement("div");
  const weakGlobal  = document.createElement("div");

  // ── helpers ──────────────────────────────────────────────────────────────────

  function ratingBucket(rating) {
    if (!rating || isNaN(rating)) return "Unrated";
    const r = Math.floor(rating / 100) * 100;
    return `${r}–${r + 99}`;
  }

  // Sort rating buckets numerically (unrated last)
  function sortRatingBuckets(list) {
    return list.slice().sort((a, b) => {
      if (a.topic === "Unrated") return 1;
      if (b.topic === "Unrated") return -1;
      const aNum = parseInt(a.topic.split("–")[0]) || 0;
      const bNum = parseInt(b.topic.split("–")[0]) || 0;
      return b.waRatio - a.waRatio || aNum - bNum;
    });
  }

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

      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            const newWidth = Math.round(entry.contentRect.width);
            if (newWidth > 220) card.style.width = newWidth + "px";
          }
        });
        resizeObserver.observe(last);
      }
      return true;
    }
    const main = document.querySelector("#pageContent, #mainContent, .mainContent, .content");
    if (main) {
      const w = Math.round(main.getBoundingClientRect().width);
      card.style.width = (w > 220 ? (w + "px") : "880px");
      main.appendChild(card);
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            const newWidth = Math.round(entry.contentRect.width);
            if (newWidth > 220) card.style.width = newWidth + "px";
          }
        });
        resizeObserver.observe(main);
      }
      return true;
    }
    document.body.appendChild(card);
    card.style.width = "880px";
    return true;
  }
  insertCard();

  setTimeout(() => {
    theme = createTheme();
    card.style.background = theme.bg;
    card.style.border = `1px solid ${theme.border}`;
    card.style.color = theme.text;
  }, 100);

  let previousTheme = {
    isDark: detectDarkMode(),
    bg: theme.bg,
    border: theme.border
  };

  function updateTheme() {
    const newIsDark = detectDarkMode();
    const newTheme = createTheme();

    if (newIsDark !== previousTheme.isDark ||
      newTheme.bg !== previousTheme.bg ||
      newTheme.border !== previousTheme.border) {

      theme = newTheme;
      previousTheme = { isDark: newIsDark, bg: theme.bg, border: theme.border };

      card.style.background = theme.bg;
      card.style.border = `1px solid ${theme.border}`;
      card.style.color = theme.text;

      info.style.color = theme.muted;
      frictionSection.style.borderTop = `1px solid ${theme.borderLight}`;
      frictionScrollBox.style.border = `1px solid ${theme.borderLight}`;

      Object.keys(categoryButtons).forEach(k => {
        const b = categoryButtons[k];
        if (k === currentCategory) {
          b.style.background = theme.activeButtonBg;
          b.style.color = theme.activeButtonText;
          b.style.border = `1px solid ${theme.activeButtonBg}`;
        } else {
          b.style.background = theme.buttonBg;
          b.style.color = theme.buttonText;
          b.style.border = `1px solid ${theme.buttonBorder}`;
        }
      });

      updateFrictionToggleBtns();

      timelineSelect.style.background = theme.selectBg;
      timelineSelect.style.color = theme.selectText;
      timelineSelect.style.border = `1px solid ${theme.selectBorder}`;
      modeSelect.style.background = theme.selectBg;
      modeSelect.style.color = theme.selectText;
      modeSelect.style.border = `1px solid ${theme.selectBorder}`;

      startDateInput.style.background = theme.inputBg;
      startDateInput.style.color = theme.inputText;
      startDateInput.style.border = `1px solid ${theme.inputBorder}`;
      endDateInput.style.background = theme.inputBg;
      endDateInput.style.color = theme.inputText;
      endDateInput.style.border = `1px solid ${theme.inputBorder}`;

      customDateRow.style.background = theme.bg;
      customDateRow.style.border = `1px solid ${theme.border}`;
      dateFromLabel.style.color = theme.text;
      dateToLabel.style.color = theme.text;
      cancelDateBtn.style.background = theme.buttonBg;
      cancelDateBtn.style.color = theme.buttonText;
      cancelDateBtn.style.border = `1px solid ${theme.buttonBorder}`;

      settingsPanel.style.background = theme.bg;
      settingsPanel.style.border = `1px solid ${theme.border}`;
      [sCatSel, sTimelineSel, sModeSel, sFrictionSel].forEach(sel => {
        sel.style.background = theme.selectBg;
        sel.style.color = theme.selectText;
        sel.style.border = `1px solid ${theme.selectBorder}`;
      });
      sSaveBtn.style.background = theme.activeButtonBg;
      sCancelBtn.style.background = theme.buttonBg;
      sCancelBtn.style.color = theme.buttonText;
      sCancelBtn.style.border = `1px solid ${theme.buttonBorder}`;
      settingsBtn.style.background = settingsOpen ? theme.activeButtonBg : theme.buttonBg;
      settingsBtn.style.color = settingsOpen ? theme.activeButtonText : theme.buttonText;
      settingsBtn.style.border = settingsOpen ? `1px solid ${theme.activeButtonBg}` : `1px solid ${theme.buttonBorder}`;

      if (currentCategory && lastModeData) {
        renderTableForCategory(lastModeData, currentCategory);
        renderFrictionPanels(lastModeData, currentCategory);
      }
    }
  }

  const themeObserver = new MutationObserver(() => { updateTheme(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

  const observeElements = [
    document.querySelector('.info'),
    document.querySelector('.roundbox'),
    document.querySelector('#pageContent'),
    document.body
  ].filter(el => el !== null);
  observeElements.forEach(el => {
    themeObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  });

  setInterval(() => { updateTheme(); }, 500);
  window.addEventListener('focus', () => { updateTheme(); });

  function median(arr) {
    if (!arr || arr.length === 0) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function decideUserDivisionForContest(cid, contest, subs, isUnofficial) {
    if (!contest || typeof contest.startTimeSeconds !== "number") return "Div2";
    subs = Array.isArray(subs) ? subs : [];
    if (isUnofficial) return "Div2";

    const contestTime = contest.startTimeSeconds;
    let ratingBeforeContest = 0;
    const sortedHistory = [...userRatingHistory].sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);

    for (let i = 0; i < sortedHistory.length; i++) {
      const ratingChange = sortedHistory[i];
      if (ratingChange.contestId === cid) { ratingBeforeContest = ratingChange.oldRating; break; }
      if (ratingChange.ratingUpdateTimeSeconds < contestTime) ratingBeforeContest = ratingChange.newRating;
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
    } catch (e) {
      info.textContent = "Contest list unavailable — some data may be incomplete.";
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
    } catch (e) { }
    userRatingHistory = [];
    return new Set();
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
    } catch (e) {
      info.textContent = "Could not connect to Codeforces. Please check your connection and try again.";
      return false;
    }
  }

  function recalcForMode(mode, timelineMonths, categoryFilter) {
    const now = Math.floor(Date.now() / 1000);
    let cutoffTime = 0;
    let endTime = now;

    if (typeof timelineMonths === 'object' && timelineMonths.type === 'custom') {
      if (timelineMonths.start && timelineMonths.end) {
        cutoffTime = new Date(timelineMonths.start).getTime() / 1000;
        endTime = new Date(timelineMonths.end).getTime() / 1000 + 86400;
      }
    } else if (timelineMonths !== "all") {
      cutoffTime = now - (parseInt(timelineMonths) * 30 * 24 * 60 * 60);
    }

    const filteredSubmissions = (cutoffTime === 0 && endTime === now)
      ? rawSubmissions
      : rawSubmissions.filter(s => {
        if (!s.creationTimeSeconds) return false;
        return s.creationTimeSeconds >= cutoffTime && s.creationTimeSeconds <= endTime;
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

    if (cutoffTime !== 0 || endTime !== now) {
      const timeFilteredParticipated = new Set();
      participated.forEach(cid => {
        const contest = contestMap[cid];
        if (contest && contest.startTimeSeconds >= cutoffTime && contest.startTimeSeconds <= endTime) {
          timeFilteredParticipated.add(cid);
        }
      });
      participated = timeFilteredParticipated;
    }

    const categoryIndexTimes = {};
    const categoryIndexAttempts = {};
    const categoryIndexSolved = {};

    const categoryTopicAttempts = {};
    const categoryTopicSolved = {};

    // ── NEW: rating-bucket friction data ──────────────────────────────────────
    const categoryRatingAttempts = {};   // cat → bucket → count
    const categoryRatingSolved = {};     // cat → bucket → count
    const globalRatingAttempts = {};     // bucket → count
    const globalRatingSolved = {};       // bucket → count

    const categoryContestCount = {};

    CATEGORIES.forEach(c => {
      categoryIndexTimes[c] = {};
      categoryIndexAttempts[c] = {};
      categoryIndexSolved[c] = {};
      categoryTopicAttempts[c] = {};
      categoryTopicSolved[c] = {};
      categoryRatingAttempts[c] = {};
      categoryRatingSolved[c] = {};
      categoryContestCount[c] = new Set();
    });

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
    participated.forEach(cid => { if (!ratedContestSet.has(cid)) unofficialContests.add(cid); });

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
      const bucket = ratingBucket(s.problem.rating);

      let cat = classifyContest(contest);
      if (cat === "Div1+Div2") {
        const isUnofficial = unofficialContests.has(cid);
        cat = decideUserDivisionForContest(cid, contest, subsByContest[cid], isUnofficial);
      }
      if (!categoryIndexAttempts[cat]) {
        cat = "Other";
        categoryIndexAttempts[cat] = categoryIndexAttempts[cat] || {};
        categoryIndexTimes[cat] = categoryIndexTimes[cat] || {};
        categoryIndexSolved[cat] = categoryIndexSolved[cat] || {};
        categoryTopicAttempts[cat] = categoryTopicAttempts[cat] || {};
        categoryTopicSolved[cat] = categoryTopicSolved[cat] || {};
        categoryRatingAttempts[cat] = categoryRatingAttempts[cat] || {};
        categoryRatingSolved[cat] = categoryRatingSolved[cat] || {};
        if (!categoryContestCount[cat]) categoryContestCount[cat] = new Set();
      }

      categoryContestCount[cat].add(cid);

      // topic attempts (category-scoped)
      tags.forEach(t => {
        categoryTopicAttempts[cat][t] = (categoryTopicAttempts[cat][t] || 0) + 1;
      });

      // rating attempts (category-scoped)
      categoryRatingAttempts[cat][bucket] = (categoryRatingAttempts[cat][bucket] || 0) + 1;
      // rating attempts (global)
      globalRatingAttempts[bucket] = (globalRatingAttempts[bucket] || 0) + 1;

      categoryIndexAttempts[cat][idx] = (categoryIndexAttempts[cat][idx] || 0) + 1;
      categoryIndexTimes[cat][idx] = categoryIndexTimes[cat][idx] || [];

      if (s.verdict !== "OK") return;

      tags.forEach(t => { categoryTopicSolved[cat][t] = (categoryTopicSolved[cat][t] || 0) + 1; });

      // rating solved (category-scoped)
      categoryRatingSolved[cat][bucket] = (categoryRatingSolved[cat][bucket] || 0) + 1;
      // rating solved (global)
      globalRatingSolved[bucket] = (globalRatingSolved[bucket] || 0) + 1;

      if (firstAC.has(pid)) return;
      firstAC.add(pid);

      categoryIndexSolved[cat][idx] = (categoryIndexSolved[cat][idx] || 0) + 1;

      const timeMin = (st - start) / 60;
      const maxAllowed = Math.max(1, Math.round(contest.durationSeconds / 60));
      if (timeMin >= 0 && timeMin <= maxAllowed) categoryIndexTimes[cat][idx].push(timeMin);
    });

    // ── Build topic friction ──────────────────────────────────────────────────
    const contestFriction = [];
    if (categoryFilter && categoryTopicAttempts[categoryFilter]) {
      Object.keys(categoryTopicAttempts[categoryFilter]).forEach(t => {
        const a = categoryTopicAttempts[categoryFilter][t] || 0;
        const s = categoryTopicSolved[categoryFilter][t] || 0;
        const waRatio = a > 0 ? Math.round(((a - s) / a) * 100) : 0;
        if (a >= 3) contestFriction.push({ topic: t, waRatio, attempts: a });
      });
    }
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

    // ── Build rating friction ─────────────────────────────────────────────────
    const contestRatingFriction = [];
    if (categoryFilter && categoryRatingAttempts[categoryFilter]) {
      Object.keys(categoryRatingAttempts[categoryFilter]).forEach(bucket => {
        const a = categoryRatingAttempts[categoryFilter][bucket] || 0;
        const s = categoryRatingSolved[categoryFilter][bucket] || 0;
        const waRatio = a > 0 ? Math.round(((a - s) / a) * 100) : 0;
        if (a >= 2) contestRatingFriction.push({ topic: bucket, waRatio, attempts: a });
      });
    }

    const globalRatingFriction = [];
    Object.keys(globalRatingAttempts).forEach(bucket => {
      const a = globalRatingAttempts[bucket] || 0;
      const s = globalRatingSolved[bucket] || 0;
      const waRatio = a > 0 ? Math.round(((a - s) / a) * 100) : 0;
      if (a >= 3) globalRatingFriction.push({ topic: bucket, waRatio, attempts: a });
    });

    return {
      categoryIndexTimes,
      categoryIndexAttempts,
      categoryIndexSolved,
      contestFriction,
      globalFriction,
      contestRatingFriction,
      globalRatingFriction,
      participatedCount: participated.size,
      categoryContestCount: Object.fromEntries(
        Object.entries(categoryContestCount).map(([cat, set]) => [cat, set.size])
      )
    };
  }

  function renderFrictionPanels(modeData, cat) {
    frictionScrollBox.innerHTML = "";

    let isRating, contestList, globalList, headingText;
    if (frictionView === "topics") {
      isRating = false;
      contestList = modeData.contestFriction || [];
      globalList  = modeData.globalFriction  || [];
      headingText = `WA% by Topics`;
    } else {
      isRating = true;
      contestList = sortRatingBuckets(modeData.contestRatingFriction || []);
      globalList  = sortRatingBuckets(modeData.globalRatingFriction  || []);
      headingText = `WA% by Rating`;
    }
    frictionHeading.textContent = headingText;

    function waColor(r) {
      if (r < 40) return "#27ae60";
      if (r < 70) return "#e67e22";
      return "#e74c3c";
    }

    function makeList(items, label) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;";

      // header
      const hdr = document.createElement("div");
      hdr.style.cssText = `font-size:11px;font-weight:700;color:${theme.muted};text-transform:uppercase;letter-spacing:0.05em;padding:3px 8px 4px;border-bottom:1px solid ${theme.borderLight};position:sticky;top:0;background:${theme.bg};z-index:1;`;
      hdr.textContent = label + "  —  WA%  ·  attempts";
      wrap.appendChild(hdr);

      if (!items.length) {
        const empty = document.createElement("div");
        empty.style.cssText = `padding:8px;color:${theme.emptyText};font-style:italic;font-size:13px;`;
        empty.textContent = "No data";
        wrap.appendChild(empty);
        return wrap;
      }

      items.forEach((t, i) => {
        const row = document.createElement("div");
        row.style.cssText = `display:flex;flex-direction:column;padding:3px 8px 4px;${i % 2 === 1 ? `background:${theme.borderLighter};` : ""}`;

        // top line: name + stat
        const topLine = document.createElement("div");
        topLine.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:6px;";

        const name = document.createElement("span");
        name.style.cssText = `font-size:13px;font-weight:500;color:${theme.weakTopicName};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;`;
        name.textContent = t.topic;

        const stat = document.createElement("span");
        const c = waColor(t.waRatio);
        stat.style.cssText = `font-size:12px;font-weight:700;color:${c};white-space:nowrap;flex-shrink:0;`;
        stat.textContent = `${t.waRatio}% · ${t.attempts}`;

        topLine.appendChild(name);
        topLine.appendChild(stat);
        row.appendChild(topLine);

        // bar track
        const track = document.createElement("div");
        track.style.cssText = `margin-top:3px;height:4px;border-radius:2px;background:${theme.borderLight};overflow:hidden;`;
        const fill = document.createElement("div");
        fill.style.cssText = `height:100%;width:0%;border-radius:2px;background:${c};transition:width 0.4s ease;`;
        track.appendChild(fill);
        row.appendChild(track);
        wrap.appendChild(row);

        // animate fill after paint
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fill.style.width = t.waRatio + "%";
        }));
      });

      return wrap;
    }

    // info line
    const frictionInfo = frictionScrollBox.previousElementSibling;
    let fiEl = frictionSection.querySelector(".friction-info");
    if (!fiEl) {
      fiEl = document.createElement("div");
      fiEl.className = "friction-info";
      fiEl.style.cssText = `color:${theme.muted};font-size:13px;margin-bottom:6px;`;
      frictionSection.insertBefore(fiEl, frictionScrollBox);
    }
    fiEl.style.color = theme.muted;
    fiEl.textContent = `Showing ${contestList.length} ${frictionView === "topics" ? "topics" : "rating buckets"} (${cat}) · ${globalList.length} (Overall)`;

    // two scrollable columns
    frictionScrollBox.style.display = "flex";
    frictionScrollBox.style.gap = "0";
    frictionScrollBox.style.overflow = "hidden";
    frictionScrollBox.style.padding = "0";

    const leftScroll = document.createElement("div");
    leftScroll.style.cssText = `flex:1;min-width:0;overflow-y:auto;border-right:1px solid ${theme.borderLight};`;
    leftScroll.appendChild(makeList(contestList, cat));

    const rightScroll = document.createElement("div");
    rightScroll.style.cssText = "flex:1;min-width:0;overflow-y:auto;";
    rightScroll.appendChild(makeList(globalList, "Overall"));

    frictionScrollBox.appendChild(leftScroll);
    frictionScrollBox.appendChild(rightScroll);
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

    const waRow = document.createElement("tr");
    const waLbl = document.createElement("td");
    waLbl.style.cssText = `padding:6px 8px;color:${theme.tableHeaderText};font-size:12px;font-weight:600;border-top:1px solid ${theme.borderLighter};`;
    waLbl.textContent = "WA%";
    waRow.appendChild(waLbl);
    allIdx.forEach(idx => {
      const attempts = idxAttempts[idx] || 0;
      const solved = idxSolved[idx] || 0;
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:6px 8px;font-weight:700;border-top:1px solid ${theme.borderLighter};`;
      if (attempts > 0) {
        const waRatio = Math.round(((attempts - solved) / attempts) * 100);
        let color = "#e74c3c";
        if (waRatio < 40) color = "#27ae60";
        else if (waRatio < 70) color = "#e67e22";
        td.style.color = color;
        td.textContent = waRatio + "%";
      } else {
        td.style.color = theme.tableCellText;
        td.textContent = "—";
      }
      waRow.appendChild(td);
    });
    table.appendChild(waRow);
  }

  let currentCategory = DEFAULT_CATEGORY;
  let lastModeData = null;

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
    info.textContent = `Participated in ${modeData.participatedCount} contests (${cat}: ${categoryCount}) · ${mode[0].toUpperCase() + mode.slice(1)} · ${timelineLabel}`;

    renderTableForCategory(modeData, cat);
    renderFrictionPanels(modeData, cat);
  }

  const handle = (window.location.pathname.split("/")[2] || "").trim();
  if (!handle) {
    info.textContent = "Could not detect a Codeforces username in the page URL.";
    return;
  }

  await fetchContests();
  const ok = await fetchAndStore(handle);
  if (!ok) return;

  renderCategory(DEFAULT_CATEGORY);

})();