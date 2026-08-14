/* =========================================================
   我的（个人中心 / 设置）
   ========================================================= */
const SettingsView = {
  name: 'settings',
  title: '我的',

  render() {
    const s = Store.settings();
    const st = Store.load();
    const stats = [
      ['笔记', st.notes.length], ['待办', st.todos.length], ['日程', st.events.length], ['问答', st.chats.length]
    ];
    const aiStatus = s.apiKey
      ? `<div class="ai-status ok">${icon('check')}<span>AI 已配置 · ${esc(s.model)}</span></div>`
      : `<div class="ai-status">${icon('alert')}<span>未配置 API Key，AI 功能暂不可用</span></div>`;

    const setItem = (iconName, title, desc, dataAct, iconBg, iconColor, right = '') => `
      <button class="setting-item" data-act="${dataAct}">
        <span class="set-icon" style="background:${iconBg};color:${iconColor}">${icon(iconName)}</span>
        <span class="set-main"><span class="set-title">${title}</span><br><span class="set-desc">${esc(desc)}</span></span>
        <span class="set-right">${right || icon('right')}</span>
      </button>`;

    return `
      <div class="profile-head">
        <div class="profile-avatar">AI</div>
        <div class="profile-name">口袋AI · 个人助手</div>
        <div class="profile-sub">笔记 · OCR · 日程 · 待办 · 智能问答</div>
      </div>

      ${aiStatus}
      <button class="card" data-act="ai-set" style="width:100%;text-align:left;cursor:pointer">
        <div class="card-title">AI 设置 <small>${s.model}</small></div>
        <p style="font-size:13px;color:var(--text-2)">配置 DeepSeek API Key、选择模型与接口地址</p>
      </button>

      <div class="card">
        <div class="card-title">数据统计</div>
        <div class="overview-row">
          ${stats.map(([k, v]) => `<div class="overview-col" style="padding:10px 14px"><h4 style="margin-bottom:2px">${k}</h4><div class="overview-num" style="font-size:20px">${v}</div></div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">数据管理</div>
        ${setItem('database', '备份导出', '导出全部数据为 JSON 文件', 'export', '#dbeafe', '#2563eb')}
        ${setItem('upload', '导入备份', '从 JSON 文件恢复数据', 'import', '#fef3c7', '#d97706')}
        ${setItem('trash', '清除全部数据', '删除本地所有笔记 / 日程 / 问答', 'clear', '#fee2e2', '#dc2626')}
      </div>

      <div class="card">
        <div class="card-title">标签管理</div>
        <div class="tag-editor">
          ${st.extraTags.map(t => `<span class="tag">${esc(t)} <button data-tag-del="${esc(t)}" style="opacity:.7">✕</button></span>`).join('')}
          <input class="tag-add-input" id="set-tag-add" placeholder="+ 添加标签" maxlength="10">
        </div>
      </div>

      <div class="card">
        <div class="card-title">关于</div>
        ${setItem('shield', '隐私说明', '所有数据仅保存在浏览器本地，可随时导出备份', 'privacy', '#dcfce7', '#059669', '')}
        ${setItem('key', '获取 DeepSeek API Key', 'platform.deepseek.com', 'ds', '#f3e8ff', '#9333ea', '')}
        <div class="setting-item" style="border:none">
          <span class="set-icon" style="background:#f3f4f6;color:#6b7280">${icon('bulb')}</span>
          <span class="set-main"><span class="set-title">版本 v1.0.0</span><br><span class="set-desc">基于 DeepSeek API · 纯前端部署 · OCR 由 Tesseract.js 本地识别</span></span>
        </div>
      </div>
    `;
  },

  bind(root) {
    // AI 设置
    root.querySelector('[data-act="ai-set"]').addEventListener('click', () => this.openAISettings());

    // 备份导出（apiKey 脱敏，避免备份文件外泄密钥）
    root.querySelector('[data-act="export"]').addEventListener('click', () => {
      const state = JSON.parse(Store.exportData());
      if (state.settings) state.settings.apiKey = '';
      const data = JSON.stringify(state, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pocket-ai-backup-' + new Date().toISODate() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast('备份已导出（API Key 已脱敏，恢复后需重新填写）');
    });

    // 导入
    root.querySelector('[data-act="import"]').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const ok = await UI.confirm('导入将覆盖当前全部本地数据，确认继续？', '导入');
          if (!ok) return;
          Store.importData(text);
          UI.toast('导入成功');
          ViewManager.render(this, []);
        } catch (e) { UI.toast('导入失败：' + e.message); }
      };
      input.click();
    });

    // 清除数据
    root.querySelector('[data-act="clear"]').addEventListener('click', async () => {
      const ok = await UI.confirm('清除全部数据？此操作不可恢复，建议先导出备份。', '清除');
      if (!ok) return;
      const ok2 = await UI.confirm('再次确认：删除本地所有笔记、待办、日程与问答？', '全部删除');
      if (!ok2) return;
      Store.reset();
      UI.toast('已清除全部数据');
      ViewManager.render(this, []);
    });

    // 标签管理
    root.querySelectorAll('[data-tag-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tagDel;
        Store.load().extraTags = Store.load().extraTags.filter(x => x !== t);
        Store.load().notes.forEach(n => { n.tags = n.tags.filter(x => x !== t); });
        Store.save();
        ViewManager.render(this, []);
      });
    });
    const tagAdd = root.querySelector('#set-tag-add');
    tagAdd.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const v = tagAdd.value.trim();
        if (v && !Store.notes.allTags().includes(v)) {
          Store.load().extraTags.push(v);
          Store.save();
        }
        tagAdd.value = '';
        ViewManager.render(this, []);
      }
    });

    // 隐私说明
    root.querySelector('[data-act="privacy"]').addEventListener('click', () => {
      UI.sheet(`<div class="sheet-title">隐私说明</div>
        <div style="font-size:14px;color:var(--text-2);line-height:1.8">
          <p>· 笔记、待办、日程、对话全部保存在<b>本机浏览器</b>（localStorage）。</p>
          <p>· 图片 OCR 在浏览器本地完成，图片<b>不上传</b>任何服务器。</p>
          <p>· AI 对话时，消息会发送到 DeepSeek API 处理；API Key 仅保存在本机。</p>
          <p>· 清除浏览器站点数据将删除全部内容，请定期「备份导出」。</p>
        </div>
        <button class="btn btn-primary btn-block" data-c="ok" style="margin-top:14px">知道了</button>`);
      document.querySelector('#sheet-body [data-c="ok"]').addEventListener('click', () => UI.closeSheet());
    });

    // DeepSeek 平台
    root.querySelector('[data-act="ds"]').addEventListener('click', () => {
      window.open('https://platform.deepseek.com', '_blank');
    });
  },

  openAISettings() {
    const s = Store.settings();
    const models = ['deepseek-v4-flash', 'deepseek-v4-pro'];
    const sheet = UI.sheet(`
      <div class="sheet-title">AI 设置</div>
      <div class="field">
        <label>DeepSeek API Key</label>
        <input class="input" id="set-key" type="password" placeholder="sk-..." value="${esc(s.apiKey)}">
      </div>
      <div class="field">
        <label>模型</label>
        <select class="select" id="set-model">
          ${models.map(m => `<option value="${m}" ${s.model === m ? 'selected' : ''}>${m}${m === 'deepseek-v4-flash' ? '（推荐·快）' : ''}${m === 'deepseek-v4-pro' ? '（更强·贵）' : ''}</option>`).join('')}
        </select>
        <small style="color:var(--text-3)">v4-flash 适合日常问答（快），v4-pro 适合复杂推理（更强·更贵）</small>
      </div>
      <div class="field">
        <label>接口地址（可选）</label>
        <input class="input" id="set-base" placeholder="https://api.deepseek.com" value="${esc(s.baseUrl || 'https://api.deepseek.com')}">
      </div>
      <div class="field">
        <label>系统提示词（可选）</label>
        <textarea class="textarea" id="set-sys" style="min-height:70px">${esc(s.systemPrompt)}</textarea>
      </div>
      <div class="field">
        <label style="display:block;margin-bottom:6px">智能功能</label>
        <label class="switch-row"><input type="checkbox" id="set-autotitle" ${s.autoTitle ? 'checked' : ''}><span>内容输入完自动生成标题</span></label>
        <label class="switch-row"><input type="checkbox" id="set-refine" ${s.autoRefine ? 'checked' : ''}><span>停止输入后 AI 自动整理并保存</span></label>
        <label class="switch-row"><input type="checkbox" id="set-sync" ${s.autoSync ? 'checked' : ''}><span>笔记中的日程/待办同步到日程</span></label>
        <label class="switch-row"><input type="checkbox" id="set-qa" ${s.qaNotes ? 'checked' : ''}><span>问答优先参考笔记内容回答</span></label>
        <label class="switch-row"><input type="checkbox" id="set-stream" ${s.streamMode ? 'checked' : ''}><span>流式响应（打字效果，部分浏览器不支持）</span></label>
        <small style="color:var(--text-3)">流式默认关闭以保证最大兼容性；在 Chrome/Edge 桌面端可开启获得打字效果</small>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-block" data-c="test">测试连接</button>
        <button class="btn btn-primary btn-block" data-c="save">保存</button>
      </div>`);

    sheet.root.querySelector('[data-c="save"]').addEventListener('click', () => {
      const key = sheet.root.querySelector('#set-key').value.trim();
      const model = sheet.root.querySelector('#set-model').value;
      const baseUrl = sheet.root.querySelector('#set-base').value.trim() || 'https://api.deepseek.com';
      const sys = sheet.root.querySelector('#set-sys').value.trim();
      Object.assign(Store.settings(), {
        apiKey: key, model, baseUrl, systemPrompt: sys,
        autoTitle: sheet.root.querySelector('#set-autotitle').checked,
        autoRefine: sheet.root.querySelector('#set-refine').checked,
        autoSync: sheet.root.querySelector('#set-sync').checked,
        qaNotes: sheet.root.querySelector('#set-qa').checked,
        streamMode: sheet.root.querySelector('#set-stream').checked
      });
      Store.save();
      UI.closeSheet();
      UI.toast('设置已保存');
      ViewManager.render(this, []);
    });

    sheet.root.querySelector('[data-c="test"]').addEventListener('click', async () => {
      const key = sheet.root.querySelector('#set-key').value.trim();
      if (!key) { UI.toast('请先填写 API Key'); return; }
      const baseUrl = sheet.root.querySelector('#set-base').value.trim() || 'https://api.deepseek.com';
      const model = sheet.root.querySelector('#set-model').value;
      // 临时用当前表单值测试，不保存
      const old = { ...Store.settings() };
      Object.assign(Store.settings(), { apiKey: key, baseUrl, model });
      UI.loading('正在测试连接…', true);
      try {
        const r = await AI.ask('你是测试助手，请只回复两个字：成功', 'ping', { stream: false });
        UI.loading('', false);
        UI.toast('连接成功：' + r.slice(0, 30));
      } catch (e) {
        UI.loading('', false);
        UI.toast(e.message);
      } finally {
        Object.assign(Store.settings(), old);
      }
    });
  }
};
