const STORAGE_KEY = "mc_wizard_v2";

/** @returns {any} */
function getState() {
  try { 
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // 默认值
    const defaults = {
      hostName: "主持人",
      date: "",
      venue: "",
      themeId: "generic",
      themeName: "通用宴会",
      styleId: "warm",
      styleName: "温馨走心",
      groom: "",
      bride: "",
      mainPerson: "",
      groomFather: "",
      groomMother: "",
      brideFather: "",
      brideMother: "",
      selectedSegments: []
    };
    return { ...defaults, ...saved };
  }
  catch { 
    return {
      hostName: "主持人",
      date: "",
      venue: "",
      themeId: "generic",
      themeName: "通用宴会",
      styleId: "warm",
      styleName: "温馨走心",
      groom: "",
      bride: "",
      mainPerson: "",
      groomFather: "",
      groomMother: "",
      brideFather: "",
      brideMother: "",
      selectedSegments: []
    };
  }
}

function setState(patch) {
  const cur = getState();
  const next = { ...cur, ...patch, _updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function go(url){ window.location.href = url; }

function setStepper(activeIndex) {
  const steps = qsa("[data-step]");
  steps.forEach((el, idx) => {
    el.classList.remove("active","done");
    if (idx === activeIndex) el.classList.add("active");
    if (idx < activeIndex) el.classList.add("done");
  });
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// 获取格式化的今天日期（中文格式）
function getTodayFormatted() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${year}年${month}月${day}日`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadThemes() {
  const res = await fetch("../data/themes.json");
  if (!res.ok) throw new Error("无法读取 themes.json");
  return await res.json();
}

async function loadThemeSegments(themeId) {
  const themes = await loadThemes();
  const theme = themes.themes.find(t => t.id === themeId);
  if (!theme) throw new Error("未知主题");
  const res = await fetch(`../data/${theme.dataFile}`);
  if (!res.ok) throw new Error("无法读取主题环节数据");
  return await res.json();
}

function normalizePeopleForTheme(state) {
  const coupleThemes = new Set(["wedding","engagement","homecoming"]);
  const isCouple = coupleThemes.has(state.themeId);
  return {
    isCouple,
    groom: (state.groom || "").trim(),
    bride: (state.bride || "").trim(),
    mainPerson: (state.mainPerson || "").trim(),
    groomFather: (state.groomFather || "").trim(),
    groomMother: (state.groomMother || "").trim(),
    brideFather: (state.brideFather || "").trim(),
    brideMother: (state.brideMother || "").trim(),
  };
}

function requireFields(fields) {
  const missing = [];
  fields.forEach(f => {
    const el = qs(`#${f.id}`);
    const v = (el?.value || "").trim();
    if (!v) missing.push(f.label);
  });
  if (missing.length) {
    alert("请先填写：\n- " + missing.join("\n- "));
    return false;
  }
  return true;
}

function applyTemplate(text, ctx) {
  return String(text)
    .replaceAll("{{HOST}}", ctx.hostName)
    .replaceAll("{{VENUE}}", ctx.venue)
    .replaceAll("{{DATE}}", ctx.date)
    .replaceAll("{{GROOM}}", ctx.groom)
    .replaceAll("{{BRIDE}}", ctx.bride)
    .replaceAll("{{MAIN}}", ctx.mainPerson)
    .replaceAll("{{GROOM_FATHER}}", ctx.groomFather)
    .replaceAll("{{GROOM_MOTHER}}", ctx.groomMother)
    .replaceAll("{{BRIDE_FATHER}}", ctx.brideFather)
    .replaceAll("{{BRIDE_MOTHER}}", ctx.brideMother);
}

function buildContext(state) {
  const p = normalizePeopleForTheme(state);
  return {
    hostName: (state.hostName || "主持人").trim(),
    venue: (state.venue || "现场").trim(),
    date: (state.date || "").trim(),
    themeId: state.themeId,
    themeName: state.themeName || "",
    styleId: state.styleId || "warm",
    styleName: state.styleName || "温馨走心",
    ...p,
  };
}

function chooseText(obj, styleId) {
  if (typeof obj === "string") return obj;
  if (!obj || typeof obj !== "object") return "";
  return obj[styleId] || obj.warm || Object.values(obj)[0] || "";
}

function buildResultText(themeData, state) {
  const ctx = buildContext(state);
  const selected = state.selectedSegments || [];
  const segById = new Map(themeData.segments.map(s => [s.id, s]));
  const picked = selected.map(id => segById.get(id)).filter(Boolean);

  const subject = (() => {
    const coupleThemes = new Set(["wedding","engagement","homecoming"]);
    if (coupleThemes.has(ctx.themeId)) {
      const a = ctx.groom || "新郎";
      const b = ctx.bride || "新娘";
      return `${a} & ${b}`;
    }
    return ctx.mainPerson || "主角";
  })();

  const lines = [];
  lines.push(`【主题】${ctx.themeName}（${ctx.styleName}）`);
  lines.push(`【对象】${subject}`);
  if (ctx.date) lines.push(`【日期】${ctx.date}`);
  if (ctx.venue) lines.push(`【地点】${ctx.venue}`);
  lines.push("");
  lines.push("【流程目录】");
  picked.forEach((s, i) => {
    lines.push(`${String(i+1).padStart(2,"0")}. ${s.title}`);
  });
  lines.push("");
  lines.push("——— 正文开始 ———");
  lines.push("");

  picked.forEach((s, i) => {
    const explain = chooseText(s.explain, ctx.styleId);
    const hostLines = (s.hostLines || []).map(x => chooseText(x, ctx.styleId));
    lines.push(`【${i+1}. ${s.title}】`);
    lines.push(`【环节说明】${applyTemplate(explain, ctx)}`);
    lines.push("【主持台词】");
    hostLines.forEach(t => lines.push(applyTemplate(t, ctx)));
    if (s.altLines && s.altLines.length) {
      lines.push("【可选备选说法】");
      s.altLines.map(x => chooseText(x, ctx.styleId)).forEach(t => lines.push(applyTemplate(t, ctx)));
    }
    if (s.notes) {
      const nt = chooseText(s.notes, ctx.styleId);
      if (nt) lines.push(`【注意事项】${applyTemplate(nt, ctx)}`);
    }
    lines.push("");
  });

  lines.push("——— 通用救场句库 ———");
  (themeData.emergency || []).forEach(t => lines.push(applyTemplate(chooseText(t, ctx.styleId), ctx)));

  return lines.join("\n");
}

function buildResultHtml(themeData, state) {
  const ctx = buildContext(state);
  const selected = state.selectedSegments || [];
  const segById = new Map(themeData.segments.map(s => [s.id, s]));
  const picked = selected.map(id => segById.get(id)).filter(Boolean);

  const subject = (() => {
    const coupleThemes = new Set(["wedding","engagement","homecoming"]);
    if (coupleThemes.has(ctx.themeId)) {
      const a = ctx.groom || "新郎";
      const b = ctx.bride || "新娘";
      return `${a} 与 ${b}`;
    }
    return ctx.mainPerson || "主角";
  })();

  const meta = [];
  meta.push(`<div class="notice"><div><b>主题：</b>${escapeHtml(ctx.themeName)}（${escapeHtml(ctx.styleName)}）</div>`);
  meta.push(`<div><b>对象：</b>${escapeHtml(subject)}</div>`);
  if (ctx.date) meta.push(`<div><b>日期：</b>${escapeHtml(ctx.date)}</div>`);
  if (ctx.venue) meta.push(`<div><b>地点：</b>${escapeHtml(ctx.venue)}</div>`);
  meta.push(`</div>`);

  const toc = picked.map((s, i) =>
    `<a href="#seg-${escapeHtml(s.id)}">${String(i+1).padStart(2,"0")}. ${escapeHtml(s.title)}</a>`
  ).join("");

  const body = picked.map((s, i) => {
    const explain = applyTemplate(chooseText(s.explain, ctx.styleId), ctx);
    const hostLines = (s.hostLines || []).map(x => applyTemplate(chooseText(x, ctx.styleId), ctx));
    const alt = (s.altLines || []).map(x => applyTemplate(chooseText(x, ctx.styleId), ctx));
    const notes = s.notes ? applyTemplate(chooseText(s.notes, ctx.styleId), ctx) : "";
    return `
      <section id="seg-${escapeHtml(s.id)}">
        <h3>${escapeHtml(String(i+1)+". "+s.title)}</h3>
        <p><b>环节说明：</b>${escapeHtml(explain)}</p>
        <div class="mono"><b>主持台词：</b>\n${escapeHtml(hostLines.join("\n"))}</div>
        ${alt.length ? `<div class="mono" style="margin-top:10px"><b>可选备选说法：</b>\n${escapeHtml(alt.join("\n"))}</div>` : ""}
        ${notes ? `<p style="margin-top:10px"><b>注意事项：</b>${escapeHtml(notes)}</p>` : ""}
      </section>
    `;
  }).join("");

  const emergency = (themeData.emergency || []).map(t => applyTemplate(chooseText(t, ctx.styleId), ctx));
  const emergencyHtml = `
    <section id="emergency">
      <h3>通用救场句库</h3>
      <div class="mono">${escapeHtml(emergency.join("\n"))}</div>
    </section>
  `;

  return `
    <article>
      <h2>主持稿（可直接照读）</h2>
      ${meta.join("")}
      <hr class="sep" />
      <div class="toc"><b>流程目录（可点跳转）</b>${toc}</div>
      <hr class="sep" />
      ${body}
      <hr class="sep" />
      ${emergencyHtml}
    </article>
  `;
}

// ============ 喜庆主题功能 ============

// 主题配置
const THEME_CONFIG = {
  wedding: { icon: '💒', decorations: ['💐', '🌹', '💍', '🎊', '✨'], bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)' },
  engagement: { icon: '💍', decorations: ['💎', '🌸', '💕', '✨', '🎀'], bgGradient: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)' },
  homecoming: { icon: '🏠', decorations: ['🎉', '🌺', '💝', '✨', '🎊'], bgGradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)' },
  graduation: { icon: '🎓', decorations: ['📚', '🏆', '⭐', '🎊', '✨'], bgGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' },
  thanks_teacher: { icon: '👨‍🏫', decorations: ['🍎', '📖', '💐', '⭐', '✨'], bgGradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' },
  baby100: { icon: '👶', decorations: ['🍼', '🧸', '🎈', '💕', '✨'], bgGradient: 'linear-gradient(135deg, #fff0f5 0%, #ffe4ed 100%)' },
  birthday: { icon: '🎂', decorations: ['🎁', '🎈', '🎉', '🍰', '✨'], bgGradient: 'linear-gradient(135deg, #fff9e6 0%, #ffecb3 100%)' },
  longevity: { icon: '🍑', decorations: ['🎋', '🧧', '🏮', '✨', '🎊'], bgGradient: 'linear-gradient(135deg, #faf0e6 0%, #f5deb3 100%)' },
  housewarming: { icon: '🏡', decorations: ['🔑', '🪴', '🎊', '✨', '🎉'], bgGradient: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)' },
  annualparty: { icon: '🎉', decorations: ['🥂', '🎊', '🎆', '✨', '🎇'], bgGradient: 'linear-gradient(135deg, #ede7f6 0%, #d1c4e9 100%)' },
  generic: { icon: '🎊', decorations: ['✨', '🎉', '💫', '🌟', '⭐'], bgGradient: 'linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%)' }
};

// 舒缓背景音乐（使用轻柔的钢琴/古典音乐）
const THEME_MUSIC = {
  wedding: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // 婚礼 - 轻快温馨
  engagement: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // 订婚宴
  homecoming: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', // 回门宴
  graduation: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', // 升学宴
  thanks_teacher: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', // 谢师宴
  baby100: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', // 百日宴
  birthday: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', // 生日宴
  longevity: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', // 寿宴
  housewarming: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', // 乔迁宴
  annualparty: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', // 年会
  generic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' // 通用
};

// 舒缓轻音乐（高质量免费资源）
const SOFT_MUSIC = {
  wedding: 'https://cdn.pixabay.com/audio/2022/10/05/audio_6864700b91.mp3',
  engagement: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a734d3.mp3',
  homecoming: 'https://cdn.pixabay.com/audio/2022/02/07/audio_556482c2c6.mp3',
  graduation: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
  thanks_teacher: 'https://cdn.pixabay.com/audio/2021/11/27/audio_3295f9f98a.mp3',
  baby100: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a734d3.mp3',
  birthday: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8b9382eb23.mp3',
  longevity: 'https://cdn.pixabay.com/audio/2022/02/07/audio_556482c2c6.mp3',
  housewarming: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
  annualparty: 'https://cdn.pixabay.com/audio/2021/11/27/audio_3295f9f98a.mp3',
  generic: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a734d3.mp3'
};

// 当前音乐播放器
let currentAudio = null;
let isMusicPlaying = false;

// 设置页面主题
function setPageTheme(themeId) {
  try {
    // 确保DOM已准备好
    if (!document.body) {
      console.log('DOM未就绪，延迟设置主题');
      setTimeout(() => setPageTheme(themeId), 100);
      return null;
    }
    
    const config = THEME_CONFIG[themeId] || THEME_CONFIG.generic;
    if (!config) return null;
    
    // 设置body主题属性
    document.body.setAttribute('data-theme', themeId || 'generic');
    
    // 添加飘落装饰
    if (config.decorations && Array.isArray(config.decorations)) {
      startFallingDecorations(config.decorations);
    }
    
    // 创建音乐播放器
    createMusicPlayer(themeId);
    
    return config;
  } catch (error) {
    console.error('设置页面主题失败:', error);
    return null;
  }
}

// 飘落装饰动画
let fallingInterval = null;
function startFallingDecorations(decorations) {
  try {
    if (!document.body || !decorations || !Array.isArray(decorations) || decorations.length === 0) {
      return;
    }
    // 清除旧的装饰和定时器
    document.querySelectorAll('.falling-decoration').forEach(el => el.remove());
    if (fallingInterval) {
      clearInterval(fallingInterval);
      fallingInterval = null;
    }
    
    // 创建新装饰
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        createFallingElement(decorations);
      }, i * 300);
    }
    
    // 持续创建
    fallingInterval = setInterval(() => {
      createFallingElement(decorations);
    }, 2000);
  } catch (error) {
    console.error('启动飘落装饰动画失败:', error);
  }
}

function createFallingElement(decorations) {
  try {
    if (!document.body || !decorations || !Array.isArray(decorations) || decorations.length === 0) {
      return;
    }
    const el = document.createElement('div');
    el.className = 'falling-decoration';
    el.textContent = decorations[Math.floor(Math.random() * decorations.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (Math.random() * 5 + 5) + 's';
    el.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(el);
    
    // 动画结束后移除
    setTimeout(() => {
      if (el.parentNode) {
        el.remove();
      }
    }, 12000);
  } catch (error) {
    console.error('创建飘落装饰失败:', error);
  }
}

// 创建音乐播放器
function createMusicPlayer(themeId) {
  try {
    // 移除旧的播放器
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    // 使用舒缓音乐
    const musicUrl = SOFT_MUSIC[themeId] || SOFT_MUSIC.generic;
    if (!musicUrl) return;
    
    // 创建音频对象
    currentAudio = new Audio(musicUrl);
    currentAudio.loop = true;
    currentAudio.volume = 0.15; // 更低音量，更舒缓
    currentAudio.preload = 'auto';
    
    // 等待页面完全加载后自动播放
    setTimeout(() => {
      if (!currentAudio) return;
      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('音乐开始播放');
            currentAudio.muted = false;
          })
          .catch(e => {
            console.log('音乐自动播放失败（浏览器限制）:', e);
            // 如果自动播放失败，尝试静音播放
            currentAudio.muted = true;
            currentAudio.play().catch(err => console.log('静音播放也失败:', err));
          });
      }
    }, 800);
    
    isMusicPlaying = true;
  } catch (error) {
    console.error('创建音乐播放器失败:', error);
  }
}

// 显示主题图标
function showThemeIcon(themeId) {
  try {
    // 确保document.body存在
    if (!document.body) {
      console.log('body元素不存在，延迟显示主题图标');
      setTimeout(() => showThemeIcon(themeId), 100);
      return;
    }
    
    const config = THEME_CONFIG[themeId] || THEME_CONFIG.generic;
    if (!config) return;
    
    const existing = document.querySelector('.theme-icon-container');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.className = 'theme-icon-container';
    container.innerHTML = `<div class="theme-icon">${config.icon}</div>`;
    
    // 插入到第一个card中
    const firstCard = document.querySelector('.card');
    if (firstCard && firstCard.parentNode) {
      firstCard.insertBefore(container, firstCard.firstChild);
    } else {
      // 如果没有card，添加到body开头
      document.body.insertBefore(container, document.body.firstChild);
    }
  } catch (error) {
    console.error('显示主题图标失败:', error);
  }
}

// 庆祝动画
function showCelebration() {
  const celebrations = ['🎉', '🎊', '✨', '🎆', '🎇', '💐', '🎈'];
  const el = document.createElement('div');
  el.className = 'celebration';
  el.textContent = celebrations[Math.floor(Math.random() * celebrations.length)];
  document.body.appendChild(el);
  
  setTimeout(() => el.remove(), 1000);
}

// 页面加载时初始化
function initFestiveFeatures() {
  // 确保DOM已准备好
  if (!document.body) {
    console.log('DOM未就绪，延迟初始化');
    setTimeout(initFestiveFeatures, 100);
    return;
  }
  const state = getState();
  if (state.themeId) {
    setPageTheme(state.themeId);
    showThemeIcon(state.themeId);
  }
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFestiveFeatures);
} else {
  // DOM已加载，直接执行
  initFestiveFeatures();
}

// 全局错误捕获
window.addEventListener('error', function(event) {
  console.error('全局错误捕获:', event.error || event.message, 'at', event.filename, ':', event.lineno);
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
  console.error('未处理的Promise拒绝:', event.reason);
});
