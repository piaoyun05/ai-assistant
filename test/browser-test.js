/* 浏览器级渲染测试：jsdom + 手动注入脚本，验证路由、交互、数据联动 */
const { JSDOM, VirtualConsole } = require('jsdom');
const http = require('http');

const BASE = 'http://127.0.0.1:8734/';
const SCRIPT_ORDER = ['js/store.js', 'js/ai.js', 'js/ocr.js',
  'js/views/home.js', 'js/views/chat.js', 'js/views/notes.js',
  'js/views/ocrview.js', 'js/views/schedule.js', 'js/views/settings.js', 'js/app.js'];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const html = await fetchText(BASE + 'index.html');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));

  const dom = new JSDOM(html, {
    url: BASE + 'index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const { window } = dom;
  const doc = window.document;

  // 手动注入本地脚本（script 元素方式，保留 const 全局词法绑定）
  for (const f of SCRIPT_ORDER) {
    try {
      const code = await fetchText(BASE + f);
      const s = doc.createElement('script');
      s.textContent = code;
      doc.body.appendChild(s);
    } catch (e) { errors.push('加载失败 ' + f + ': ' + e.message); }
  }

  await new Promise(r => setTimeout(r, 300));
  window.eval('Router.dispatch()');

  await new Promise(r => setTimeout(r, 200));

  let pass = 0, fail = 0;
  const check = (name, cond, extra) => {
    if (cond) { console.log('PASS ' + name); pass++; }
    else { console.log('FAIL ' + name + (extra ? ' → ' + extra : '')); fail++; }
  };

  check('首页渲染（问候语）', !!doc.querySelector('.greeting'), doc.querySelector('.greeting')?.textContent);
  check('快捷入口渲染', doc.querySelectorAll('.quick-item').length === 4, String(doc.querySelectorAll('.quick-item').length));
  check('顶部标题为「个人AI助手」', doc.querySelector('#header-title').textContent === '个人AI助手', doc.querySelector('#header-title').textContent);
  check('底部导航已移除', doc.querySelectorAll('.bottom-nav, .nav-item').length === 0, String(doc.querySelectorAll('.bottom-nav, .nav-item').length));

  // 对话页
  window.location.hash = '#/chat';
  await new Promise(r => setTimeout(r, 200));
  check('对话页渲染（列表/空态）', !!doc.querySelector('.list-item, .empty'), '');
  check('对话页顶栏仍为「个人AI助手」', doc.querySelector('#header-title').textContent === '个人AI助手', doc.querySelector('#header-title').textContent);
  check('对话页有返回按钮', !doc.querySelector('#header-back').hidden, '');

  // 笔记页
  window.location.hash = '#/notes';
  await new Promise(r => setTimeout(r, 200));
  check('笔记页渲染', !!doc.querySelector('#note-search'), '');
  check('笔记页顶栏仍为「个人AI助手」', doc.querySelector('#header-title').textContent === '个人AI助手', doc.querySelector('#header-title').textContent);
  check('笔记页有返回按钮', !doc.querySelector('#header-back').hidden, '');

  // 新建笔记（FAB）
  const fab = doc.querySelector('#note-fab');
  if (fab) fab.click();
  await new Promise(r => setTimeout(r, 300));
  check('新建笔记跳转编辑器', !!doc.querySelector('#note-title'), '');
  check('AI 操作栏渲染', doc.querySelectorAll('.ai-action-bar button').length === 7, String(doc.querySelectorAll('.ai-action-bar button').length));

  // 编辑器输入 + 自动保存
  doc.querySelector('#note-title').value = '测试笔记';
  doc.querySelector('#note-content').value = '这是一段测试内容';
  doc.querySelector('#note-title').dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1000));
  const stored = window.eval(`Store.notes.list({ q: '测试笔记' })`);
  check('笔记自动保存', stored.length === 1, JSON.stringify(stored));

  // 日程页
  window.location.hash = '#/schedule';
  await new Promise(r => setTimeout(r, 200));
  doc.querySelector('[data-tab="calendar"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('日程页渲染（月历）', !!doc.querySelector('.cal-grid'), '');
  check('段切换按钮', doc.querySelectorAll('.seg button').length === 2, String(doc.querySelectorAll('.seg button').length));

  // 待办新建
  doc.querySelector('[data-tab="todos"]').click();
  await new Promise(r => setTimeout(r, 200));
  doc.querySelector('[data-open="todo"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('待办弹层打开', !!doc.querySelector('#td-text'), '');
  doc.querySelector('#td-text').value = '测试待办';
  doc.querySelector('[data-c="ok"]').click();
  await new Promise(r => setTimeout(r, 300));
  check('待办创建成功', window.eval('Store.todos.all().length') >= 1, String(window.eval('Store.todos.all().length')));

  // 设置页
  window.location.hash = '#/settings';
  await new Promise(r => setTimeout(r, 200));
  check('设置页渲染', !!doc.querySelector('[data-act="export"]'), '');

  // AI 设置弹层
  doc.querySelector('[data-act="ai-set"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('AI 设置弹层（模型选择）', !!doc.querySelector('#set-model'), '');
  check('测试连接按钮', !!doc.querySelector('[data-c="test"]'), '');
  window.eval('UI.closeSheet()');

  // 顶部返回按钮（首页 → 对话页 → 返回）
  window.location.hash = '#/';
  await new Promise(r => setTimeout(r, 200));
  window.eval(`Router.navigate('/chat')`);
  await new Promise(r => setTimeout(r, 200));
  check('导航到对话页', !!doc.querySelector('#header-back') && !doc.querySelector('#header-back').hidden, '');
  doc.querySelector('#header-back').click();
  await new Promise(r => setTimeout(r, 200));
  check('返回按钮回到首页', !!doc.querySelector('.greeting'), '');

  // OCR 页
  window.location.hash = '#/ocr';
  await new Promise(r => setTimeout(r, 200));
  check('OCR 页渲染（来源选择）', !!doc.querySelector('[data-src="camera"]'), '');

  // 返回首页
  window.location.hash = '#/';
  await new Promise(r => setTimeout(r, 200));
  check('首页概览数据联动', !!doc.querySelector('.overview-num'), '');

  // 回归：遮罩层初始必须隐藏（CSS display 覆盖 hidden 曾导致一直显示「处理中」）
  check('遮罩层初始隐藏', doc.querySelector('#loading-mask').hidden && doc.querySelector('#confirm-mask').hidden && doc.querySelector('#sheet-mask').hidden, '');
  const cssText = await fetchText(BASE + 'css/app.css');
  check('CSS 含 [hidden] 规则', /\[hidden\]\s*{[^}]*display:\s*none/i.test(cssText), '');

  const errBlocking = errors.filter(e => !/scrollTo/.test(e));
  check('无运行时错误', errBlocking.length === 0, errBlocking.slice(0, 6).join(' | '));

  console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试执行失败:', e); process.exit(1); });
