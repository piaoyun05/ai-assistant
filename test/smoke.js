/* 冒烟测试：用最小 DOM/localStorage 桩加载全部前端 JS 并执行渲染 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- 桩 ----
const listeners = {};
const sandbox = { console, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Promise, TextDecoder, Blob, process, fetch: async () => { throw new Error('fetch 不应在测试中调用'); } };
sandbox.window = sandbox;
sandbox.window.addEventListener = (ev, fn) => { listeners[ev] = fn; };
sandbox.window.scrollTo = () => {};

function fakeEl() {
  return {
    innerHTML: '', textContent: '', hidden: true, value: '',
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, removeAttribute() {}, appendChild() {}, querySelector() { return fakeEl(); },
    querySelectorAll() { return []; }, addEventListener() {}, removeEventListener() {},
    onclick: null, files: [], scrollIntoView() {}
  };
}
sandbox.document = {
  getElementById() { return fakeEl(); },
  querySelectorAll() { return []; },
  createElement() { return fakeEl(); },
  body: { appendChild() {} },
  execCommand() { return false; }
};
const mem = {};
sandbox.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};
sandbox.location = { hash: '' };
sandbox.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
sandbox.navigator = { clipboard: { writeText: async () => {} } };

vm.createContext(sandbox);

// ---- 加载 ----
const root = path.join(__dirname, '..');
for (const f of ['js/store.js', 'js/ai.js', 'js/ocr.js',
  'js/views/home.js', 'js/views/chat.js', 'js/views/notes.js',
  'js/views/ocrview.js', 'js/views/schedule.js', 'js/views/settings.js',
  'js/app.js']) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

// ---- 测试（在沙箱上下文中执行，访问共享全局词法绑定） ----
const testCode = `
let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); pass++; }
  catch (e) { console.error('FAIL ' + name + ' -> ' + e.message); fail++; }
}

check('Store 默认状态创建', () => {
  const s = Store.load();
  if (!s.notes || !s.todos || !s.events || !s.chats) throw new Error('state 结构不完整');
});

check('笔记 CRUD + 搜索', () => {
  Store.reset();
  const n = Store.notes.create({ title: '会议记录', content: '讨论 Q3 计划与预算', tags: ['工作'] });
  Store.notes.update(n.id, { fav: true });
  if (Store.notes.get(n.id).fav !== true) throw new Error('fav 未生效');
  if (Store.notes.list({ q: '预算' }).length !== 1) throw new Error('搜索失败');
  if (Store.notes.list({ tag: '工作' }).length !== 1) throw new Error('标签过滤失败');
});

check('待办/日程/对话 CRUD', () => {
  const t = Store.todos.create({ text: '写周报', priority: 2, dueDate: new Date().toISODate() });
  Store.todos.update(t.id, { done: true });
  if (Store.todos.list('done').length !== 1) throw new Error('待办筛选失败');
  const e = Store.events.create({ title: '项目会议', start: new Date().toISODate() + 'T15:00', end: '' });
  if (Store.events.on(new Date().toISODate()).length !== 1) throw new Error('日程查找失败');
  const c = Store.chats.create();
  Store.chats.append(c, 'user', '你好');
  Store.chats.append(c, 'assistant', '你好！有什么可以帮你？');
  if (c.title !== '你好') throw new Error('对话标题自动生成失败');
  if (Store.chats.list()[0].messages.length !== 2) throw new Error('消息追加失败');
  Store.events.remove(e.id);
});

check('markdown 渲染', () => {
  const BT = String.fromCharCode(96);
  const input = '# 标题\\n\\n**加粗** 和 ' + BT + 'code' + BT + '\\n\\n- a\\n- b\\n\\n' + BT + BT + BT + 'js\\nvar x=1\\n' + BT + BT + BT;
  const html = md(input);
  if (!html.includes('<h1>标题</h1>')) throw new Error('标题未渲染');
  if (!html.includes('<strong>加粗</strong>')) throw new Error('粗体未渲染');
  if (!html.includes('<code>code</code>')) throw new Error('行内代码未渲染');
  if (!html.includes('<li>a</li>')) throw new Error('列表未渲染');
  if (!html.includes('<pre><code>')) throw new Error('代码块未渲染');
});

check('HTML 转义', () => {
  if (esc('<script>alert(1)</script>') !== '&lt;script&gt;alert(1)&lt;/script&gt;') throw new Error('转义失败');
});

check('各视图 render 不抛异常', () => {
  ['home', 'chat', 'notes', 'ocr', 'schedule', 'settings'].forEach(name => {
    const view = Views[name];
    const html = view.render([]);
    if (typeof html !== 'string' || !html.length) throw new Error(name + ' render 返回空');
  });
  const n = Store.notes.create({ title: '测试', content: '内容' });
  if (!NotesView.render(['/' + n.id]).length) throw new Error('note editor render 失败');
  const c = Store.chats.create();
  if (!ChatView.render(['/' + c.id]).length) throw new Error('chat thread render 失败');
  if (!ChatView.render(['nonexistent']).length) throw new Error('chat thread(不存在) render 失败');
});

check('AI 工具函数存在', () => {
  if (typeof AI.extractTasks !== 'function' || typeof AI.weekReview !== 'function'
    || typeof AI.noteAction !== 'function' || typeof AI.summarizeNotes !== 'function'
    || typeof AI.summarizeMessages !== 'function') throw new Error('AI 工具函数缺失');
});

check('导出/导入备份', () => {
  const before = Store.notes.all().length;
  if (before < 1) throw new Error('测试前置数据缺失');
  const json = Store.exportData();
  Store.reset();
  if (Store.notes.all().length !== 0) throw new Error('重置失败');
  Store.importData(json);
  if (Store.notes.all().length !== before) throw new Error('导入后笔记数量不符');
});

check('importData 校验数组字段（防御非数组）', () => {
  Store.reset();
  Store.importData(JSON.stringify({ notes: 'not-array', todos: 123, events: null, chats: {} }));
  if (!Array.isArray(Store.notes.all())) throw new Error('notes 未归一为数组');
  if (!Array.isArray(Store.todos.all())) throw new Error('todos 未归一为数组');
  if (!Array.isArray(Store.events.all())) throw new Error('events 未归一为数组');
  if (!Array.isArray(Store.chats.all())) throw new Error('chats 未归一为数组');
});

check('md 列表包裹 ul', () => {
  const html = md('- 项目一\\n- 项目二');
  if (!html.includes('<ul>')) throw new Error('列表未包裹 ul');
  if (!html.includes('<li>项目一</li>')) throw new Error('列表项未渲染');
});

console.log('\\n结果：' + pass + ' 通过，' + fail + ' 失败');
if (fail) process.exit(1);
`;
vm.runInContext(testCode, sandbox, { filename: 'test-body.js' });

