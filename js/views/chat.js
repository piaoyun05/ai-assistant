/* =========================================================
   AI 对话页（列表 + 会话）
   ========================================================= */
const ChatView = {
  name: 'chat',
  title: '问答',

  header(rest) {
    if (rest[0]) {
      const chat = Store.chats.get(rest[0]);
      return { title: chat ? chat.title : '问答', back: true, actions: `<button class="header-btn" data-action="menu" aria-label="菜单">${icon('more')}</button>` };
    }
    return {
      title: '问答', back: false,
      actions: `<button class="header-btn" data-action="new" aria-label="新建问答">${icon('plus')}</button>`
    };
  },

  render(rest) {
    if (rest[0]) return this.renderThread(rest[0]);
    return this.renderList();
  },

  renderList() {
    const list = Store.chats.list();
    if (!list.length) {
      return `<div class="empty">${icon('chat')}<p>还没有问答记录<br>点右上角「+」新建，或从首页输入框直接提问</p></div>`;
    }
    return `<div class="card" style="padding:4px 14px">
      <ul class="list">
        ${list.map(c => {
          const last = c.messages[c.messages.length - 1];
          return `<li class="list-item chat-list-item" data-id="${c.id}" data-action="open">
            <div class="list-item-main">
              <div class="list-item-title">${esc(c.title)}</div>
              <div class="list-item-sub">${esc((last ? (last.role === 'user' ? '我：' : 'AI：') : '') + (last ? last.content : '（空问答）'))}</div>
            </div>
            <span style="color:var(--text-3);font-size:12px;flex-shrink:0">${fmtTime(c.updatedAt)}</span>
            <button class="mini-btn" data-action="del" aria-label="删除">${icon('trash')}</button>
          </li>`;
        }).join('')}
      </ul>
    </div>`;
  },

  bind(root, rest) {
    if (rest[0]) { this.bindThread(root, rest[0]); return; }
    // 列表
    root.querySelectorAll('[data-action="open"]').forEach(li => {
      li.addEventListener('click', () => Router.navigate('/chat/' + li.dataset.id));
    });
    root.querySelectorAll('[data-action="del"]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.closest('[data-id]').dataset.id;
        const ok = await UI.confirm('删除这个问答？此操作不可恢复。', '删除');
        if (ok) { Store.chats.remove(id); ViewManager.render(this, rest); }
      });
    });
  },

  /* ---------- 会话线程 ---------- */
  renderThread(id) {
    const chat = Store.chats.get(id);
    if (!chat) return `<div class="empty">${icon('alert')}<p>问答不存在</p></div>`;
    const ctx = App.chatCtx;

    const chips = `<div class="chip-row">
      <button class="chip" data-chip="提">提炼重点</button>
      <button class="chip" data-chip="大纲">梳理大纲</button>
      <button class="chip" data-chip="纪要">会议纪要</button>
      <button class="chip" data-chip="行动">行动清单</button>
      <button class="chip" data-chip="总结">总结本次问答</button>
    </div>`;

    const messagesHtml = chat.messages.length ? chat.messages.map(m => this._msgHtml(m)).join('')
      : `<div class="empty">${icon('chat')}<p>有疑问，直接问<br>AI 会结合你的笔记内容回答</p></div>`;

    return `<div class="chat-thread">
      ${chips}
      <div id="msg-list">${messagesHtml}</div>
      <div class="chat-input-bar">
        <div id="chat-ctx-row" class="chat-ctx-row" ${ctx ? '' : 'style="display:none"'}>
          <span class="msg-ctx-chip" style="margin-bottom:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${icon('scan')} 已附加 OCR 识别文本：${esc(ctx.text.slice(0, 20))}…</span>
          <button class="icon-btn" style="width:26px;height:26px;flex-shrink:0" data-action="clear-ctx" aria-label="移除">${icon('close')}</button>
        </div>
        <div class="chat-input-row">
          <input type="file" id="chat-img-input" accept="image/*" hidden>
          <button class="icon-btn" data-action="mic" aria-label="语音输入">${icon('mic')}</button>
          <button class="icon-btn" data-action="img" aria-label="图片识别">${icon('image')}</button>
          <textarea id="chat-input" rows="1" placeholder="输入你的问题…"></textarea>
          <button class="icon-btn primary" data-action="send" aria-label="发送">${icon('send')}</button>
        </div>
      </div>
    </div>`;
  },

  _msgHtml(m) {
    if (m.role === 'user') {
      const ctxChip = m.ctx ? `<div class="msg-ctx-chip">${icon('scan')} OCR 识别文本</div>` : '';
      return `<div class="msg-row user">
        <div style="max-width:78%;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${ctxChip}
          <div class="msg-bubble">${md(m.content)}</div>
        </div>
        <div class="msg-avatar me">我</div>
      </div>`;
    }
    return `<div class="msg-row ai">
      <div class="msg-avatar ai">AI</div>
      <div class="msg-bubble" data-msg-idx="${m.id || ''}" data-action="ai-msg">${md(m.content)}</div>
    </div>`;
  },

  /* ---------- 页头操作 ---------- */
  onHeaderAction(action, rest) {
    if (rest[0]) {
      if (action === 'menu') this._threadMenu(rest[0]);
      return;
    }
    if (action === 'new') {
      const c = Store.chats.create();
      Router.navigate('/chat/' + c.id);
    }
  },

  async _threadMenu(id) {
    const chat = Store.chats.get(id);
    if (!chat) return;
    const act = await UI.actionSheet([
      { label: '重命名', icon: 'edit' },
      { label: '总结本次问答', icon: 'sparkles' },
      { label: '删除问答', icon: 'trash', color: '#fee2e2', textColor: '#dc2626' }
    ]);
    if (!act) return;
    if (act.label === '删除问答') {
      const ok = await UI.confirm('删除这个问答？此操作不可恢复。', '删除');
      if (ok) { Store.chats.remove(id); Router.navigate('/chat'); }
    } else if (act.label === '总结本次问答') {
      this._runCustomAI(id, '总结本次问答');
    } else if (act.label === '重命名') {
      const { root: sr } = UI.sheet(`<div class="sheet-title">重命名问答</div>
        <div class="field"><input class="input" id="rename-input" value="${esc(chat.title)}" maxlength="30"></div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-plain btn-block" data-act="cancel">取消</button>
          <button class="btn btn-primary btn-block" data-act="ok">保存</button>
        </div>`);
      sr.querySelector('[data-act="ok"]').addEventListener('click', () => {
        const v = sr.querySelector('#rename-input').value.trim() || '新问答';
        chat.title = v; Store.save(); UI.closeSheet();
        document.getElementById('header-title').textContent = v;
      });
      sr.querySelector('[data-act="cancel"]').addEventListener('click', () => UI.closeSheet());
    }
  },

  async bindThread(root, id) {
    const chat = Store.chats.get(id);
    if (!chat) return;

    // 快捷指令
    root.querySelectorAll('.chip[data-chip]').forEach(chip => {
      chip.addEventListener('click', () => {
        const k = chip.dataset.chip;
        const cmds = { 提: '请提炼这段问答的重点，用要点列出', 大纲: '请梳理这段问答的逻辑大纲', 纪要: '请把这段问答整理成会议纪要', 行动: '请根据这段问答生成可执行的行动清单（用任务列表）', 总结: '请总结这段问答的要点与结论' };
        if (k === '总结') { this._runCustomAI(id, cmds[k]); return; }
        this.sendMessage(id, cmds[k]);
      });
    });

    // 输入与发送
    const input = root.querySelector('#chat-input');
    const sendBtn = root.querySelector('[data-action="send"]');
    const send = () => {
      const text = input.value.trim();
      if (!text) { UI.toast('请输入消息'); return; }
      const ctx = App.chatCtx;
      App.chatCtx = null;
      input.value = '';
      this.sendMessage(id, text, ctx);
    };
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); }
    });

    // 图片识别附加
    const imgInput = root.querySelector('#chat-img-input');
    root.querySelector('[data-action="img"]').addEventListener('click', () => imgInput.click());
    imgInput.addEventListener('change', async () => {
      const file = imgInput.files[0];
      imgInput.value = '';
      if (!file) return;
      try {
        const s = UI.sheet('<div class="sheet-title">正在识别图片文字…</div><div class="ocr-progress"><div class="bar"><i id="ocr-bar" style="width:0%"></i></div><span id="ocr-pct" style="font-size:12px;color:var(--text-3)">0%</span></div>');
        const text = await OCR.recognize(file, m => {
          const bar = s.root.querySelector('#ocr-bar'), pct = s.root.querySelector('#ocr-pct');
          if (bar) bar.style.width = Math.round(m.progress * 100) + '%';
          if (pct) pct.textContent = OCR.statusText(m.status);
        });
        s.close();
        if (!text) { UI.toast('未识别到文字'); return; }
        App.chatCtx = { type: 'ocr', text };
        UI.toast('已附加识别文本');
        ViewManager.render(this, ['/' + id]);
      } catch (e) {
        UI.closeSheet();
        UI.toast(e.message);
      }
    });
    root.querySelector('[data-action="clear-ctx"]').addEventListener('click', () => {
      App.chatCtx = null;
      ViewManager.render(this, ['/' + id]);
    });

    // 语音
    let rec = null;
    const micBtn = root.querySelector('[data-action="mic"]');
    micBtn.addEventListener('click', () => {
      if (rec) { rec.abort(); rec = null; micBtn.style.color = ''; return; }
      rec = speechRecognize(t => {
        micBtn.style.color = '';
        input.value += t;
        input.focus();
      });
      if (rec) { micBtn.style.color = 'var(--danger)'; rec.onend = () => { micBtn.style.color = ''; rec = null; }; }
    });

    // AI 消息操作（复制）
    root.querySelectorAll('[data-action="ai-msg"]').forEach(bubble => {
      bubble.addEventListener('click', async () => {
        const content = bubble.textContent.trim();
        const act = await UI.actionSheet([
          { label: '复制内容', icon: 'copy' },
          { label: '重新生成', icon: 'refresh' }
        ]);
        if (!act) return;
        if (act.label === '复制内容') copyText(content);
        else this.regenerate(id);
      });
    });

    // 自动发问（从首页输入框跳转而来）
    if (App.autoAsk === id) {
      App.autoAsk = null;
      const last = chat.messages[chat.messages.length - 1];
      if (last && last.role === 'user' && !chat._pending) {
        this.streamAssistant(id, chat);
      }
    }
  },

  /* ---------- 发送与流式 ---------- */
  sendMessage(id, text, ctx) {
    if (App.chatBusy) { UI.toast('AI 正在回复，请稍候'); return; }
    const chat = Store.chats.get(id);
    Store.chats.append(chat, 'user', text, ctx);
    ViewManager.render(this, ['/' + id]);
    this.streamAssistant(id, chat);
  },

  async streamAssistant(id, chat) {
    App.chatBusy = true;
    const root = document.getElementById('view-root');
    const listEl = root.querySelector('#msg-list');
    // 追加 AI 占位气泡
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-row ai';
    wrapper.innerHTML = `<div class="msg-avatar ai">AI</div>
      <div class="msg-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
    listEl.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const bubble = wrapper.querySelector('.msg-bubble');
    let full = '';

    const sys = Store.settings().systemPrompt;
    const messages = [];
    // 问答模式：根据用户问题检索笔记，注入上下文供 AI 参考回答
    if (Store.settings().qaNotes) {
      const qs = chat.messages.filter(m => m.role === 'user').slice(-2).map(m => m.content).join(' ');
      const relNotes = AI.searchNotes(qs, 3);
      const qaSys = sys + '\n\n你是用户的私人问答助手：请优先基于用户笔记的内容回答，答案准确、简洁、务实；若笔记中没有相关信息，请先明确说明「笔记里没有相关内容」，再给出一般性回答。';
      if (relNotes.length) {
        const noteCtx = relNotes.map((n, i) => `${i + 1}.【${n.title || '无标题'}】\n${(n.content || '').slice(0, 600)}`).join('\n\n');
        messages.push({ role: 'system', content: qaSys + '\n\n以下是从用户笔记中检索到的相关资料，回答时请优先参考：\n\n' + noteCtx });
      } else {
        messages.push({ role: 'system', content: qaSys });
      }
    } else {
      messages.push({ role: 'system', content: sys });
    }
    // 截断历史，只取最近 20 条，避免长对话超出 token 限制
    messages.push(...chat.messages.filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        if (m.ctx && m.role === 'user') {
          return { role: 'user', content: m.content + '\n\n[附：图片OCR识别文本]\n' + m.ctx.text };
        }
        return { role: m.role, content: m.content };
      }).slice(-20));

    try {
      full = await AI.chat(messages, {
        onDelta: delta => {
          full += delta;
          if (bubble.querySelector('.typing-dots')) bubble.innerHTML = '';
          bubble.innerHTML = md(full);
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      bubble.innerHTML = md(full);
    } catch (e) {
      console.error(e);
      bubble.innerHTML = md('⚠️ ' + e.message);
      full = '⚠️ ' + e.message;
    } finally {
      App.chatBusy = false;
    }
    Store.chats.append(chat, 'assistant', full);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /** 重新生成最后一条 AI 回复 */
  async regenerate(id) {
    if (App.chatBusy) { UI.toast('AI 正在回复，请稍候'); return; }
    const chat = Store.chats.get(id);
    if (chat.messages.length >= 2 && chat.messages[chat.messages.length - 1].role === 'assistant') {
      chat.messages.pop();
      Store.save();
    }
    ViewManager.render(this, ['/' + id]);
    this.streamAssistant(id, chat);
  },

  /** 自定义 AI 任务（总结对话等），不进入多轮，直接输出 */
  async _runCustomAI(id, cmd) {
    const chat = Store.chats.get(id);
    if (!chat.messages.length) { UI.toast('问答还没有内容'); return; }
    UI.loading('正在' + cmd + '…', true);
    try {
      const result = await AI.summarizeMessages(chat.messages);
      Store.chats.append(chat, 'assistant', `## ${cmd}\n\n` + result);
      ViewManager.render(this, ['/' + id]);
    } catch (e) {
      UI.toast(e.message);
    } finally {
      UI.loading('', false);
    }
  }
};
