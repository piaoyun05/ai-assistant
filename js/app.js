/* =========================================================
   App 核心：SVG 图标库、UI 组件、Markdown 渲染、Hash 路由
   ========================================================= */

/* ---------- SVG 图标库（Lucide 风格） ---------- */
const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sparkles: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.9L12 18l-1.9-5.4L4 10l6.1-1.2z"/><path d="M19 14l.9 2.6L22.5 17l-2.6.9L19 20.5l-.9-2.6L15.5 17l2.6-.9z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  refresh: '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  translate: '<path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.3-3.6-.8L3 21l1.4-5.2A8.5 8.5 0 1 1 21 12z"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"/>',
  note: '<path d="M5 3h10l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm9 1v4h4l-4-4z"/>',
  more: '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'
};

function icon(name, cls = '') {
  const body = ICONS[name] || ICONS.sparkles;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/* ---------- 通用工具 ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60e3) return '刚刚';
  if (diff < 3600e3) return Math.floor(diff / 60e3) + ' 分钟前';
  if (d.toISODate() === now.toISODate()) return '今天 ' + hhmm(d);
  if (d.toISODate() === new Date(now.getTime() - 864e5).toISODate()) return '昨天 ' + hhmm(d);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hhmm(d)}`;
}

function fmtDate(dateStr, withWeek = false) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const w = withWeek ? ' ' + '周' + '日一二三四五六'[d.getDay()] : '';
  return `${d.getMonth() + 1}月${d.getDate()}日${w}`;
}

function hhmm(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/* ---------- Markdown 简易渲染 ---------- */
function md(text) {
  if (!text) return '';
  let s = esc(text);
  // 代码块
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => `<pre><code>${code.replace(/\n$/, '')}</code></pre>`);
  // 行内代码
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // 标题
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  // 任务列表
  s = s.replace(/^\s*- \[([ xX])\]\s*(.*)$/gm, (m, chk, txt) =>
    `<div style="display:flex;gap:6px;align-items:flex-start;margin:3px 0">${chk === 'x' || chk === 'X' ? '☑' : '☐'}<span>${txt}</span></div>`);
  // 无序列表
  s = s.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  // 有序列表
  s = s.replace(/^\s*\d+[.、]\s+(.*)$/gm, '<li>$1</li>');
  // 引用
  s = s.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  // 粗体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 行内链接
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // 段落
  s = s.split(/\n{2,}/).map(p => {
    if (/^\s*<(ul|ol|li|h1|h2|h3|pre|blockquote)/.test(p)) return p;
    if (/(?:<li>.*<\/li>\s*)+/.test(p) || /(?:<h[1-3]>|<pre>|<blockquote>)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return s;
}

/* ---------- UI 组件 ---------- */
const UI = {
  toastTimer: null,
  toast(msg, ms = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  },
  confirm(text, okText = '确定') {
    return new Promise(resolve => {
      const mask = document.getElementById('confirm-mask');
      document.getElementById('confirm-text').textContent = text;
      document.getElementById('confirm-ok').textContent = okText;
      mask.hidden = false;
      const done = v => { mask.hidden = true; off(); resolve(v); };
      const onOk = () => done(true);
      const onCancel = () => done(false);
      const onMask = e => { if (e.target === mask) done(false); };
      const off = () => {
        document.getElementById('confirm-ok').removeEventListener('click', onOk);
        document.getElementById('confirm-cancel').removeEventListener('click', onCancel);
        mask.removeEventListener('click', onMask);
      };
      document.getElementById('confirm-ok').addEventListener('click', onOk);
      document.getElementById('confirm-cancel').addEventListener('click', onCancel);
      mask.addEventListener('click', onMask);
    });
  },
  /** 打开底部弹层，返回 { root, close } */
  sheet(html) {
    const mask = document.getElementById('sheet-mask');
    const body = document.getElementById('sheet-body');
    body.innerHTML = html;
    mask.hidden = false;
    return {
      root: body,
      close() { mask.hidden = true; body.innerHTML = ''; }
    };
  },
  closeSheet() {
    document.getElementById('sheet-mask').hidden = true;
    document.getElementById('sheet-body').innerHTML = '';
  },
  loadingCount: 0,
  loading(text = '处理中…', on = true) {
    const mask = document.getElementById('loading-mask');
    document.getElementById('loading-text').textContent = text;
    if (on) { this.loadingCount++; mask.hidden = false; }
    else { this.loadingCount = Math.max(0, this.loadingCount - 1); if (!this.loadingCount) mask.hidden = true; }
  },
  /** 操作面板：底部弹出一个列表 */
  actionSheet(items) {
    const html = `<div class="sheet-title">操作</div>
      ${items.map((it, i) => `<button class="setting-item" data-i="${i}" style="width:100%">
        <span class="set-icon" style="background:${it.color || '#f3f4f6'};color:${it.textColor || '#4b5563'}">${icon(it.icon || 'sparkles')}</span>
        <span class="set-main"><span class="set-title">${esc(it.label)}</span></span>
        ${it.desc ? `<span class="set-desc">${esc(it.desc)}</span>` : ''}
      </button>`).join('')}
      <button class="btn btn-plain btn-block" data-i="-1" style="margin-top:10px">取消</button>`;
    return new Promise(resolve => {
      const { root, close } = UI.sheet(html);
      const off = () => { close(); root.removeEventListener('click', onTap); };
      const onTap = e => {
        const btn = e.target.closest('[data-i]');
        if (!btn) return;
        const i = Number(btn.dataset.i);
        off();
        if (i >= 0) resolve(items[i]);
      };
      root.addEventListener('click', onTap);
    });
  }
};

/* ---------- Hash 路由 ---------- */
const Router = {
  backStack: [],
  current: '',
  parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const segs = h.split('/').filter(Boolean);
    const path = '/' + (segs[0] || '');
    const rest = segs.slice(1);
    return { path, rest };
  },
  navigate(to) {
    const { path } = this.parse();
    if (to !== path) this.backStack.push(path);
    if (location.hash === '#' + to) this.dispatch();
    else location.hash = to;
  },
  back() {
    const prev = this.backStack.pop();
    location.hash = prev && prev !== this.current ? prev : '/';
    if (prev === this.current || !prev) this.dispatch();
  },
  dispatch() {
    const { path, rest } = this.parse();
    let route = path === '/' ? 'home' : path.slice(1);
    const view = Views[route] || Views.home;
    this.current = route;
    ViewManager.render(view, rest);
  }
};

/* ---------- 视图渲染器与页头 ---------- */
const ViewManager = {
  render(view, rest) {
    // 清理上一视图遗留的笔记编辑定时器
    if (App._noteCleanups.length) {
      App._noteCleanups.forEach(fn => { try { fn(); } catch (e) {} });
      App._noteCleanups = [];
    }
    // 页头：统一显示「个人AI助手」
    const header = view.header ? view.header(rest) : { title: view.title || '', back: false, actions: '' };
    document.getElementById('header-title').textContent = '个人AI助手';
    const backBtn = document.getElementById('header-back');
    backBtn.hidden = !header.back;
    backBtn.onclick = () => Router.back();
    const headerEl = document.getElementById('header-actions');
    headerEl.innerHTML = header.actions || '';
    headerEl.onclick = e => {
      const btn = e.target.closest('[data-action]');
      if (btn && view.onHeaderAction) view.onHeaderAction(btn.dataset.action, rest);
    };

    // 渲染
    const root = document.getElementById('view-root');
    root.classList.remove('view-enter'); void root.offsetWidth;
    root.innerHTML = view.render ? view.render(rest) : '';
    root.classList.add('view-enter');
    if (view.bind) view.bind(root, rest);

    // 导航高亮
    document.querySelectorAll('.nav-item').forEach(b => {
      const tab = b.dataset.route.slice(1); // '' for home
      const active = tab === '' ? (this._tabOf(view.name) === 'home') : (this._tabOf(view.name) === tab);
      b.classList.toggle('active', active);
    });
    window.scrollTo(0, 0);
  },
  _tabOf(name) {
    const map = { home: 'home', chat: 'chat', notes: 'notes', note: 'notes', ocr: 'notes', schedule: 'schedule', todos: 'schedule', settings: 'settings' };
    return map[name] || 'home';
  }
};

/* ---------- 应用级状态与通用跳转 ---------- */
const App = {
  autoAsk: null,          // 进入对话页后自动发问的 chatId
  pendingOcrMode: null,   // OCR 页默认来源
  pendingEventData: null, // 日程页默认新建数据
  pendingTodoData: null,
  noteAiBusy: {},         // 笔记后台 AI 任务并发锁（key: note:<id>）
  _noteCleanups: []       // 笔记编辑器定时器清理函数
};

/** 为容器内所有 [data-goto] 元素绑定跳转（支持 ?key=val 查询参数） */
function bindGoto(root) {
  root.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => {
      const raw = el.getAttribute('data-goto');
      const [path, query] = raw.split('?');
      if (query) {
        query.split('&').forEach(kv => {
          const [k, v] = kv.split('=');
          if (k === 'mode') App.pendingOcrMode = v;
          if (k === 'new') App.pendingNewNote = v === '1';
          if (k === 'newEvent') App.pendingEventData = v === '1' ? {} : null;
          if (k === 'tab') App.pendingTab = v;
          if (k === 'newTodo') App.pendingTodoData = v === '1' ? {} : null;
        });
      }
      Router.navigate(path);
    });
  });
}

/** 复制文本到剪贴板 */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    UI.toast('已复制');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    UI.toast('已复制');
  }
}

/* ---------- 视图注册与启动 ---------- */
const Views = {
  home: HomeView,
  chat: ChatView,
  notes: NotesView,
  note: NotesView,      // /note/:id 笔记编辑器
  ocr: OcrView,
  schedule: ScheduleView,
  settings: SettingsView
};

window.addEventListener('hashchange', () => Router.dispatch());

function boot() {
  Store.load();
  // 底部导航
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => Router.navigate(btn.dataset.route));
  });
  Router.dispatch();
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot);
else boot();

/* ---------- 语音输入（webkit 方案，Chrome/Edge） ---------- */
function speechRecognize(onResult) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { UI.toast('当前浏览器不支持语音输入，建议使用 Chrome/Edge'); return null; }
  const rec = new SR();
  rec.lang = 'zh-CN';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = e => { const t = e.results[0][0].transcript; if (t) onResult(t); };
  rec.onerror = e => { if (e.error !== 'aborted') UI.toast('语音识别失败：' + e.error); };
  rec.start();
  return rec;
}
