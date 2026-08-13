/* =========================================================
   AI — DeepSeek API 客户端（OpenAI 兼容格式，支持流式）
   直连官方接口（已确认支持 CORS），密钥仅存浏览器本地。
   ========================================================= */
const AI = (() => {

  function endpoint() {
    const s = Store.settings();
    let base = (s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    if (!/\/chat\/completions$/i.test(base)) base += '/chat/completions';
    return base;
  }

  function buildMessages(system, user) {
    const s = Store.settings();
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(user)) messages.push(...user);
    else messages.push({ role: 'user', content: user });
    return messages;
  }

  /**
   * 流式对话。onDelta(content) 回调逐步文本；返回完整内容。
   * 若 stream=false 则不回调，直接返回内容。
   */
  async function chat(messages, opts = {}) {
    const s = Store.settings();
    const { stream = true, onDelta = null, temperature = 0.7, maxTokens = null, jsonMode = false, signal = null } = opts;
    const useStream = stream && onDelta;

    const body = {
      model: s.model,
      messages,
      temperature,
      stream: useStream
    };
    if (jsonMode) { body.response_format = { type: 'json_object' }; body.stream = false; }
    if (maxTokens) body.max_tokens = maxTokens;

    // 超时保护：避免请求挂起导致界面一直显示「处理中」
    // 直连 DeepSeek 在网络不稳时 fetch 可能无限 pending，这里统一 90 秒中止
    const TIMEOUT_MS = 90e3;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const cleanup = () => clearTimeout(timer);

    try {
      const resp = await fetch(endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (s.apiKey || '').trim()
        },
        body: JSON.stringify(body),
        signal: signal || ctrl.signal
      });

      if (!resp.ok) {
        let detail = '';
        try { const d = await resp.json(); detail = d.error?.message || JSON.stringify(d); } catch (e) { detail = await resp.text().catch(() => ''); }
        const msg = mapError(resp.status, detail);
        throw new Error(msg);
      }

      if (!useStream) {
        const data = await resp.json();
        return data.choices?.[0]?.message?.content || '';
      }

      // ---- SSE 流式解析 ----
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      async function pump() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop();
          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') return;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) { full += delta; onDelta(delta); }
              } catch (e) { /* 忽略解析失败的行 */ }
            }
          }
        }
      }
      await pump();
      return full;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('请求超时（' + TIMEOUT_MS / 1000 + ' 秒），请检查网络后重试。若使用国内网络直连 DeepSeek 不稳定，可在「我的 → AI 设置」更换接口地址或配置代理');
      }
      throw e;
    } finally {
      cleanup();
    }
  }

  function mapError(status, detail) {
    const map = {
      401: 'API Key 无效或未填写，请在「我的 → AI 设置」中配置 DeepSeek API Key',
      402: 'DeepSeek 账户余额不足，请到平台充值',
      403: '无访问权限，请检查 API Key',
      404: '接口地址错误，请检查「AI 设置 → 接口地址」',
      429: '请求过于频繁，请稍后再试'
    };
    if (map[status]) return map[status] + (detail ? `（${detail.slice(0, 120)}）` : '');
    return `AI 请求失败（HTTP ${status}）${detail ? '：' + detail.slice(0, 160) : ''}`;
  }

  /* ============ 便捷封装 ============ */

  /** 一次性问答（非流式） */
  async function ask(system, user, opts = {}) {
    const messages = buildMessages(system, user);
    return chat(messages, Object.assign({ stream: false }, opts));
  }

  /** 笔记 AI 操作 */
  async function noteAction(action, content, title = '') {
    const actions = {
      summarize: {
        label: '总结笔记',
        sys: '你是笔记总结助手。请用简洁的要点总结下面笔记的核心内容，输出为 Markdown 列表，条理清晰，不超过 200 字。'
      },
      outline: {
        label: '提炼要点',
        sys: '你是信息提炼专家。请从下面内容中提炼出最重要的要点和关键信息，用 Markdown 列表输出，分点明确。'
      },
      expand: {
        label: '扩写笔记',
        sys: '你是写作助手。请在保留原意的基础上将下面内容扩写得更详细、更充实，输出完整通顺的文字。'
      },
      condense: {
        label: '精简内容',
        sys: '你是编辑。请将下面内容精简压缩，保留核心信息，去除冗余，直接输出精简后的文字。'
      },
      actionlist: {
        label: '生成行动清单',
        sys: '你是任务规划助手。请根据下面内容提取出可执行的行动项，用 Markdown 任务列表（- [ ] 事项）输出，按重要程度排序。'
      },
      translate: {
        label: '翻译',
        sys: '你是翻译专家。请将下面内容翻译成英文（若原文为英文则翻译成中文），保留原有格式结构。'
      },
      structure: {
        label: '结构化整理',
        sys: '你是文档整理助手。请将下面零散内容整理成结构化的 Markdown 文档（含标题、小节、要点），逻辑清晰、层次分明。'
      },
      todo: {
        label: '提取待办',
        sys: '你是任务提取助手。请从下面内容中提取所有需要完成的事项，用 Markdown 任务列表（- [ ] 事项）输出，若有时间信息请在末尾标注。'
      }
    };
    const def = actions[action];
    if (!def) throw new Error('未知的 AI 操作');
    const user = title ? `【笔记标题】${title}\n\n【笔记内容】\n${content}` : content;
    return { label: def.label, result: await ask(def.sys, user, { stream: false }) };
  }

  /**
   * AI 事务提取：从一段文字中识别日程与待办，返回 { events:[], todos:[] }
   * 强制 JSON 输出并校验格式。
   */
  async function extractTasks(text) {
    const today = new Date().toISODate();
    const sys = `你是日程解析助手。从用户提供的文字中提取日程安排和待办事项。
今天是 ${today}。当前时间请参考系统。

只输出一个 JSON 对象，格式如下（不要输出任何其他文字、不要用 Markdown 代码块）：
{
  "events": [
    { "title": "事项标题", "start": "YYYY-MM-DDTHH:mm", "end": "YYYY-MM-DDTHH:mm或留空", "location": "地点或留空", "note": "备注或留空" }
  ],
  "todos": [
    { "text": "待办内容", "priority": "高" 或 "中" 或 "低", "dueDate": "YYYY-MM-DD或留空" }
  ]
}
规则：
1. 有明确时间点（日期+时刻或周几+时刻）的事项放入 events；仅有事项无具体时间的放入 todos。
2. 相对时间（如"周三下午3点""明天上午"）结合今天是 ${today}（周${['日','一','二','三','四','五','六'][new Date().getDay()]}）推算具体日期。
3. 无法确定时间但显然是待办的事项放入 todos。
4. 若完全无法识别任何事项，输出 {"events":[],"todos":[]}。`;
    let raw;
    try {
      raw = await ask(sys, text, { stream: false, temperature: 0.2 });
    } catch (e) {
      throw new Error('事务提取失败：' + e.message);
    }
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const obj = JSON.parse(cleaned);
      return {
        events: Array.isArray(obj.events) ? obj.events : [],
        todos: Array.isArray(obj.todos) ? obj.todos : []
      };
    } catch (e) {
      throw new Error('AI 返回格式无法解析，请重试。原始返回：' + raw.slice(0, 200));
    }
  }

  /** 本周安排 AI 汇总 + 冲突检测 + 行动建议 */
  async function weekReview(events, todos) {
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fmt = d => `${d.getMonth() + 1}月${d.getDate()}日`;
    const evText = events.map(e => `【日程】${fmt(new Date(e.start))} ${e.start.slice(11, 16)} ${e.title}${e.location ? '(' + e.location + ')' : ''}`).join('\n') || '（无）';
    const tdText = todos.map(t => `【待办】${t.done ? '[已完成] ' : ''}${t.text}${t.dueDate ? '(' + t.dueDate + ')' : ''}`).join('\n') || '（无）';
    const sys = `你是日程规划助手。今天 ${fmt(now)}。用户本周（${fmt(monday)} ~ ${fmt(sunday)}）的安排如下，请：
1. 用一句话概括本周主要安排；
2. 检查时间冲突（同一时间多个日程）；
3. 结合待办给出行动建议（优先做什么、何时做）；
用 Markdown 输出，简洁实用。`;
    return ask(sys, `本周日程：\n${evText}\n\n待办清单：\n${tdText}`, { stream: false });
  }

  /** 批量总结多条笔记 */
  async function summarizeNotes(notes) {
    const text = notes.map((n, i) => `${i + 1}.【${n.title || '无标题'}】${n.content}`).join('\n\n');
    const sys = '你是知识归纳助手。请对下面多条笔记进行整体汇总，提炼共同主题与关键信息，用 Markdown 输出（主题、要点、可执行建议）。';
    return ask(sys, text, { stream: false });
  }

  /** 总结一段对话 */
  async function summarizeMessages(messages) {
    const text = messages.filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n');
    const sys = '你是对话总结助手。请总结下面这段对话：1) 讨论了什么问题；2) 达成了哪些结论；3) 还有哪些未解决事项。用 Markdown 输出。';
    return ask(sys, text, { stream: false });
  }

  /** 根据笔记内容生成简短标题（AI 失败时回退本地截取） */
  async function genTitle(content) {
    const fallback = () => (content || '').replace(/\s+/g, ' ').trim().slice(0, 12) || '无标题笔记';
    if (!Store.settings().apiKey) return fallback();
    try {
      const sys = '你是笔记标题助手。请根据内容生成一个简洁的中文标题，不超过 12 个字。只输出标题本身，不要引号、句号、多余文字。';
      const t = (await ask(sys, (content || '').slice(0, 800), { stream: false, temperature: 0.3 })).trim();
      const clean = t.replace(/^["'「」『』《》【】]+|["'「」『』《》【】]+$/g, '').replace(/\s+/g, ' ').slice(0, 20);
      return clean || fallback();
    } catch (e) { return fallback(); }
  }

  /** AI 整理笔记内容（纠错、分段、保留全部信息），失败时原样返回 */
  async function refineNote(content, title = '') {
    const sys = '你是笔记整理助手。请对用户的笔记做整理：1) 修正错别字与语病；2) 适当分段、补充小标题；3) 保留全部要点、不丢失任何信息；4) 不新增用户没有写过的内容。直接输出整理后的笔记正文（可用 Markdown），不要任何开场白或结束语。';
    const input = (title && title.trim() && title.trim() !== '无标题' ? `【笔记标题】${title}\n\n` : '') + (content || '');
    return ask(sys, input, { stream: false, temperature: 0.3 });
  }

  /** 简单字符串哈希（用于笔记内容去重判断） */
  function hash(text) {
    let h = 5381;
    const s = String(text == null ? '' : text);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /** 基于关键词从笔记库检索相关笔记（标题命中权重更高、内容靠前命中权重更高） */
  function searchNotes(query, limit = 3) {
    const qs = String(query || '').toLowerCase().split(/[\s,，。.、;；:：!！?？]+/).filter(w => w.length >= 2);
    if (!qs.length) return [];
    const scored = Store.notes.list({ archived: false }).map(n => {
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();
      let score = 0;
      for (const q of qs) {
        if (title.includes(q)) score += 6;
        const idx = content.indexOf(q);
        if (idx >= 0) score += 2 + Math.max(0, 3 - Math.floor(idx / 200));
      }
      return { n, score };
    }).filter(x => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(x => x.n);
  }

  return { chat, ask, noteAction, extractTasks, weekReview, summarizeNotes, summarizeMessages, genTitle, refineNote, hash, searchNotes, endpoint, mapError };
})();
