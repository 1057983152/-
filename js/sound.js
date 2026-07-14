// 音效 + 语音（Web Speech API）
const Sound = {
  ctx: null,
  ready: false,
  childVoice: true,
  muted: false,
  _last: "",
  _lastAt: 0,

  init() {
    if (this.ready) return;
    this.ready = true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        if (this.ctx.state === "suspended") this.ctx.resume();
      }
    } catch (e) {}
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.getVoices();
      };
    }
  },

  _audio() {
    if (!this.ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (e) { return false; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return !!this.ctx;
  },

  tone(freq, dur, type, vol) {
    if (this.muted) return;
    type = type || "sine";
    vol = vol == null ? 0.28 : vol;
    try {
      if (!this._audio()) return;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  },

  click() { this.tone(820, 0.05, "sine", 0.12); },
  correct() {
    this.tone(523, 0.12); setTimeout(function () { Sound.tone(659, 0.12); }, 90);
    setTimeout(function () { Sound.tone(784, 0.22); }, 180);
  },
  wrong() { this.tone(180, 0.28, "sawtooth", 0.12); },
  complete() {
    [523, 587, 659, 698, 784, 880].forEach(function (n, i) {
      setTimeout(function () { Sound.tone(n, 0.14, "sine", 0.22); }, i * 70);
    });
  },

  stopSpeak() {
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  },

  _pickVoice(langPrefix) {
    if (!window.speechSynthesis) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    var list = voices.filter(function (v) {
      return v.lang && v.lang.toLowerCase().indexOf(langPrefix) === 0;
    });
    if (!list.length) return null;
    var prefer = langPrefix === "zh"
      ? ["tingting", "xiaoxiao", "xiaoyi", "huihui", "yaoyao", "siri"]
      : ["samantha", "karen", "daniel", "siri", "google us", "english"];
    var best = null, score = -1;
    list.forEach(function (v) {
      var n = (v.name || "").toLowerCase();
      var s = 0;
      prefer.forEach(function (p, i) {
        if (n.indexOf(p) >= 0) s += (prefer.length - i) * 10;
      });
      if (v.localService) s += 4;
      if (s > score) { score = s; best = v; }
    });
    return best || list[0];
  },

  speak(text, lang, rate) {
    if (this.muted || !window.speechSynthesis || !text) return;
    this.init();
    var now = Date.now();
    if (text === this._last && now - this._lastAt < 700) return;
    this._last = text;
    this._lastAt = now;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang || "zh-CN";
    u.rate = rate || (lang && lang.indexOf("en") === 0 ? 0.85 : 0.78);
    u.pitch = this.childVoice ? 1.25 : 1.0;
    u.volume = 1;
    var voice = this._pickVoice(u.lang.indexOf("en") === 0 ? "en" : "zh");
    if (voice) u.voice = voice;
    try { window.speechSynthesis.speak(u); } catch (e) {}
  },

  speakZh(text, rate) { this.speak(text, "zh-CN", rate || 0.75); },
  speakEn(text, rate) { this.speak(text, "en-US", rate || 0.85); },

  speakChar(item) {
    if (!item) return;
    var word = item.words && item.words[0] ? item.words[0] : "";
    this.speakZh(word ? item.char + "，" + word : item.char, 0.72);
  },

  speakPinyinOnly(item) {
    // 读汉字本身（系统会按标准发音），用于「听音选字」
    if (!item) return;
    this.speakZh(item.char, 0.7);
  }
};
