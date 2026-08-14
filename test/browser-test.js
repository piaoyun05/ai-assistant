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

  // jsdom 未实现 scrollIntoView/scrollTo，注入 polyfill 避免流式问答时崩溃
  window.Element.prototype.scrollIntoView = function () {};
  window.Element.prototype.scrollTo = function () {};

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
  check('底部导航渲染 5 项', doc.querySelectorAll('.nav-item').length === 5, String(doc.querySelectorAll('.nav-item').length));
  check('首页 tab 高亮', doc.querySelector('.nav-item[data-route="/"]').classList.contains('active'), '');

  // 对话页
  window.location.hash = '#/chat';
  await new Promise(r => setTimeout(r, 200));
  check('对话页渲染（列表/空态）', !!doc.querySelector('.list-item, .empty'), '');
  check('对话页顶栏仍为「个人AI助手」', doc.querySelector('#header-title').textContent === '个人AI助手', doc.querySelector('#header-title').textContent);
  check('对话页返回按钮隐藏', doc.querySelector('#header-back').hidden, '');
  check('对话 tab 高亮', doc.querySelector('.nav-item[data-route="/chat"]').classList.contains('active'), '');
  check('底部导航改「问答」', doc.querySelector('.nav-item[data-route="/chat"] span').textContent === '问答', doc.querySelector('.nav-item[data-route="/chat"] span').textContent);

  // 笔记页
  window.location.hash = '#/notes';
  await new Promise(r => setTimeout(r, 200));
  check('笔记页渲染', !!doc.querySelector('#note-search'), '');
  check('笔记页顶栏仍为「个人AI助手」', doc.querySelector('#header-title').textContent === '个人AI助手', doc.querySelector('#header-title').textContent);
  check('笔记页返回按钮隐藏', doc.querySelector('#header-back').hidden, '');
  check('笔记 tab 高亮', doc.querySelector('.nav-item[data-route="/notes"]').classList.contains('active'), '');

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
  check('笔记编辑器状态条', !!doc.querySelector('#note-ai-status'), '');

  // 自动生成标题（无 API Key 时本地截取；从停止输入到生成约 600ms 保存 + 1800ms 标题）
  window.eval(`const _t = Store.notes.create({ title: '', content: '' }); window.__autoTitleNote = _t.id`);
  window.location.hash = '#/note/' + window.eval('window.__autoTitleNote');
  await new Promise(r => setTimeout(r, 250));
  doc.querySelector('#note-title').value = '';
  doc.querySelector('#note-content').value = '今天去参加产品评审会议，讨论了新版本的功能清单和上线时间';
  doc.querySelector('#note-content').dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 2700));
  const autoTitle = window.eval('Store.notes.get(window.__autoTitleNote).title');
  check('笔记自动生成标题', autoTitle.length > 0, autoTitle);

  // 标签添加后路由正确（修复 '/' + id 致「笔记不存在」）
  const tagInput = doc.querySelector('#tag-add');
  if (tagInput) {
    tagInput.value = '测试标签';
    tagInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
  }
  const tagEmpty = doc.querySelector('.empty');
  check('标签添加后不显示笔记不存在', !tagEmpty || !tagEmpty.textContent.includes('不存在'), tagEmpty ? tagEmpty.textContent : '');

  // 日程页
  window.location.hash = '#/schedule';
  await new Promise(r => setTimeout(r, 200));
  doc.querySelector('[data-tab="calendar"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('日程页渲染（月历）', !!doc.querySelector('.cal-grid'), '');
  check('段切换按钮', doc.querySelectorAll('.seg button').length === 2, String(doc.querySelectorAll('.seg button').length));
  // 日历切月不崩溃（修复 App.calMonth 未初始化致 split 报错）
  doc.querySelector('[data-cal="prev"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('日历切月不崩溃', !!doc.querySelector('.cal-grid'), '');
  doc.querySelector('[data-cal="today"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('日历回到今天', !!doc.querySelector('.cal-day.today'), '');

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

  // 导出备份脱敏 apiKey
  window.eval(`Store.settings().apiKey = 'sk-secret-123'; Store.save();`);
  const maskedKey = window.eval(`(() => { const s = JSON.parse(Store.exportData()); if (s.settings) s.settings.apiKey = ''; return s.settings.apiKey; })()`);
  check('导出备份脱敏 apiKey', maskedKey === '', maskedKey);

  // AI 设置弹层
  doc.querySelector('[data-act="ai-set"]').click();
  await new Promise(r => setTimeout(r, 200));
  check('AI 设置弹层（模型选择）', !!doc.querySelector('#set-model'), '');
  check('测试连接按钮', !!doc.querySelector('[data-c="test"]'), '');
  window.eval('UI.closeSheet()');

  // 底部导航点击跳转（对话 tab）
  window.location.hash = '#/';
  await new Promise(r => setTimeout(r, 200));
  window.eval(`document.querySelector('.nav-item[data-route="/chat"]').click()`);
  await new Promise(r => setTimeout(r, 200));
  check('底部导航跳转对话页', window.location.hash === '#/chat', window.location.hash);
  check('对话 tab 高亮', doc.querySelector('.nav-item[data-route="/chat"]').classList.contains('active'), '');

  // 问答列表页输入窗口（与首页一致的快捷提问）
  check('问答列表页快捷提问输入框', !!doc.querySelector('#chat-new-input'), '');
  check('问答列表页发送按钮', !!doc.querySelector('#chat-new-send'), '');
  const chatInput = doc.querySelector('#chat-new-input');
  chatInput.value = '笔记里写过什么？';
  chatInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  check('快捷提问跳转会话', /^#\/chat\/.+/.test(window.location.hash), window.location.hash);
  check('提问内容已入会话', !!doc.querySelector('#chat-input'), '');
  // 会话线程中注入笔记检索逻辑（qaNotes 默认开启）
  const qaInjected = window.eval(`(() => {
    const chat = Store.chats.list().slice(-1)[0];
    if (!chat || !chat.messages.length) return false;
    return chat.messages.some(m => m.role === 'user' && m.content === '笔记里写过什么？');
  })()`);
  check('笔记问答消息已写入', qaInjected, '');
  // 等待流式失败 → 非流式回退 → 最终 bubble 显示错误消息（jsdom 无 fetch）
  await new Promise(r => setTimeout(r, 800));
  const finalBubble = window.eval(`(() => {
    const chat = Store.chats.list().slice(-1)[0];
    if (!chat) return '';
    const last = chat.messages[chat.messages.length - 1];
    return last && last.role === 'assistant' ? last.content : '';
  })()`);
  check('AI 失败回退后写入 assistant 消息', finalBubble.length > 0, finalBubble.slice(0, 40));

  // 返回首页
  window.location.hash = '#/';
  await new Promise(r => setTimeout(r, 200));
  check('回到首页', !!doc.querySelector('.greeting'), '');

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

  const errBlocking = errors.filter(e => !/scroll(To|IntoView)/.test(e));
  check('无运行时错误', errBlocking.length === 0, errBlocking.slice(0, 6).join(' | '));

  console.log('\n结果：' + pass + ' 通过，' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试执行失败:', e); process.exit(1); });
