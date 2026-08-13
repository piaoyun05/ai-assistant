/* =========================================================
   Store — 本地数据层（localStorage）
   数据模型：
   settings: { apiKey, baseUrl, model, systemPrompt, sound }
   notes:   [{ id, title, content, tags[], fav, archived, createdAt, updatedAt }]
   todos:   [{ id, text, done, priority(0低/1中/2高), dueDate, createdAt, completedAt }]
   events:  [{ id, title, start, end, location, note, createdAt }]
   chats:   [{ id, title, createdAt, updatedAt, messages[{role,content,ts,ctx?}] }]
   extraTags: [] 用户自定义标签
   ========================================================= */
const Store = (() => {
  const KEY = 'pocket-ai-data-v1';

  function defaultState() {
    return {
      settings: {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        systemPrompt: '你是"口袋AI"，一款个人智能助手。你帮用户管理笔记、待办、日程并回答问题。请用简体中文，回答简洁实用；涉及列表、结构时使用 Markdown 排版。',
        sound: true,
        autoTitle: true,   // 根据内容自动生成笔记标题
        autoRefine: true,  // AI 自动整理笔记内容
        autoSync: true,    // 笔记中的日程/待办自动同步到日程模块
        qaNotes: true      // 问答模式参考笔记内容回答
      },
      notes: [],
      todos: [],
      events: [],
      chats: [],
      extraTags: ['工作', '生活', '学习']
    };
  }

  let state = null;

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaultState(), parsed);
        state.settings = Object.assign(defaultState().settings, parsed.settings || {});
        return state;
      }
    } catch (e) { console.warn('读取本地数据失败，已重置', e); }
    state = defaultState();
    save();
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      console.error('保存本地数据失败', e);
      toast('本地存储空间不足，请清理部分数据');
    }
  }

  /* ---------- 通用 ---------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function reset() {
    state = defaultState();
    save();
  }

  function exportData() {
    return JSON.stringify(load(), null, 2);
  }

  function importData(json) {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('数据格式不正确');
    state = Object.assign(defaultState(), parsed);
    state.settings = Object.assign(defaultState().settings, parsed.settings || {});
    save();
  }

  function settings() { return load().settings; }

  /* ---------- 笔记 ---------- */
  const notes = {
    all() { return load().notes; },
    list(opts = {}) {
      let list = [...load().notes];
      if (opts.archived === false) list = list.filter(n => !n.archived);
      if (opts.archived === true) list = list.filter(n => n.archived);
      if (opts.tag) list = list.filter(n => n.tags.includes(opts.tag));
      if (opts.q) {
        const q = opts.q.toLowerCase();
        list = list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
      }
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      return list;
    },
    get(id) { return load().notes.find(n => n.id === id) || null; },
    create(data) {
      const now = Date.now();
      const note = { id: uid(), title: data.title || '', content: data.content || '', tags: data.tags || [], fav: false, archived: false, aiRefined: false, syncHash: '', createdAt: now, updatedAt: now };
      load().notes.push(note);
      save();
      return note;
    },
    update(id, data) {
      const note = this.get(id);
      if (!note) return null;
      Object.assign(note, data, { updatedAt: Date.now() });
      save();
      return note;
    },
    remove(id) {
      load().notes = load().notes.filter(n => n.id !== id);
      save();
    },
    allTags() {
      const set = new Set(load().extraTags);
      load().notes.forEach(n => n.tags.forEach(t => set.add(t)));
      return [...set];
    }
  };

  /* ---------- 待办 ---------- */
  const todos = {
    all() { return load().todos; },
    list(filter = 'all') {
      let list = [...load().todos];
      if (filter === 'done') list = list.filter(t => t.done);
      if (filter === 'undone') list = list.filter(t => !t.done);
      if (filter === 'overdue') list = list.filter(t => !t.done && t.dueDate && new Date(t.dueDate).getTime() < startOfToday());
      // 未完成优先，其次按截止时间
      list.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });
      return list;
    },
    get(id) { return load().todos.find(t => t.id === id) || null; },
    create(data) {
      const now = Date.now();
      const item = { id: uid(), text: data.text || '', done: false, priority: data.priority ?? 1, dueDate: data.dueDate || null, createdAt: now, completedAt: null };
      load().todos.push(Object.assign(item, data));
      save();
      return item;
    },
    update(id, data) {
      const item = this.get(id);
      if (!item) return null;
      if (data.done !== undefined && data.done !== item.done) {
        item.completedAt = data.done ? Date.now() : null;
      }
      Object.assign(item, data);
      save();
      return item;
    },
    remove(id) {
      load().todos = load().todos.filter(t => t.id !== id);
      save();
    },
    doneCount() { return load().todos.filter(t => t.done).length; },
    todayUndone() { return load().todos.filter(t => !t.done && (!t.dueDate || new Date(t.dueDate).getTime() <= endOfToday())); }
  };

  /* ---------- 日程 ---------- */
  const events = {
    all() { return load().events; },
    listBetween(start, end) {
      const s = new Date(start).getTime(), e = new Date(end).getTime();
      return load().events.filter(ev => {
        const t = new Date(ev.start).getTime();
        return t >= s && t < e;
      }).sort((a, b) => a.start.localeCompare(b.start));
    },
    on(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return this.listBetween(d, new Date(d.getTime() + 86400000));
    },
    get(id) { return load().events.find(ev => ev.id === id) || null; },
    create(data) {
      const item = { id: uid(), title: data.title || '', start: data.start || '', end: data.end || '', location: data.location || '', note: data.note || '', createdAt: Date.now() };
      load().events.push(Object.assign(item, data));
      save();
      return item;
    },
    update(id, data) {
      const item = this.get(id);
      if (!item) return null;
      Object.assign(item, data);
      save();
      return item;
    },
    remove(id) {
      load().events = load().events.filter(ev => ev.id !== id);
      save();
    },
    today() { return this.on(new Date().toISODate()); },
    upcoming(days = 7) {
      const now = new Date(); const end = new Date(now.getTime() + days * 86400000);
      return load().events.filter(ev => {
        const t = new Date(ev.start).getTime();
        return t >= now.getTime() && t < end.getTime();
      }).sort((a, b) => a.start.localeCompare(b.start));
    }
  };

  /* ---------- 对话 ---------- */
  const chats = {
    all() { return load().chats; },
    list() {
      return [...load().chats].sort((a, b) => b.updatedAt - a.updatedAt);
    },
    get(id) { return load().chats.find(c => c.id === id) || null; },
    create() {
      const now = Date.now();
      const chat = { id: uid(), title: '新对话', createdAt: now, updatedAt: now, messages: [] };
      load().chats.push(chat);
      save();
      return chat;
    },
    touch(chat) { chat.updatedAt = Date.now(); save(); },
    append(chat, role, content, ctx) {
      chat.messages.push({ role, content, ts: Date.now(), ctx: ctx || null });
      chat.updatedAt = Date.now();
      if (chat.title === '新对话' && role === 'user') {
        chat.title = content.replace(/\s+/g, ' ').slice(0, 18) || '新对话';
      }
      save();
      return chat;
    },
    remove(id) {
      load().chats = load().chats.filter(c => c.id !== id);
      save();
    }
  };

  /* ---------- 工具 ---------- */
  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function endOfToday() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }

  Date.prototype.toISODate = function () {
    const y = this.getFullYear(), m = String(this.getMonth() + 1).padStart(2, '0'), d = String(this.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return { load, save, reset, exportData, importData, settings, notes, todos, events, chats, uid };
})();
