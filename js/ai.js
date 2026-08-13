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

    const resp = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (s.apiKey || '').trim()
      },
      body: JSON.stringify(body),
      signal
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

  return { chat, ask, noteAction, extractTasks, weekReview, summarizeNotes, summarizeMessages, endpoint, mapError };
})();
