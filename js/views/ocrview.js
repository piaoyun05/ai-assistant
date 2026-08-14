/* =========================================================
   OCR 图片文字识别页
   拍照 / 相册 → Tesseract 识别 → 预览编辑 → 保存/AI 联动
   ========================================================= */
const OcrView = {
  name: 'ocr',
  title: '图片文字识别',

  state: { imgUrl: null, file: null, text: '', busy: false, status: '' },

  render() {
    const st = this.state;
    if (!st.imgUrl) {
      return `
        <div class="empty" style="padding-top:60px">${icon('scan')}
          <p style="font-size:15px;color:var(--text-2);margin-bottom:4px">识别图片中的文字</p>
          <p style="font-size:13px">拍照或从相册选择，自动提取文字<br>适用：收据、白板、截图、课件、文档</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 20px;margin-top:20px">
          <button class="btn btn-primary" style="padding:16px" data-src="camera">${icon('camera')} 拍照</button>
          <button class="btn btn-outline" style="padding:16px" data-src="album">${icon('image')} 相册选择</button>
        </div>
        <input type="file" id="ocr-input" accept="image/*" hidden>
        <div class="ai-status" style="margin-top:26px">${icon('bulb')}<span>识别在本地浏览器进行，图片不会上传到服务器</span></div>`;
    }

    const progress = st.busy ? `
      <div class="ocr-progress"><div class="bar"><i style="width:${st.pct || 5}%"></i></div>
      <span style="font-size:12px;color:var(--text-3);white-space:nowrap">${OCR.statusText(st.status)}</span></div>` : '';

    return `
      <div class="ocr-preview"><img id="ocr-preview-img" src="${st.imgUrl}" alt="识别图片"></div>
      ${progress}
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn btn-plain btn-sm" id="ocr-retake">${icon('camera')} 重新拍摄</button>
        <button class="btn btn-plain btn-sm" id="ocr-realbum">${icon('image')} 重新选择</button>
      </div>
      <input type="file" id="ocr-input" accept="image/*" hidden>
      <div class="field">
        <label>识别结果（可手动修正）</label>
        <textarea class="textarea" id="ocr-text" style="min-height:160px" placeholder="识别文字将显示在这里…">${esc(st.text)}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="ocr-actions" style="margin-bottom:10px">${icon('sparkles')} 下一步：选择处理方式</button>
    `;
  },

  bind(root) {
    const self = this;
    const input = root.querySelector('#ocr-input');

    const pick = () => {
      const mode = App.pendingOcrMode || 'album';
      App.pendingOcrMode = null;
      input.setAttribute('accept', 'image/*');
      if (mode === 'camera') input.setAttribute('capture', 'environment');
      else input.removeAttribute('capture');
      input.click();
    };

    root.querySelectorAll('[data-src]').forEach(btn => {
      btn.addEventListener('click', () => {
        App.pendingOcrMode = btn.dataset.src;
        pick();
      });
    });
    root.querySelector('#ocr-retake')?.addEventListener('click', () => { App.pendingOcrMode = 'camera'; pick(); });
    root.querySelector('#ocr-realbum')?.addEventListener('click', () => { App.pendingOcrMode = 'album'; pick(); });

    input.addEventListener('change', () => {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      // 释放上一次的 blob URL，避免内存泄漏
      if (self.state.imgUrl) { try { URL.revokeObjectURL(self.state.imgUrl); } catch (e) {} }
      self.state.file = file;
      self.state.imgUrl = URL.createObjectURL(file);
      self.state.text = '';
      self.state.busy = true;
      self.state.status = '';
      ViewManager.render(this, []);
      self._recognize();
    });

    // 编辑识别结果
    root.querySelector('#ocr-text')?.addEventListener('input', e => { self.state.text = e.target.value; });

    // 下一步
    root.querySelector('#ocr-actions')?.addEventListener('click', async () => {
      const text = (root.querySelector('#ocr-text').value || '').trim();
      if (!text) { UI.toast('请先识别出文字'); return; }
      self.state.text = text;
      const act = await UI.actionSheet([
        { label: '保存为笔记', icon: 'note', color: '#dbeafe', textColor: '#2563eb' },
        { label: 'AI 总结 / 提取要点', icon: 'sparkles', color: '#eef2ff', textColor: '#4f46e5' },
        { label: 'AI 提取日程 / 待办', icon: 'calendar', color: '#d1fae5', textColor: '#059669' },
        { label: '发送到 AI 问答', icon: 'chat', color: '#f3e8ff', textColor: '#9333ea' }
      ]);
      if (!act) return;
      if (act.label === '保存为笔记') {
        const n = Store.notes.create({ title: text.slice(0, 30), content: text });
        UI.toast('已保存为笔记');
        Router.navigate('/note/' + n.id);
      } else if (act.label === 'AI 总结 / 提取要点') {
        this._aiSummary(text);
      } else if (act.label === 'AI 提取日程 / 待办') {
        this._aiExtract(text);
      } else if (act.label === '发送到 AI 问答') {
        const chat = Store.chats.create();
        Store.chats.append(chat, 'user', '请帮我处理这段 OCR 识别出的文字：\n' + text.slice(0, 500), { type: 'ocr', text });
        App.autoAsk = chat.id;
        Router.navigate('/chat/' + chat.id);
      }
    });
  },

  async _recognize() {
    const self = this;
    try {
      const text = await OCR.recognize(self.state.file, m => {
        self.state.status = m.status;
        self.state.pct = Math.round(m.progress * 100);
        const el = document.querySelector('.ocr-progress i');
        if (el) el.style.width = self.state.pct + '%';
      });
      self.state.text = text || '';
      self.state.busy = false;
      self.state.status = '';
      ViewManager.render(this, []);
      if (!text) UI.toast('未识别到文字，可换一张更清晰的图片');
    } catch (e) {
      self.state.busy = false;
      self.state.text = '';
      ViewManager.render(this, []);
      UI.toast(e.message);
    }
  },

  async _aiSummary(text) {
    UI.loading('AI 正在分析…', true);
    try {
      const result = await AI.ask('你是信息提炼助手。请提取下面文字中的关键信息并总结，用 Markdown 输出要点。', text, { stream: false });
      UI.loading('', false);
      NotesView.showAIResult('识别文字总结', result, null, null);
    } catch (e) { UI.loading('', false); UI.toast(e.message); }
  },

  async _aiExtract(text) {
    UI.loading('AI 正在识别日程与待办…', true);
    let data;
    try { data = await AI.extractTasks(text); }
    catch (e) { UI.loading('', false); UI.toast(e.message); return; }
    UI.loading('', false);
    this._showConfirmAdd(data);
  },

  /** 确认后批量加入日程 & 待办 */
  _showConfirmAdd(data) {
    const evs = data.events || [], tds = data.todos || [];
    if (!evs.length && !tds.length) { UI.toast('未识别到日程或待办事项'); return; }

    const evHtml = evs.map((e, i) => `
      <div class="today-item" style="align-items:flex-start">
        <input type="checkbox" checked data-kind="ev" data-i="${i}">
        <div style="flex:1">
          <div style="font-weight:500">${esc(e.title || '未命名')}</div>
          <div style="font-size:12px;color:var(--text-3)">${e.start ? fmtDate(e.start.slice(0, 10), true) + ' ' + (e.start.slice(11, 16) || '') : '时间待定'}${e.location ? ' · ' + esc(e.location) : ''}</div>
        </div>
      </div>`).join('');

    const tdHtml = tds.map((t, i) => `
      <div class="today-item">
        <input type="checkbox" checked data-kind="td" data-i="${i}">
        <div style="flex:1">
          <div>${esc(t.text || '未命名')}</div>
          <div style="font-size:12px;color:var(--text-3)">优先级：${esc(t.priority || '中')}${t.dueDate ? ' · ' + fmtDate(String(t.dueDate).slice(0, 10)) : ''}</div>
        </div>
      </div>`).join('');

    const s = UI.sheet(`
      <div class="sheet-title">确认添加（${evs.length + tds.length} 项）</div>
      ${evs.length ? `<div style="font-size:13px;color:var(--primary);font-weight:600;margin:4px 0 2px">📅 日程</div>${evHtml}` : ''}
      ${tds.length ? `<div style="font-size:13px;color:var(--warning);font-weight:600;margin:4px 0 2px">📋 待办</div>${tdHtml}` : ''}
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn-plain btn-block" data-c="cancel">取消</button>
        <button class="btn btn-primary btn-block" data-c="ok">确认添加</button>
      </div>`);

    s.root.querySelector('[data-c="cancel"]').addEventListener('click', () => s.close());
    s.root.querySelector('[data-c="ok"]').addEventListener('click', () => {
      let added = 0;
      s.root.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
        const i = Number(cb.dataset.i);
        if (cb.dataset.kind === 'ev') {
          const e = evs[i];
          if (e.start) Store.events.create({ title: e.title, start: e.start, end: e.end || '', location: e.location || '', note: e.note || '' });
          else Store.todos.create({ text: e.title, priority: 1, dueDate: null });
        } else {
          const t = tds[i];
          Store.todos.create({ text: t.text, priority: { 高: 2, 中: 1, 低: 0 }[t.priority] ?? 1, dueDate: t.dueDate || null });
        }
        added++;
      });
      s.close();
      if (added) { UI.toast('已添加 ' + added + ' 项'); Router.navigate('/schedule'); }
      else UI.toast('未选择任何事项');
    });
  }
};
