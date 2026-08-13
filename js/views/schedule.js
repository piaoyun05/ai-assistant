/* =========================================================
   日程 & 待办管理（月历 + 待办清单 + AI 提取）
   ========================================================= */
const ScheduleView = {
  name: 'schedule',
  title: '日程 & 待办',

  header() {
    return {
      title: '日程 & 待办', back: false,
      actions: `<button class="header-btn" data-action="ai-extract" aria-label="AI 提取">${icon('sparkles')}</button>`
    };
  },

  render() {
    const tab = App.schedTab || 'todos';
    const seg = `<div class="seg">
      <button data-tab="todos" class="${tab === 'todos' ? 'active' : ''}">待办清单</button>
      <button data-tab="calendar" class="${tab === 'calendar' ? 'active' : ''}">日程日历</button>
    </div>`;
    return seg + (tab === 'todos' ? this.renderTodos() : this.renderCalendar());
  },

  /* ---------- 待办 ---------- */
  renderTodos() {
    const filter = App.todoFilter || 'all';
    const list = Store.todos.list(filter);
    const chips = [['all', '全部'], ['undone', '未完成'], ['done', '已完成'], ['overdue', '逾期']]
      .map(([id, label]) => `<button class="chip" data-f="${id}" ${filter === id ? 'style="background:var(--primary);color:#fff;border-color:var(--primary)"' : ''}>${label}</button>`).join('');

    return `
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-outline btn-sm" data-open="todo" style="flex:1">${icon('plus')} 新建待办</button>
        <button class="btn btn-outline btn-sm" data-open="extract" style="flex:1">${icon('sparkles')} AI 提取</button>
      </div>
      <div class="filter-chips">${chips}</div>
      <div class="card" style="padding:6px 14px">
        ${list.length ? list.map(t => this._todoHtml(t)).join('') : `<div class="empty" style="padding:24px"><p>${filter === 'all' ? '没有待办，轻松的一天 ☀️' : '该分类下没有待办'}</p></div>`}
      </div>
    `;
  },

  _todoHtml(t) {
    const overdue = !t.done && t.dueDate && new Date(t.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
    const pri = { 0: ['低', 'pri-low'], 1: ['中', 'pri-mid'], 2: ['高', 'pri-high'] }[t.priority] || ['中', 'pri-mid'];
    const due = t.dueDate
      ? (new Date(t.dueDate).toISODate() === new Date().toISODate() ? '今天' : fmtDate(String(t.dueDate).slice(0, 10)))
      : '';
    return `<div class="todo-item" data-id="${t.id}">
      <button class="todo-check ${t.done ? 'done' : ''}" data-act="toggle" aria-label="完成">${t.done ? icon('check') : ''}</button>
      <div class="todo-body">
        <div class="todo-text">${esc(t.text)}</div>
        <div class="todo-meta">
          <span class="pri ${pri[1]}">${pri[0]}</span>
          ${due ? `<span class="${overdue ? 'overdue' : ''}">${overdue ? '逾期 · ' : ''}${due}</span>` : ''}
        </div>
      </div>
      <button class="mini-btn" data-act="menu" aria-label="更多">${icon('more')}</button>
    </div>`;
  },

  /* ---------- 日历 ---------- */
  renderCalendar() {
    const now = new Date();
    const sel = App.calDate || now.toISODate();
    const viewMonth = App.calMonth || (sel + '-01');

    const [y, m] = viewMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = first.getDay(); // 0=周日
    const daysInMonth = new Date(y, m, 0).getDate();
    const lastMonthDays = new Date(y, m - 1, 0).getDate();
    const today = now.toISODate();
    const dow = ['日', '一', '二', '三', '四', '五', '六'];

    // 事件/待办分布
    const evByDate = {};
    Store.events.all().forEach(e => { const d = e.start.slice(0, 10); (evByDate[d] = evByDate[d] || { ev: 0, td: 0 }); evByDate[d].ev++; });
    Store.todos.all().forEach(t => { if (t.dueDate && !t.done) { const d = String(t.dueDate).slice(0, 10); (evByDate[d] = evByDate[d] || { ev: 0, td: 0 }); evByDate[d].td++; } });

    let cells = '';
    for (let i = startDow - 1; i >= 0; i--) {
      const d = lastMonthDays - i;
      cells += `<div class="cal-day other">${d}</div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const marks = evByDate[ds];
      const cls = ['cal-day'];
      if (ds === today) cls.push('today');
      if (ds === sel) cls.push('selected');
      cells += `<div class="${cls.join(' ')}" data-day="${ds}">${d}
        ${marks ? `<span class="cal-dots">${marks.ev ? '<i class="ev"></i>' : ''}${marks.td ? '<i class="td"></i>' : ''}</span>` : ''}
      </div>`;
    }

    const dayEvents = Store.events.on(sel);

    return `
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-outline btn-sm" data-open="event" style="flex:1">${icon('plus')} 新建日程</button>
        <button class="btn btn-outline btn-sm" data-open="extract" style="flex:1">${icon('sparkles')} AI 提取</button>
      </div>
      <div class="cal-wrap">
        <div class="cal-head">
          <button data-cal="prev" aria-label="上月">${icon('back')}</button>
          <span class="cal-month">${y}年${m}月</span>
          <div class="cal-nav">
            <button data-cal="today" aria-label="回到今天">今</button>
            <button data-cal="next" aria-label="下月">${icon('right')}</button>
          </div>
        </div>
        <div class="cal-grid">
          ${dow.map(w => `<div class="cal-dow">${w}</div>`).join('')}
          ${cells}
        </div>
      </div>
      <div class="card" style="padding:6px 14px">
        <div class="card-title">${fmtDate(sel, true)} <small>${dayEvents.length} 个日程</small></div>
        ${dayEvents.length ? dayEvents.map(e => `
          <div class="event-item" data-eid="${e.id}">
            <div class="event-time">${e.start.slice(11, 16) || '全天'}</div>
            <div class="event-main">
              <div class="event-title">${esc(e.title)}</div>
              <div class="event-sub">${[e.location && '📍 ' + esc(e.location), e.note && esc(e.note)].filter(Boolean).join('　') || '无备注'}</div>
            </div>
            <button class="mini-btn" data-eact="menu" aria-label="更多">${icon('more')}</button>
          </div>`).join('')
        : `<div class="empty" style="padding:20px"><p>当天暂无日程</p></div>`}
      </div>
      <button class="btn btn-outline btn-block" data-open="weekreview">${icon('sparkles')} AI 查看本周安排与冲突提醒</button>
    `;
  },

  onHeaderAction(action) {
    if (action === 'ai-extract') this.openExtract();
  },

  bind(root) {
    // 待处理跳转参数（需在渲染前应用）
    if (App.pendingTab) { App.schedTab = App.pendingTab; App.pendingTab = null; }
    if (App.pendingTodoData) { App.pendingTodoData = null; setTimeout(() => this.openTodoEditor(), 50); }
    if (App.pendingEventData) { App.pendingEventData = null; setTimeout(() => this.openEventEditor(), 50); }

    const tab = App.schedTab || 'todos';

    // 顶部段切换
    root.querySelectorAll('.seg [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        App.schedTab = btn.dataset.tab;
        ViewManager.render(this, []);
      });
    });

    if (tab === 'todos') this.bindTodos(root);
    else this.bindCalendar(root);
  },

  bindTodos(root) {
    // 筛选
    root.querySelectorAll('.chip[data-f]').forEach(chip => {
      chip.addEventListener('click', () => {
        App.todoFilter = chip.dataset.f;
        ViewManager.render(this, []);
      });
    });

    root.querySelector('[data-open="todo"]').addEventListener('click', () => this.openTodoEditor());
    root.querySelector('[data-open="extract"]').addEventListener('click', () => this.openExtract());

    // 待办操作
    root.querySelectorAll('.todo-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('[data-act="toggle"]').addEventListener('click', () => {
        const t = Store.todos.get(id);
        Store.todos.update(id, { done: !t.done });
        ViewManager.render(this, []);
      });
      item.querySelector('[data-act="menu"]').addEventListener('click', async () => {
        const t = Store.todos.get(id);
        const act = await UI.actionSheet([
          { label: '编辑', icon: 'edit' },
          { label: t.done ? '标记为未完成' : '标记为完成', icon: 'check', color: '#d1fae5', textColor: '#059669' },
          { label: '删除', icon: 'trash', color: '#fee2e2', textColor: '#dc2626' }
        ]);
        if (!act) return;
        if (act.label === '编辑') this.openTodoEditor(t);
        else if (act.label === '标记为完成' || act.label === '标记为未完成') { Store.todos.update(id, { done: !t.done }); ViewManager.render(this, []); }
        else if (act.label === '删除') {
          const ok = await UI.confirm('删除这个待办？', '删除');
          if (ok) { Store.todos.remove(id); ViewManager.render(this, []); }
        }
      });
    });
  },

  bindCalendar(root) {
    // 月切换
    root.querySelector('[data-cal="prev"]').addEventListener('click', () => {
      const [y, m] = App.calMonth.split('-').map(Number);
      App.calMonth = new Date(y, m - 2, 1).toISODate() + '-01';
      ViewManager.render(this, []);
    });
    root.querySelector('[data-cal="next"]').addEventListener('click', () => {
      const [y, m] = App.calMonth.split('-').map(Number);
      App.calMonth = new Date(y, m, 1).toISODate() + '-01';
      ViewManager.render(this, []);
    });
    root.querySelector('[data-cal="today"]').addEventListener('click', () => {
      const now = new Date();
      App.calDate = now.toISODate();
      App.calMonth = now.toISODate() + '-01';
      ViewManager.render(this, []);
    });

    // 选日
    root.querySelectorAll('.cal-day[data-day]').forEach(day => {
      day.addEventListener('click', () => {
        App.calDate = day.dataset.day;
        App.calMonth = day.dataset.day.slice(0, 7) + '-01';
        ViewManager.render(this, []);
      });
    });

    root.querySelector('[data-open="event"]').addEventListener('click', () => this.openEventEditor());
    root.querySelector('[data-open="extract"]').addEventListener('click', () => this.openExtract());
    root.querySelector('[data-open="weekreview"]').addEventListener('click', () => this.weekReview());

    // 日程操作
    root.querySelectorAll('[data-eid]').forEach(item => {
      const id = item.dataset.eid;
      item.querySelector('[data-eact="menu"]').addEventListener('click', async () => {
        const act = await UI.actionSheet([
          { label: '编辑', icon: 'edit' },
          { label: '删除', icon: 'trash', color: '#fee2e2', textColor: '#dc2626' }
        ]);
        if (!act) return;
        if (act.label === '编辑') this.openEventEditor(Store.events.get(id));
        else if (act.label === '删除') {
          const ok = await UI.confirm('删除这个日程？', '删除');
          if (ok) { Store.events.remove(id); ViewManager.render(this, []); }
        }
      });
      item.addEventListener('click', e => {
        if (e.target.closest('[data-eact]')) return;
        this.openEventEditor(Store.events.get(id));
      });
    });
  },

  /* ---------- 编辑器 ---------- */
  openTodoEditor(todo) {
    const t = todo || { text: '', priority: 1, dueDate: '' };
    const s = UI.sheet(`
      <div class="sheet-title">${todo ? '编辑待办' : '新建待办'}</div>
      <div class="field"><input class="input" id="td-text" placeholder="要做什么？" value="${esc(t.text)}"></div>
      <div style="display:flex;gap:10px">
        <div class="field" style="flex:1">
          <label>优先级</label>
          <select class="select" id="td-pri">
            <option value="2" ${t.priority === 2 ? 'selected' : ''}>高</option>
            <option value="1" ${t.priority === 1 ? 'selected' : ''}>中</option>
            <option value="0" ${t.priority === 0 ? 'selected' : ''}>低</option>
          </select>
        </div>
        <div class="field" style="flex:1">
          <label>截止日期（可选）</label>
          <input type="date" class="input" id="td-due" value="${t.dueDate ? String(t.dueDate).slice(0, 10) : ''}">
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-plain btn-block" data-c="cancel">取消</button>
        <button class="btn btn-primary btn-block" data-c="ok">保存</button>
      </div>`);
    s.root.querySelector('[data-c="cancel"]').addEventListener('click', () => s.close());
    s.root.querySelector('[data-c="ok"]').addEventListener('click', () => {
      const text = s.root.querySelector('#td-text').value.trim();
      if (!text) { UI.toast('请输入待办内容'); return; }
      const data = { text, priority: Number(s.root.querySelector('#td-pri').value), dueDate: s.root.querySelector('#td-due').value || null };
      if (todo) Store.todos.update(todo.id, data);
      else Store.todos.create(data);
      s.close(); UI.toast('已保存'); ViewManager.render(this, []);
    });
  },

  openEventEditor(ev) {
    const e = ev || {};
    const start = e.start ? e.start.slice(0, 16) : (App.calDate || new Date().toISODate()) + 'T' + new Date().toTimeString().slice(0, 5);
    const end = e.end ? e.end.slice(0, 16) : '';
    const s = UI.sheet(`
      <div class="sheet-title">${ev ? '编辑日程' : '新建日程'}</div>
      <div class="field"><input class="input" id="ev-title" placeholder="日程标题" value="${esc(e.title || '')}"></div>
      <div style="display:flex;gap:10px">
        <div class="field" style="flex:1"><label>开始时间</label><input type="datetime-local" class="input" id="ev-start" value="${start}"></div>
        <div class="field" style="flex:1"><label>结束时间</label><input type="datetime-local" class="input" id="ev-end" value="${end}"></div>
      </div>
      <div class="field"><input class="input" id="ev-loc" placeholder="地点（可选）" value="${esc(e.location || '')}"></div>
      <div class="field"><input class="input" id="ev-note" placeholder="备注（可选）" value="${esc(e.note || '')}"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-plain btn-block" data-c="cancel">取消</button>
        <button class="btn btn-primary btn-block" data-c="ok">保存</button>
      </div>`);
    s.root.querySelector('[data-c="cancel"]').addEventListener('click', () => s.close());
    s.root.querySelector('[data-c="ok"]').addEventListener('click', () => {
      const title = s.root.querySelector('#ev-title').value.trim();
      const startV = s.root.querySelector('#ev-start').value;
      if (!title) { UI.toast('请输入日程标题'); return; }
      if (!startV) { UI.toast('请选择开始时间'); return; }
      const data = { title, start: startV, end: s.root.querySelector('#ev-end').value || '', location: s.root.querySelector('#ev-loc').value.trim(), note: s.root.querySelector('#ev-note').value.trim() };
      if (ev) Store.events.update(ev.id, data);
      else Store.events.create(data);
      s.close(); UI.toast('已保存'); ViewManager.render(this, []);
    });
  },

  /* ---------- AI 提取事务 ---------- */
  openExtract() {
    const s = UI.sheet(`
      <div class="sheet-title">AI 提取日程 / 待办</div>
      <p style="font-size:13px;color:var(--text-3);margin-bottom:10px">粘贴一段话或 OCR 文字，AI 会自动识别其中的日程、待办和时间。<br>例如："周三下午3点开项目会议，周五前提交周报，记得买菜"</p>
      <div class="field"><textarea class="textarea" id="ex-text" style="min-height:110px" placeholder="粘贴文字…"></textarea></div>
      <button class="btn btn-primary btn-block" data-c="run">${icon('sparkles')} 开始提取</button>
      <button class="btn btn-plain btn-block" data-c="cancel" style="margin-top:8px">取消</button>`);
    s.root.querySelector('[data-c="cancel"]').addEventListener('click', () => s.close());
    s.root.querySelector('[data-c="run"]').addEventListener('click', async () => {
      const text = s.root.querySelector('#ex-text').value.trim();
      if (!text) { UI.toast('请先粘贴文字'); return; }
      UI.loading('AI 正在识别日程与待办…', true);
      let data;
      try { data = await AI.extractTasks(text); }
      catch (e) { UI.loading('', false); UI.toast(e.message); return; }
      UI.loading('', false);
      s.close();
      OcrView._showConfirmAdd(data);
    });
  },

  /* ---------- AI 本周安排 ---------- */
  async weekReview() {
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const events = Store.events.listBetween(monday, new Date(sunday.getTime() + 864e5));
    const todos = Store.todos.all();
    if (!events.length && !todos.length) { UI.toast('本周还没有日程和待办'); return; }
    UI.loading('AI 正在分析本周安排…', true);
    try {
      const result = await AI.weekReview(events, todos);
      UI.loading('', false);
      NotesView.showAIResult('本周安排分析', result, null, null);
    } catch (e) { UI.loading('', false); UI.toast(e.message); }
  }
};
