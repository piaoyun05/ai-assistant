/* =========================================================
   首页（总控制台）
   ========================================================= */
const HomeView = {
  name: 'home',
  title: '口袋AI',

  render() {
    const d = new Date();
    const s = Store.settings();
    const undoneToday = Store.todos.todayUndone().length;
    const eventsToday = Store.events.today().length;
    const upcoming = Store.events.upcoming(3).slice(0, 3);
    const recentNotes = Store.notes.list({ archived: false }).slice(0, 3);
    const recentChats = Store.chats.list().slice(0, 3);
    const todayStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${'日一二三四五六'[d.getDay()]}`;

    const statusBanner = s.apiKey
      ? `<div class="ai-status ok">${icon('check')}<span>AI 已就绪 · ${esc(s.model)}</span></div>`
      : `<div class="ai-status" data-goto="/settings">${icon('alert')}<span>尚未配置 AI，点击「我的」填写 DeepSeek API Key 即可使用</span></div>`;

    return `
      <div class="greeting">${greeting()}</div>
      <div class="greeting-sub">${todayStr}</div>

      ${statusBanner}

      <div class="ai-entry">
        <div class="ai-input-row">
          <input id="home-ai-input" class="ai-input" placeholder="问点什么，或说句话自动安排日程…" autocomplete="off">
          <button id="home-ai-send" class="ai-send" aria-label="发送">${icon('send')}</button>
        </div>
        <div class="ai-entry-extra">
          <button data-goto="/ocr?mode=camera">${icon('camera')} 拍照</button>
          <button data-goto="/ocr?mode=album">${icon('image')} 相册</button>
          <button data-goto="/chat">${icon('chat')} 历史问答</button>
        </div>
      </div>

      <div class="card">
        <div class="quick-grid">
          <button class="quick-item" data-goto="/notes?new=1">
            <span class="quick-icon qi-blue">${icon('note')}</span>新建笔记
          </button>
          <button class="quick-item" data-goto="/ocr">
            <span class="quick-icon qi-violet">${icon('scan')}</span>图片识别
          </button>
          <button class="quick-item" data-goto="/schedule?newEvent=1">
            <span class="quick-icon qi-green">${icon('calendar')}</span>新建日程
          </button>
          <button class="quick-item" data-goto="/schedule?tab=todos">
            <span class="quick-icon qi-orange">${icon('list')}</span>待办清单
          </button>
        </div>
      </div>

      <div class="overview-row">
        <div class="overview-col">
          <h4>今日待办</h4>
          <div class="overview-num">${undoneToday}<small> 项未完成</small></div>
        </div>
        <div class="overview-col">
          <h4>今日日程</h4>
          <div class="overview-num">${eventsToday}<small> 个安排</small></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">即将到来的安排 <small>未来 3 天</small></div>
        ${upcoming.length ? upcoming.map(e => `
          <div class="today-item">
            <span class="dot dot-event"></span>
            <span>${esc(e.title)}</span>
            <time>${fmtDate(e.start)} ${e.start.slice(11, 16)}</time>
          </div>`).join('') : `<div class="empty" style="padding:18px"><p>暂无日程，用「AI 提取」一键把文字变成日程</p></div>`}
      </div>

      <div class="card">
        <div class="card-title">最近笔记 <small>共 ${Store.notes.all().length} 条</small></div>
        ${recentNotes.length ? recentNotes.map(n => `
          <div class="today-item" data-goto="/note/${n.id}">
            <span class="dot dot-todo"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n.title || n.content.slice(0, 20) || '无标题')}</span>
            <time>${fmtTime(n.updatedAt)}</time>
          </div>`).join('') : `<div class="empty" style="padding:18px"><p>还没有笔记，随手记录第一条吧</p></div>`}
      </div>

      <div class="card">
        <div class="card-title">最近问答 <small>共 ${Store.chats.all().length} 个</small></div>
        ${recentChats.length ? recentChats.map(c => {
          const last = c.messages[c.messages.length - 1];
          return `<div class="today-item" data-goto="/chat/${c.id}">
            <span class="dot dot-event"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span>
            <time>${fmtTime(c.updatedAt)}</time>
          </div>`;
        }).join('') : `<div class="empty" style="padding:18px"><p>暂无问答</p></div>`}
      </div>
    `;
  },

  bind(root) {
    // AI 快捷提问
    const input = root.querySelector('#home-ai-input');
    const send = root.querySelector('#home-ai-send');
    const doAsk = () => {
      const text = input.value.trim();
      if (!text) { UI.toast('请输入内容'); return; }
      input.value = '';
      const chat = Store.chats.create();
      Store.chats.append(chat, 'user', text);
      App.autoAsk = chat.id;
      Router.navigate('/chat/' + chat.id);
    };
    send.addEventListener('click', doAsk);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); doAsk(); }
    });

    // 全局 data-goto 跳转（含 ?mode= 等查询参数）
    bindGoto(root);
  }
};
