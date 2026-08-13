/* =========================================================
   笔记管理（列表 + 编辑器 + AI 操作）
   ========================================================= */
const NotesView = {
  name: 'notes',
  title: '笔记',

  header(rest) {
    if (rest[0]) {
      return {
        title: '编辑笔记', back: true,
        actions: `<button class="header-btn" data-action="menu" aria-label="菜单">${icon('more')}</button>`
      };
    }
    return {
      title: '笔记', back: false,
      actions: `<button class="header-btn" data-action="multi" aria-label="批量操作">${icon('check')}</button>
                <button class="header-btn" data-action="new" aria-label="新建笔记">${icon('plus')}</button>`
    };
  },

  render(rest) {
    if (rest[0]) return this.renderEditor(rest[0]);
    return this.renderList();
  },

  /* ---------- 列表 ---------- */
  renderList() {
    const tagFilter = App.tagFilter || 'all';
    const list = Store.notes.list({ archived: App.showArchived === true, tag: tagFilter === 'fav' ? null : (tagFilter === 'all' ? null : tagFilter) });
    const shown = tagFilter === 'fav' ? Store.notes.list({ archived: App.showArchived === true }).filter(n => n.fav) : list;
    const tags = Store.notes.allTags();
    const chip = (id, label) => `<button class="chip" data-tag="${id}" ${tagFilter === id ? 'style="background:var(--primary);color:#fff;border-color:var(--primary)"' : ''}>${esc(label)}</button>`;

    return `
      <div class="search-row">
        <div class="search-box">${icon('search')}<input id="note-search" placeholder="搜索笔记内容…"></div>
      </div>
      <div class="filter-chips">
        ${chip('all', '全部')}
        ${chip('fav', '收藏')}
        ${tags.map(t => chip('tag:' + t, t)).join('')}
        ${chip('arch', App.showArchived ? '已归档 ✓' : '归档')}
      </div>

      ${shown.length ? shown.map(n => this._noteCard(n)).join('') : `<div class="empty">${icon('note')}<p>暂无笔记，点右下角「+」新建</p></div>`}

      <button class="btn btn-primary" id="note-fab" style="position:fixed;right:18px;bottom:calc(var(--nav-h) + var(--safe-bottom) + 16px);border-radius:50%;width:54px;height:54px;padding:0;box-shadow:0 8px 20px rgba(79,70,229,.4)">${icon('plus')}</button>
    `;
  },

  _noteCard(n) {
    const preview = (n.content || '').trim();
    return `<div class="note-card" data-id="${n.id}">
      <div class="note-card-header">
        <span class="note-card-title">${esc(n.title || '无标题')}</span>
        ${n.archived ? '<span class="tag tag-gray">已归档</span>' : ''}
      </div>
      <div class="note-card-body">${esc(preview || '（空白笔记）')}</div>
      <div class="note-card-foot">
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(n.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <span class="spacer"></span>
        <time>${fmtTime(n.updatedAt)}</time>
        <button class="mini-btn fav ${n.fav ? 'active' : ''}" data-act="fav" aria-label="收藏">${icon('star')}</button>
        <button class="mini-btn" data-act="menu" aria-label="更多">${icon('more')}</button>
      </div>
    </div>`;
  },

  /* ---------- 页头操作 ---------- */
  onHeaderAction(action, rest) {
    if (rest[0]) {
      if (action === 'menu') this._editorMenu(rest[0]);
      return;
    }
    if (action === 'new') this.newNote();
    else if (action === 'multi') this.enterMultiSelect();
  },

  async _editorMenu(id) {
    const n = Store.notes.get(id);
    if (!n) return;
    const act = await UI.actionSheet([
      { label: 'AI 操作', icon: 'sparkles', color: '#eef2ff', textColor: '#4f46e5' },
      { label: n.fav ? '取消收藏' : '收藏', icon: 'star', color: '#fef3c7', textColor: '#d97706' },
      { label: n.archived ? '取消归档' : '归档', icon: 'archive' },
      { label: '保存为新笔记', icon: 'copy' },
      { label: '删除', icon: 'trash', color: '#fee2e2', textColor: '#dc2626' }
    ]);
    if (!act) return;
    const titleEl = document.querySelector('#note-title');
    if (act.label === 'AI 操作') { this.openAIMenu(id); }
    else if (act.label === '收藏' || act.label === '取消收藏') { Store.notes.update(id, { fav: !n.fav }); UI.toast('已更新'); }
    else if (act.label === '归档' || act.label === '取消归档') { Store.notes.update(id, { archived: !n.archived }); UI.toast('已更新'); Router.back(); }
    else if (act.label === '保存为新笔记') {
      const nn = Store.notes.create({ title: titleEl ? titleEl.value : n.title, content: n.content, tags: n.tags });
      UI.toast('已保存为新笔记'); Router.navigate('/note/' + nn.id);
    } else if (act.label === '删除') {
      const ok = await UI.confirm('删除这条笔记？此操作不可恢复。', '删除');
      if (ok) { Store.notes.remove(id); Router.back(); }
    }
  },

  bind(root, rest) {
    if (rest[0]) { this.bindEditor(root, rest[0]); return; }
    const self = this;

    // 新建（FAB 在视图区内）
    root.querySelector('#note-fab').addEventListener('click', () => this.newNote());

    // 搜索
    const searchInput = root.querySelector('#note-search');
    const doSearch = () => {
      const q = searchInput.value.trim().toLowerCase();
      root.querySelectorAll('.note-card').forEach(card => {
        const hit = card.textContent.toLowerCase().includes(q);
        card.style.display = hit ? '' : 'none';
      });
    };
    searchInput.addEventListener('input', doSearch);

    // 标签筛选
    root.querySelectorAll('.chip[data-tag]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.tag;
        if (id === 'arch') { App.showArchived = !App.showArchived; }
        else { App.tagFilter = id; App.showArchived = false; }
        ViewManager.render(this, []);
      });
    });

    // 打开 / 收藏 / 菜单
    root.querySelectorAll('.note-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        if (e.target.closest('[data-act]')) return;
        Router.navigate('/note/' + id);
      });
      card.querySelector('[data-act="fav"]').addEventListener('click', e => {
        e.stopPropagation();
        const n = Store.notes.get(id);
        Store.notes.update(id, { fav: !n.fav });
        ViewManager.render(this, []);
      });
      card.querySelector('[data-act="menu"]').addEventListener('click', async e => {
        e.stopPropagation();
        const n = Store.notes.get(id);
        const act = await UI.actionSheet([
          { label: '编辑', icon: 'edit' },
          { label: 'AI 操作', icon: 'sparkles', color: '#eef2ff', textColor: '#4f46e5' },
          { label: n.archived ? '取消归档' : '归档', icon: 'archive' },
          { label: n.fav ? '取消收藏' : '收藏', icon: 'star', color: '#fef3c7', textColor: '#d97706' },
          { label: '删除', icon: 'trash', color: '#fee2e2', textColor: '#dc2626' }
        ]);
        if (!act) return;
        if (act.label === '编辑') Router.navigate('/note/' + id);
        else if (act.label === 'AI 操作') this.noteAIFromList(id);
        else if (act.label === '归档' || act.label === '取消归档') { Store.notes.update(id, { archived: !n.archived }); ViewManager.render(this, []); }
        else if (act.label === '收藏' || act.label === '取消收藏') { Store.notes.update(id, { fav: !n.fav }); ViewManager.render(this, []); }
        else if (act.label === '删除') {
          const ok = await UI.confirm('删除这条笔记？此操作不可恢复。', '删除');
          if (ok) { Store.notes.remove(id); ViewManager.render(this, []); }
        }
      });
    });

    // 从首页跳转新建
    if (App.pendingNewNote) {
      App.pendingNewNote = null;
      this.newNote();
    }
  },

  newNote() {
    const n = Store.notes.create({ title: '', content: '' });
    Router.navigate('/note/' + n.id);
  },

  /* ---------- 批量选择模式 ---------- */
  enterMultiSelect() {
    const self = this;
    const selected = new Set();
    const renderList = () => {
      const root = document.getElementById('view-root');
      root.querySelectorAll('.note-card').forEach(card => {
        card.style.outline = selected.has(card.dataset.id) ? '2px solid var(--primary)' : '';
      });
      document.getElementById('header-title').textContent = `已选 ${selected.size} 条`;
    };
    const root = document.getElementById('view-root');
    root.querySelectorAll('.note-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        if (selected.has(card.dataset.id)) selected.delete(card.dataset.id);
        else selected.add(card.dataset.id);
        renderList();
      });
    });

    const s = UI.sheet(`
      <div class="sheet-title">批量操作</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-primary" data-batch="sum">${icon('sparkles')} AI 汇总</button>
        <button class="btn btn-plain" data-batch="fav">${icon('star')} 收藏</button>
        <button class="btn btn-plain" data-batch="arch">${icon('archive')} 归档</button>
        <button class="btn btn-danger" data-batch="del">${icon('trash')} 删除</button>
      </div>
      <button class="btn btn-plain btn-block" data-batch="cancel" style="margin-top:10px">退出批量模式</button>`);

    s.root.querySelectorAll('[data-batch]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.batch;
        if (act === 'cancel') { s.close(); ViewManager.render(this, []); return; }
        if (!selected.size) { UI.toast('请先选择笔记'); return; }
        const ids = [...selected];
        const notes = ids.map(i => Store.notes.get(i)).filter(Boolean);
        if (act === 'del') {
          const ok = await UI.confirm(`删除选中的 ${ids.length} 条笔记？`, '删除');
          if (ok) ids.forEach(i => Store.notes.remove(i));
          s.close(); ViewManager.render(this, []);
        } else if (act === 'fav') {
          notes.forEach(n => Store.notes.update(n.id, { fav: !n.fav }));
          s.close(); ViewManager.render(this, []);
          UI.toast('已更新收藏');
        } else if (act === 'arch') {
          notes.forEach(n => Store.notes.update(n.id, { archived: !n.archived }));
          s.close(); ViewManager.render(this, []);
          UI.toast('已更新归档');
        } else if (act === 'sum') {
          s.close();
          ViewManager.render(this, []);
          UI.loading('正在汇总 ' + notes.length + ' 条笔记…', true);
          try {
            const result = await AI.summarizeNotes(notes);
            this.showAIResult('批量笔记汇总', result, null, notes[0].id);
          } catch (e) { UI.toast(e.message); }
          finally { UI.loading('', false); }
        }
      });
    });
  },

  /* ---------- 编辑器 ---------- */
  renderEditor(id) {
    const n = Store.notes.get(id);
    if (!n) return `<div class="empty">${icon('alert')}<p>笔记不存在</p></div>`;
    const allTags = Store.notes.allTags();
    const actions = [
      { a: 'summarize', t: '总结' }, { a: 'outline', t: '提炼要点' }, { a: 'expand', t: '扩写' },
      { a: 'condense', t: '精简' }, { a: 'actionlist', t: '行动清单' }, { a: 'translate', t: '翻译' }, { a: 'structure', t: '结构化' }
    ];
    return `<div class="note-editor">
      <input id="note-title" class="title-input" placeholder="标题" value="${esc(n.title)}" maxlength="60">
      <div id="note-ai-status" class="note-ai-status">已自动保存</div>
      <div class="tag-editor">
        ${allTags.map(t => `<span class="tag ${n.tags.includes(t) ? 'active' : ''}" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}
        <input class="tag-add-input" id="tag-add" placeholder="+ 添加标签" maxlength="10">
      </div>
      <textarea id="note-content" class="content-input" placeholder="开始记录…">${esc(n.content)}</textarea>
      <div class="ai-action-bar">
        ${actions.map(a => `<button data-ai="${a.a}">${a.t}</button>`).join('')}
      </div>
    </div>`;
  },

  bindEditor(root, id) {
    const self = this;
    const n = Store.notes.get(id);
    if (!n) return;
    const titleEl = root.querySelector('#note-title');
    const contentEl = root.querySelector('#note-content');
    const statusEl = root.querySelector('#note-ai-status');

    // 智能保存流程：自动保存 → 自动标题 → AI 整理 → 同步日程
    let timer = null, titleTimer = null, refineTimer = null;
    const setStatus = (text, ok) => {
      if (!statusEl || !statusEl.isConnected) return;
      statusEl.textContent = text;
      statusEl.classList.toggle('ok', !!ok);
    };
    const cancelSmart = () => { clearTimeout(titleTimer); clearTimeout(refineTimer); };
    const scheduleSmart = () => {
      cancelSmart();
      const cur = Store.notes.get(id);
      const content = contentEl.value.trim();
      if (!cur || content.length < 8) return;
      // 标题为空时，停止输入 1.8s 自动生成标题
      if (!cur.title.trim() && !titleEl.value.trim() && Store.settings().autoTitle) {
        titleTimer = setTimeout(() => this.autoTitle(id, titleEl, contentEl, setStatus), 1800);
      }
      // 停止输入 4s 后，后台 AI 整理内容并同步日程
      refineTimer = setTimeout(() => this.autoRefineAndSync(id, contentEl, setStatus), 4000);
    };
    const autosave = () => {
      clearTimeout(timer);
      setStatus('编辑中…');
      timer = setTimeout(() => {
        const cur = Store.notes.get(id);
        if (cur && (cur.title !== titleEl.value || cur.content !== contentEl.value)) {
          Store.notes.update(id, { title: titleEl.value, content: contentEl.value });
        }
        setStatus('已自动保存', true);
        scheduleSmart();
      }, 600);
    };
    titleEl.addEventListener('input', autosave);
    contentEl.addEventListener('input', autosave);
    // 记录清理函数，路由切换时统一释放定时器
    (App._noteCleanups = App._noteCleanups || []).push(() => { clearTimeout(timer); cancelSmart(); });

    // 标签
    root.querySelectorAll('.tag-editor .tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const t = tag.dataset.tag;
        const tags = n.tags.includes(t) ? n.tags.filter(x => x !== t) : [...n.tags, t];
        Store.notes.update(id, { tags });
        tag.classList.toggle('active');
      });
    });
    const tagAdd = root.querySelector('#tag-add');
    tagAdd.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const v = tagAdd.value.trim();
        if (!v) return;
        if (!Store.notes.allTags().includes(v)) Store.load().extraTags.push(v);
        if (!n.tags.includes(v)) n.tags.push(v);
        Store.save();
        tagAdd.value = '';
        this.bindEditor(root, id);
        ViewManager.render(this, ['/' + id]);
      }
    });

    // AI 操作
    root.querySelectorAll('[data-ai]').forEach(btn => {
      btn.addEventListener('click', () => {
        autosave();
        this.runNoteAI(id, btn.dataset.ai);
      });
    });
  },

  /** 根据内容自动生成标题（AI 失败时本地截取），期间用户手动填标题则放弃 */
  async autoTitle(id, titleEl, contentEl, setStatus) {
    if (!titleEl.isConnected || !contentEl.isConnected) return;
    const cur = Store.notes.get(id);
    const content = contentEl.value.trim();
    if (!cur || cur.title.trim() || titleEl.value.trim() || content.length < 8) return;
    const title = await AI.genTitle(content);
    const cur2 = Store.notes.get(id);
    if (!cur2 || titleEl.value.trim() || !titleEl.isConnected) return;
    titleEl.value = title;
    Store.notes.update(id, { title });
    setStatus('已自动生成标题', true);
  },

  /** 后台 AI 整理笔记内容并同步日程（静默执行，不打断编辑） */
  async autoRefineAndSync(id, contentEl, setStatus) {
    if (!contentEl.isConnected) return;
    const cur = Store.notes.get(id);
    const content = contentEl.value.trim();
    if (!cur || content.length < 15) return;
    const busyKey = 'note:' + id;
    if (App.noteAiBusy[busyKey]) return;
    App.noteAiBusy[busyKey] = true;
    const settings = Store.settings();

    try {
      // 1) AI 整理并后台保存
      if (settings.apiKey && settings.autoRefine) {
        setStatus('AI 整理中…');
        const snapshot = content;
        try {
          const result = await AI.refineNote(content, cur.title);
          const cur2 = Store.notes.get(id);
          // 仅当用户未继续输入时应用整理结果，避免覆盖正在编辑的内容
          if (cur2 && contentEl.isConnected && contentEl.value.trim() === snapshot) {
            Store.notes.update(id, { content: result, aiRefined: true });
            contentEl.value = result;
            setStatus('已用 AI 整理并保存', true);
          } else {
            setStatus('已自动保存（内容有变化，跳过整理）', true);
          }
        } catch (e) {
          setStatus('已自动保存（AI 整理失败）');
        }
      }
      // 2) 笔记中的日程/待办同步到日程模块（按内容哈希去重）
      if (settings.apiKey && settings.autoSync) {
        await this.syncToSchedule(id);
      }
    } finally {
      App.noteAiBusy[busyKey] = false;
    }
  },

  /** 将笔记内容中的日程/待办同步到日程模块；内容未变则跳过，先删除旧来源再新增保证与笔记一致 */
  async syncToSchedule(id) {
    const cur = Store.notes.get(id);
    if (!cur) return;
    const content = (cur.content || '').trim();
    if (content.length < 15) return;
    const h = AI.hash(content);
    if ((cur.syncHash || '') === h) return; // 内容未变，避免重复同步
    let data;
    try { data = await AI.extractTasks(content); }
    catch (e) { return; }
    // 移除该笔记此前同步的日程/待办（仅来源标记匹配项），保证与笔记内容一致
    Store.load().events = Store.load().events.filter(ev => ev.srcNote !== id);
    Store.load().todos = Store.load().todos.filter(t => t.srcNote !== id);
    const priMap = { '高': 2, '中': 1, '低': 0 };
    (data.events || []).forEach(ev => {
      Store.events.create({
        title: ev.title, start: ev.start, end: ev.end || '', location: ev.location || '',
        note: ((ev.note || '') ? ev.note + ' ' : '') + '（来自笔记：' + (cur.title || '无标题') + '）',
        srcNote: id
      });
    });
    (data.todos || []).forEach(td => {
      Store.todos.create({ text: td.text, priority: priMap[td.priority] ?? 1, dueDate: td.dueDate || null, srcNote: id });
    });
    Store.notes.update(id, { syncHash: h });
    const synced = (data.events || []).length + (data.todos || []).length;
    if (synced > 0) UI.toast('已同步 ' + synced + ' 条到日程');
  },

  openAIMenu(id) {
    const n = Store.notes.get(id);
    UI.closeSheet();
    const actions = [
      { a: 'summarize', t: '总结笔记', icon: 'sparkles' },
      { a: 'outline', t: '提炼要点', icon: 'bulb' },
      { a: 'actionlist', t: '生成行动清单', icon: 'list' },
      { a: 'structure', t: '整理成结构化文档', icon: 'layers' },
      { a: 'translate', t: '翻译', icon: 'translate' },
      { a: 'expand', t: '扩写', icon: 'plus' },
      { a: 'condense', t: '精简', icon: 'scan' }
    ];
    UI.actionSheet(actions.map(a => ({ label: a.t, icon: a.icon, color: '#eef2ff', textColor: '#4f46e5' })))
      .then(act => { if (act) this.runNoteAI(id, actions.find(a => a.t === act.label).a); });
  },

  /** 列表页直接对某条笔记做 AI 操作 */
  async noteAIFromList(id) {
    const n = Store.notes.get(id);
    const actions = [
      { a: 'summarize', t: '总结笔记' }, { a: 'outline', t: '提炼要点' }, { a: 'actionlist', t: '生成行动清单' },
      { a: 'structure', t: '结构化整理' }, { a: 'translate', t: '翻译' }, { a: 'expand', t: '扩写' }, { a: 'condense', t: '精简' }
    ];
    const act = await UI.actionSheet(actions.map(a => ({ label: a.t, icon: 'sparkles', color: '#eef2ff', textColor: '#4f46e5' })));
    if (!act) return;
    this.runNoteAI(id, actions.find(a => a.t === act.label).a);
  },

  async runNoteAI(id, actionKey) {
    const n = Store.notes.get(id);
    const content = n.content || '';
    if (!content.trim()) { UI.toast('笔记内容为空'); return; }
    UI.loading('AI 处理中…', true);
    try {
      const { label, result } = await AI.noteAction(actionKey, content, n.title);
      UI.loading('', false);
      this.showAIResult(label, result, id, id);
    } catch (e) {
      UI.loading('', false);
      UI.toast(e.message);
    }
  },

  /** 展示 AI 结果：复制 / 应用到笔记 / 保存为新笔记 */
  showAIResult(label, result, applyId, fromId) {
    const s = UI.sheet(`
      <div class="sheet-title">${esc(label)}</div>
      <div class="msg-bubble" style="box-shadow:none;border:1px solid var(--border);max-height:44vh;overflow-y:auto;max-width:none;margin-bottom:12px">${md(result)}</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-plain" data-r="copy">${icon('copy')} 复制</button>
        ${applyId ? `<button class="btn btn-primary" data-r="apply">${icon('check')} 应用到笔记</button>` : ''}
        <button class="btn btn-outline" data-r="new">${icon('plus')} 存为新笔记</button>
      </div>`);
    s.root.querySelector('[data-r="copy"]').addEventListener('click', () => copyText(result));
    s.root.querySelector('[data-r="new"]').addEventListener('click', () => {
      const n = Store.notes.create({ title: (applyId ? Store.notes.get(applyId).title : '') + '（' + label + '）', content: result, tags: applyId ? Store.notes.get(applyId).tags : [] });
      s.close(); UI.toast('已保存为新笔记');
    });
    if (applyId) {
      s.root.querySelector('[data-r="apply"]').addEventListener('click', () => {
        Store.notes.update(applyId, { content: result });
        s.close(); UI.toast('已应用到笔记');
        ViewManager.render(this, ['/' + applyId]);
      });
    }
  }
};
