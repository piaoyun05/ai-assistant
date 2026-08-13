/* =========================================================
   OCR — 浏览器端文字识别（Tesseract.js，中英文）
   优点：无需后端、无需第三方 OCR 密钥、数据不出本地。
   如需更高精度可自行替换为腾讯/阿里云 OCR 接口。
   ========================================================= */
const OCR = (() => {

  function isReady() {
    return typeof Tesseract !== 'undefined';
  }

  function loadError() {
    return 'OCR 引擎加载失败：请检查网络（Tesseract.js 从 CDN 加载），或更换网络后重试。';
  }

  /**
   * 识别图片文字
   * @param {File} file 图片文件
   * @param {Function} onProgress ({status, progress}) 进度回调
   * @returns {Promise<string>} 识别文本
   */
  async function recognize(file, onProgress) {
    if (!isReady()) throw new Error(loadError());

    let lastStatus = '';
    const logger = m => {
      if (!m) return;
      const status = m.status || '';
      const progress = typeof m.progress === 'number' ? m.progress : 0;
      if (status !== lastStatus) { lastStatus = status; if (onProgress) onProgress({ status, progress }); }
      else if (onProgress) onProgress({ status, progress });
    };

    try {
      const result = await Tesseract.recognize(
        file,
        'chi_sim+eng',
        { logger }
      );
      const text = (result.data && result.data.text || '').trim();
      return text;
    } catch (e) {
      console.error('OCR 失败', e);
      throw new Error('图片识别失败：' + (e.message || '未知错误'));
    }
  }

  const STATUS_TEXT = {
    'loading tesseract core': '加载 OCR 核心…',
    'initializing tesseract': '初始化识别引擎…',
    'loading language traineddata': '下载语言模型（首次较慢）…',
    'loading language traineddata (from cache)': '读取语言模型…',
    'initializing api': '初始化接口…',
    'recognizing text': '正在识别文字…'
  };

  function statusText(status) {
    return STATUS_TEXT[status] || status || '处理中…';
  }

  return { recognize, isReady, loadError, statusText };
})();
