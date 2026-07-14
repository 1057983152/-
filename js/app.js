// 快乐启蒙乐园 - 主应用
(function () {
  "use strict";

  var state = {
    page: "home",
    grade: "一年级",
    enTheme: "动物 Animals",
    quiz: null,
    memory: null,
    whack: null
  };

  var $ = function (id) { return document.getElementById(id); };
  var panel = function () { return $("mainPanel"); };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickN(list, n) {
    return shuffle(list).slice(0, Math.min(n, list.length));
  }

  function confetti() {
    var emojis = ["⭐", "🎉", "✨", "🌟", "💖", "🎈", "🌈"];
    for (var i = 0; i < 14; i++) {
      (function (i) {
        setTimeout(function () {
          var el = document.createElement("div");
          el.className = "confetti";
          el.textContent = emojis[i % emojis.length];
          el.style.left = (10 + Math.random() * 80) + "vw";
          el.style.top = (5 + Math.random() * 20) + "vh";
          document.body.appendChild(el);
          setTimeout(function () { el.remove(); }, 1300);
        }, i * 40);
      })(i);
    }
  }

  function updateStats() {
    var d = Store.load();
    var s = $("starCount");
    var c = $("cnCount");
    var e = $("enCount");
    if (s) s.textContent = d.stars || 0;
    if (c) c.textContent = d.cnDone || 0;
    if (e) e.textContent = d.enDone || 0;
  }

  function setNav(page) {
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.page === page);
    });
  }

  function go(page) {
    Sound.init();
    Sound.click();
    state.page = page;
    setNav(["home", "chinese", "english", "games", "me"].indexOf(page) >= 0 ? page : "home");
    if (page === "home") renderHome();
    else if (page === "chinese") renderChineseHub();
    else if (page === "english") renderEnglishHub();
    else if (page === "games") renderGamesHub();
    else if (page === "me") renderMe();
    else if (page === "cn-learn") renderCnLearn();
    else if (page === "cn-pinyin") startCnQuiz("pinyin");
    else if (page === "cn-listen") startCnQuiz("listen");
    else if (page === "en-abc") renderEnAbc();
    else if (page === "en-words") renderEnWords();
    else if (page === "en-listen") startEnQuiz("listen");
    else if (page === "en-pic") startEnQuiz("pic");
    else if (page === "game-memory-cn") startMemory("cn");
    else if (page === "game-memory-en") startMemory("en");
    else if (page === "game-whack") startWhack();
    else if (page === "game-spell") startSpell();
    updateStats();
  }

  // ===== 首页 =====
  function renderHome() {
    panel().innerHTML =
      '<div class="hero">' +
        '<div class="mascot">🐼</div>' +
        '<h2>快乐启蒙乐园</h2>' +
        '<p>认汉字 · 学英语 · 玩趣味游戏</p>' +
        '<div class="mode-grid">' +
          card("cn", "📖", "汉字乐园", "看拼音认字 · 听音选字", "chinese") +
          card("en", "🔤", "英语启蒙", "字母 · 单词 · 听音选词", "english") +
          card("game", "🎮", "趣味游戏", "翻牌 · 抓字 · 拼单词", "games") +
          card("cn", "👁️", "看拼音认字", "看见拼音，选出汉字", "cn-pinyin") +
          card("cn", "👂", "听音选字", "听读音，选出汉字", "cn-listen") +
          card("en", "🎧", "听音选词", "听英语，选出单词", "en-listen") +
        '</div>' +
      '</div>';
  }

  function card(cls, icon, name, desc, page) {
    return '<button class="mode-card ' + cls + '" data-go="' + page + '">' +
      '<span class="icon">' + icon + '</span>' +
      '<span class="name">' + name + '</span>' +
      '<span class="desc">' + desc + '</span></button>';
  }

  function head(title, backPage) {
    return '<div class="section-head">' +
      '<h2>' + title + '</h2>' +
      '<button class="btn-back" data-go="' + (backPage || "home") + '">← 返回</button>' +
      '</div>';
  }

  // ===== 中文中心 =====
  function renderChineseHub() {
    var grades = getChineseGrades();
    var chips = grades.map(function (g) {
      return '<button class="chip' + (state.grade === g ? " active" : "") +
        '" data-grade="' + g + '">' + g + '</button>';
    }).join("") +
      '<button class="chip' + (state.grade === "全部" ? " active" : "") +
      '" data-grade="全部">全部</button>';

    panel().innerHTML = head("📖 汉字乐园", "home") +
      '<div class="filters" id="gradeFilters">' + chips + '</div>' +
      '<div class="mode-grid">' +
        card("cn", "📚", "学一学", "点字听读 · 看拼音组词", "cn-learn") +
        card("cn", "👁️", "看拼音认字", "根据拼音选择汉字", "cn-pinyin") +
        card("cn", "👂", "听音选字", "听读音选择汉字", "cn-listen") +
        card("game", "🃏", "汉字翻牌", "拼音和汉字配对", "game-memory-cn") +
      '</div>' +
      '<p class="sub-info" style="text-align:center;margin-top:16px">当前词库：' +
        (state.grade === "全部" ? "全部年级" : state.grade) +
        ' · 共 ' + getChineseList(state.grade === "全部" ? null : state.grade).length + ' 字</p>';
  }

  // 中文学一学
  function renderCnLearn() {
    var list = getChineseList(state.grade === "全部" ? null : state.grade);
    if (!list.length) {
      panel().innerHTML = head("学一学", "chinese") + '<div class="empty-hint">暂无汉字</div>';
      return;
    }
    if (state.learnIdx == null || state.learnIdx >= list.length) state.learnIdx = 0;
    var item = list[state.learnIdx];
    panel().innerHTML = head("📚 学一学", "chinese") +
      '<div class="progress-wrap"><div class="progress-bar" style="width:' +
        (((state.learnIdx + 1) / list.length) * 100) + '%"></div></div>' +
      '<div class="learn-stage">' +
        '<div class="sub-info">' + (state.learnIdx + 1) + ' / ' + list.length + '</div>' +
        '<div class="big-pinyin">' + item.pinyin + '</div>' +
        '<div class="big-char">' + item.char + '</div>' +
        '<div class="sub-info">组词：' + (item.words || []).join("、") + '</div>' +
        '<button class="speak-btn" id="btnSpeakChar">🔊 读一读</button>' +
        '<div class="btn-row">' +
          '<button class="btn btn-ghost" id="btnPrev">← 上一个</button>' +
          '<button class="btn btn-primary" id="btnNext">下一个 →</button>' +
        '</div>' +
      '</div>';

    $("btnSpeakChar").onclick = function () { Sound.speakChar(item); };
    $("btnPrev").onclick = function () {
      state.learnIdx = (state.learnIdx - 1 + list.length) % list.length;
      renderCnLearn();
    };
    $("btnNext").onclick = function () {
      state.learnIdx = (state.learnIdx + 1) % list.length;
      Store.bump("cnDone");
      updateStats();
      renderCnLearn();
    };
    setTimeout(function () { Sound.speakChar(item); }, 250);
  }

  // 中文测验：看拼音 / 听音
  function startCnQuiz(mode) {
    var list = getChineseList(state.grade === "全部" ? null : state.grade);
    if (list.length < 4) {
      panel().innerHTML = head("练习", "chinese") + '<div class="empty-hint">词库太少，请换年级</div>';
      return;
    }
    state.quiz = {
      mode: mode,
      list: list,
      total: 10,
      index: 0,
      score: 0,
      answered: false
    };
    nextCnQuestion();
  }

  function nextCnQuestion() {
    var q = state.quiz;
    if (q.index >= q.total) {
      finishQuiz(q.score, q.total, "chinese", q.mode === "pinyin" ? "看拼音认字" : "听音选字");
      return;
    }
    var answer = q.list[Math.floor(Math.random() * q.list.length)];
    var distractors = pickN(q.list.filter(function (x) { return x.char !== answer.char; }), 3);
    var choices = shuffle(distractors.concat([answer]));
    q.current = answer;
    q.choices = choices;
    q.answered = false;
    q.wrongCount = 0;

    var title = q.mode === "pinyin" ? "👁️ 看拼音认字" : "👂 听音选字";
    var promptMain = q.mode === "pinyin"
      ? '<div class="prompt-main">' + answer.pinyin + '</div><div class="prompt-sub">选出正确的汉字</div>'
      : '<div class="prompt-main" style="font-size:3rem">🔊</div><div class="prompt-sub">听读音，选出正确的汉字</div>' +
        '<button class="speak-btn" id="btnReplay">再听一遍</button>';

    panel().innerHTML = head(title, "chinese") +
      '<div class="progress-wrap"><div class="progress-bar" style="width:' +
        ((q.index / q.total) * 100) + '%"></div></div>' +
      '<div class="quiz-prompt">' +
        '<span class="label">第 ' + (q.index + 1) + ' / ' + q.total + ' 题 · ⭐ ' + q.score + '</span>' +
        promptMain +
      '</div>' +
      '<div class="choice-grid" id="choices"></div>' +
      '<div class="feedback" id="feedback"></div>';

    var box = $("choices");
    choices.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = c.char;
      b.onclick = function () { onCnChoice(c, b); };
      box.appendChild(b);
    });

    if (q.mode === "listen") {
      setTimeout(function () { Sound.speakPinyinOnly(answer); }, 280);
      var rp = $("btnReplay");
      if (rp) rp.onclick = function () { Sound.speakPinyinOnly(answer); };
    }
    // 看拼音模式：只显示拼音，不先读出汉字（避免泄题）
  }

  function onCnChoice(choice, btn) {
    var q = state.quiz;
    if (!q || q.answered || btn.disabled) return;
    var ok = choice.char === q.current.char;
    var fb = $("feedback");

    if (ok) {
      q.answered = true;
      document.querySelectorAll(".choice-btn").forEach(function (b) {
        b.disabled = true;
        if (b.textContent === q.current.char) b.classList.add("correct");
      });
      btn.classList.add("correct");
      q.score++;
      Sound.correct();
      Store.addStars(1);
      Store.bump("cnDone");
      if (fb) {
        fb.className = "feedback ok";
        fb.textContent = (q.wrongCount > 0 ? "第二次选对了！👍 " : "太棒了！🎉 ") +
          q.current.char + " " + q.current.pinyin;
      }
      if (q.wrongCount === 0) confetti();
      updateStats();
      setTimeout(function () {
        q.index++;
        nextCnQuestion();
      }, 900);
      return;
    }

    // 选错
    btn.classList.add("wrong");
    btn.disabled = true;
    Sound.wrong();
    q.wrongCount = (q.wrongCount || 0) + 1;

    if (q.wrongCount < 2) {
      // 第一次机会：不公布答案，让再选一次
      if (fb) {
        fb.className = "feedback bad";
        fb.textContent = "不对哦，还有 1 次机会，再选一次！💪";
      }
      // 听音模式再播一次读音
      if (q.mode === "listen") {
        setTimeout(function () { Sound.speakPinyinOnly(q.current); }, 350);
      }
      return;
    }

    // 第二次仍错：公布答案并进入下一题
    q.answered = true;
    document.querySelectorAll(".choice-btn").forEach(function (b) {
      b.disabled = true;
      if (b.textContent === q.current.char) b.classList.add("correct");
    });
    if (fb) {
      fb.className = "feedback bad";
      fb.textContent = "答案是 " + q.current.char + "（" + q.current.pinyin + "），下一题加油！";
    }
    Sound.speakChar(q.current);
    setTimeout(function () {
      q.index++;
      nextCnQuestion();
    }, 1500);
  }

  // ===== 英语中心 =====
  function renderEnglishHub() {
    panel().innerHTML = head("🔤 英语启蒙", "home") +
      '<p class="sub-info" style="text-align:center;margin-bottom:14px">' +
        '参考开源启蒙思路：字母发音 · 主题词汇 · 听音选词 · 看图选词' +
      '</p>' +
      '<div class="mode-grid">' +
        card("en", "🅰️", "ABC 字母", "点字母听发音", "en-abc") +
        card("en", "🃏", "主题单词卡", "动物颜色水果…", "en-words") +
        card("en", "🎧", "听音选词", "听英语选单词", "en-listen") +
        card("en", "🖼️", "看图选词", "看 emoji 选单词", "en-pic") +
        card("game", "🧩", "英语翻牌", "中英配对记忆", "game-memory-en") +
        card("game", "✏️", "拼单词", "听音拼出单词", "game-spell") +
      '</div>';
  }

  function renderEnAbc() {
    var html = head("🅰️ ABC 字母", "english") +
      '<div class="filters">' +
        '<button class="chip active" data-case="upper">大写</button>' +
        '<button class="chip" data-case="lower">小写</button>' +
      '</div>' +
      '<div class="alpha-grid" id="alphaGrid"></div>' +
      '<div class="learn-stage" id="alphaDetail" style="margin-top:16px">' +
        '<div class="sub-info">点一个字母开始吧！</div>' +
      '</div>';
    panel().innerHTML = html;
    var upper = true;
    function draw() {
      var grid = $("alphaGrid");
      grid.innerHTML = "";
      ENGLISH_ALPHABET.forEach(function (a) {
        var b = document.createElement("button");
        b.className = "alpha-btn" + (upper ? " upper" : "");
        b.textContent = upper ? a.upper : a.lower;
        b.onclick = function () {
          Sound.speakEn(a.upper);
          $("alphaDetail").innerHTML =
            '<div class="big-word">' + a.upper + ' ' + a.lower + '</div>' +
            '<div class="sub-info">' + a.example + '</div>' +
            '<button class="speak-btn" id="sayLetter">🔊 再听</button>';
          $("sayLetter").onclick = function () { Sound.speakEn(a.upper); };
        };
        grid.appendChild(b);
      });
    }
    draw();
    panel().querySelectorAll("[data-case]").forEach(function (chip) {
      chip.onclick = function () {
        upper = chip.dataset.case === "upper";
        panel().querySelectorAll("[data-case]").forEach(function (c) {
          c.classList.toggle("active", c === chip);
        });
        draw();
      };
    });
  }

  function renderEnWords() {
    var themes = getEnglishThemes();
    if (!state.enTheme || !ENGLISH_THEMES[state.enTheme]) state.enTheme = themes[0];
    var tabs = themes.map(function (t) {
      return '<button class="chip' + (t === state.enTheme ? " active" : "") +
        '" data-theme="' + t + '">' + t.split(" ")[0] + '</button>';
    }).join("");
    var words = getEnglishWords(state.enTheme);
    panel().innerHTML = head("🃏 主题单词卡", "english") +
      '<div class="theme-tabs" id="themeTabs">' + tabs + '</div>' +
      '<div class="word-grid" id="wordGrid"></div>';
    var grid = $("wordGrid");
    words.forEach(function (w) {
      var b = document.createElement("button");
      b.className = "word-card";
      b.innerHTML = '<span class="em">' + w.emoji + '</span><span class="en">' +
        w.en + '</span><span class="zh">' + w.zh + '</span>';
      b.onclick = function () {
        Sound.speakEn(w.en);
        Store.bump("enDone");
        updateStats();
      };
      grid.appendChild(b);
    });
    $("themeTabs").querySelectorAll("[data-theme]").forEach(function (chip) {
      chip.onclick = function () {
        state.enTheme = chip.dataset.theme;
        renderEnWords();
      };
    });
  }

  function startEnQuiz(mode) {
    var list = getEnglishWords(state.enTheme);
    if (list.length < 4) list = getEnglishWords(null);
    state.quiz = {
      mode: mode,
      list: list,
      total: 10,
      index: 0,
      score: 0,
      answered: false,
      kind: "en"
    };
    nextEnQuestion();
  }

  function nextEnQuestion() {
    var q = state.quiz;
    if (q.index >= q.total) {
      finishQuiz(q.score, q.total, "english", q.mode === "listen" ? "听音选词" : "看图选词");
      return;
    }
    var answer = q.list[Math.floor(Math.random() * q.list.length)];
    var distractors = pickN(q.list.filter(function (x) { return x.en !== answer.en; }), 3);
    var choices = shuffle(distractors.concat([answer]));
    q.current = answer;
    q.choices = choices;
    q.answered = false;
    q.wrongCount = 0;

    var title = q.mode === "listen" ? "🎧 听音选词" : "🖼️ 看图选词";
    var promptMain = q.mode === "listen"
      ? '<div class="prompt-main" style="font-size:3rem">🔊</div>' +
        '<div class="prompt-sub">听一听，选出正确的英语单词</div>' +
        '<button class="speak-btn" id="btnReplay">再听一遍</button>'
      : '<div class="emoji-big">' + answer.emoji + '</div>' +
        '<div class="prompt-sub">这是什么？选出英语单词</div>' +
        '<div class="sub-info">提示：' + answer.zh + '</div>';

    panel().innerHTML = head(title, "english") +
      '<div class="progress-wrap"><div class="progress-bar" style="width:' +
        ((q.index / q.total) * 100) + '%"></div></div>' +
      '<div class="quiz-prompt">' +
        '<span class="label">第 ' + (q.index + 1) + ' / ' + q.total + ' 题 · ⭐ ' + q.score + '</span>' +
        promptMain +
      '</div>' +
      '<div class="choice-grid" id="choices"></div>' +
      '<div class="feedback" id="feedback"></div>';

    var box = $("choices");
    choices.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "choice-btn sm";
      b.textContent = c.en;
      b.onclick = function () { onEnChoice(c, b); };
      box.appendChild(b);
    });

    if (q.mode === "listen") {
      setTimeout(function () { Sound.speakEn(answer.en); }, 280);
      var rp = $("btnReplay");
      if (rp) rp.onclick = function () { Sound.speakEn(answer.en); };
    }
  }

  function onEnChoice(choice, btn) {
    var q = state.quiz;
    if (!q || q.answered || btn.disabled) return;
    var ok = choice.en === q.current.en;
    var fb = $("feedback");

    if (ok) {
      q.answered = true;
      document.querySelectorAll(".choice-btn").forEach(function (b) {
        b.disabled = true;
        if (b.textContent === q.current.en) b.classList.add("correct");
      });
      btn.classList.add("correct");
      q.score++;
      Sound.correct();
      Store.addStars(1);
      Store.bump("enDone");
      if (fb) {
        fb.className = "feedback ok";
        fb.textContent = (q.wrongCount > 0 ? "第二次选对了！👍 " : "Great! 🎉 ") +
          q.current.emoji + " " + q.current.en;
      }
      if (q.wrongCount === 0) confetti();
      updateStats();
      setTimeout(function () {
        q.index++;
        nextEnQuestion();
      }, 900);
      return;
    }

    // 选错
    btn.classList.add("wrong");
    btn.disabled = true;
    Sound.wrong();
    q.wrongCount = (q.wrongCount || 0) + 1;

    if (q.wrongCount < 2) {
      if (fb) {
        fb.className = "feedback bad";
        fb.textContent = "Not this one! 还有 1 次机会，再选一次！💪";
      }
      if (q.mode === "listen") {
        setTimeout(function () { Sound.speakEn(q.current.en); }, 350);
      }
      return;
    }

    // 第二次仍错
    q.answered = true;
    document.querySelectorAll(".choice-btn").forEach(function (b) {
      b.disabled = true;
      if (b.textContent === q.current.en) b.classList.add("correct");
    });
    if (fb) {
      fb.className = "feedback bad";
      fb.textContent = "答案是 " + q.current.en + "（" + q.current.zh + "），下一题加油！";
    }
    Sound.speakEn(q.current.en);
    setTimeout(function () {
      q.index++;
      nextEnQuestion();
    }, 1500);
  }

  // ===== 游戏中心 =====
  function renderGamesHub() {
    panel().innerHTML = head("🎮 趣味游戏", "home") +
      '<div class="mode-grid">' +
        card("game", "🃏", "汉字翻牌", "拼音 ⟷ 汉字", "game-memory-cn") +
        card("game", "🧩", "英语翻牌", "emoji ⟷ 单词", "game-memory-en") +
        card("game", "🐹", "抓正确字", "听音点正确汉字", "game-whack") +
        card("game", "✏️", "拼单词", "听音拼字母", "game-spell") +
        card("cn", "👁️", "看拼音认字", "闯关练习", "cn-pinyin") +
        card("en", "🎧", "听音选词", "闯关练习", "en-listen") +
      '</div>';
  }

  // 记忆翻牌
  function startMemory(kind) {
    var pairs = [];
    if (kind === "cn") {
      var chars = pickN(getChineseList(state.grade === "全部" ? null : state.grade), 6);
      chars.forEach(function (c) {
        pairs.push({ id: c.char, show: c.char, sub: "", type: "char", speak: c.char, lang: "zh" });
        pairs.push({ id: c.char, show: c.pinyin, sub: "", type: "py", speak: c.char, lang: "zh" });
      });
    } else {
      var words = pickN(getEnglishWords(state.enTheme), 6);
      words.forEach(function (w) {
        pairs.push({ id: w.en, show: w.emoji, sub: w.zh, type: "pic", speak: w.en, lang: "en" });
        pairs.push({ id: w.en, show: w.en, sub: "", type: "word", speak: w.en, lang: "en" });
      });
    }
    state.memory = {
      kind: kind,
      cards: shuffle(pairs).map(function (p, i) {
        return { i: i, id: p.id, show: p.show, sub: p.sub, speak: p.speak, lang: p.lang, flipped: false, matched: false };
      }),
      open: [],
      lock: false,
      matched: 0,
      moves: 0
    };
    renderMemory();
  }

  function renderMemory() {
    var m = state.memory;
    var title = m.kind === "cn" ? "🃏 汉字翻牌" : "🧩 英语翻牌";
    panel().innerHTML = head(title, "games") +
      '<div class="timer-score"><span>步数 ' + m.moves + '</span><span>配对 ' + m.matched + '/6</span></div>' +
      '<div class="memory-board" id="memBoard"></div>';
    var board = $("memBoard");
    m.cards.forEach(function (card, idx) {
      var btn = document.createElement("button");
      btn.className = "mem-card" + (card.flipped || card.matched ? " flipped" : "") +
        (card.matched ? " matched" : "");
      btn.innerHTML =
        '<div class="mem-inner">' +
          '<div class="mem-face mem-back">❓</div>' +
          '<div class="mem-face mem-front">' + card.show +
            (card.sub ? '<span class="small">' + card.sub + '</span>' : '') +
          '</div>' +
        '</div>';
      btn.onclick = function () { flipCard(idx); };
      board.appendChild(btn);
    });
  }

  function flipCard(idx) {
    var m = state.memory;
    if (!m || m.lock) return;
    var card = m.cards[idx];
    if (card.flipped || card.matched) return;
    card.flipped = true;
    m.open.push(idx);
    Sound.click();
    if (card.lang === "en") Sound.speakEn(card.speak);
    else Sound.speakZh(card.speak);
    renderMemory();

    if (m.open.length === 2) {
      m.moves++;
      m.lock = true;
      var a = m.cards[m.open[0]];
      var b = m.cards[m.open[1]];
      if (a.id === b.id) {
        a.matched = b.matched = true;
        m.matched++;
        m.open = [];
        m.lock = false;
        Sound.correct();
        Store.addStars(2);
        Store.bump("games");
        updateStats();
        renderMemory();
        if (m.matched >= 6) {
          setTimeout(function () {
            Sound.complete();
            confetti();
            showModal("🎉", "配对成功！", "用了 " + m.moves + " 步完成全部配对", function () {
              go("games");
            }, function () {
              startMemory(m.kind);
            });
          }, 400);
        }
      } else {
        setTimeout(function () {
          a.flipped = b.flipped = false;
          m.open = [];
          m.lock = false;
          Sound.wrong();
          renderMemory();
        }, 800);
      }
    }
  }

  // 抓正确字（打地鼠）
  function startWhack() {
    var list = getChineseList(state.grade === "全部" ? null : state.grade);
    state.whack = {
      list: list,
      score: 0,
      time: 30,
      target: null,
      holes: [null, null, null, null, null, null, null, null, null],
      timer: null,
      spawnTimer: null,
      running: true
    };
    renderWhack();
    nextWhackTarget();
    state.whack.timer = setInterval(function () {
      if (!state.whack || !state.whack.running) return;
      state.whack.time--;
      var t = $("whackTime");
      if (t) t.textContent = state.whack.time;
      if (state.whack.time <= 0) endWhack();
    }, 1000);
    state.whack.spawnTimer = setInterval(spawnWhack, 900);
    spawnWhack();
  }

  function nextWhackTarget() {
    var w = state.whack;
    w.target = w.list[Math.floor(Math.random() * w.list.length)];
    var el = $("whackTarget");
    if (el) el.textContent = "找：" + w.target.char + "（" + w.target.pinyin + "）";
    Sound.speakPinyinOnly(w.target);
  }

  function spawnWhack() {
    var w = state.whack;
    if (!w || !w.running) return;
    // 清空部分洞
    for (var i = 0; i < 9; i++) {
      if (Math.random() < 0.5) w.holes[i] = null;
    }
    // 保证至少一个正确
    var correctHole = Math.floor(Math.random() * 9);
    w.holes[correctHole] = w.target;
    for (var j = 0; j < 9; j++) {
      if (j === correctHole) continue;
      if (Math.random() < 0.55) {
        var wrong = w.list[Math.floor(Math.random() * w.list.length)];
        if (wrong.char === w.target.char) {
          var tries = 0;
          while (wrong.char === w.target.char && tries < 10) {
            wrong = w.list[Math.floor(Math.random() * w.list.length)];
            tries++;
          }
        }
        w.holes[j] = wrong.char === w.target.char ? null : wrong;
      }
    }
    paintWhack();
  }

  function paintWhack() {
    var w = state.whack;
    var area = $("whackArea");
    if (!area || !w) return;
    area.innerHTML = "";
    w.holes.forEach(function (item, i) {
      var d = document.createElement("button");
      d.className = "hole" + (item ? "" : " empty");
      d.textContent = item ? item.char : "·";
      d.onclick = function () {
        if (!item || !w.running) return;
        if (item.char === w.target.char) {
          d.classList.add("hit-good");
          w.score++;
          Sound.correct();
          Store.addStars(1);
          updateStats();
          var s = $("whackScore");
          if (s) s.textContent = w.score;
          nextWhackTarget();
          setTimeout(spawnWhack, 200);
        } else {
          d.classList.add("hit-bad");
          Sound.wrong();
        }
      };
      area.appendChild(d);
    });
  }

  function renderWhack() {
    var w = state.whack;
    panel().innerHTML = head("🐹 抓正确字", "games") +
      '<div class="timer-score">' +
        '<span>⏱ <span id="whackTime">' + w.time + '</span>s</span>' +
        '<span>⭐ <span id="whackScore">' + w.score + '</span></span>' +
      '</div>' +
      '<div class="quiz-prompt"><div class="prompt-sub" id="whackTarget">准备…</div>' +
        '<button class="speak-btn" id="btnReplayTarget">🔊 再听</button></div>' +
      '<div class="whack-area" id="whackArea"></div>';
    $("btnReplayTarget").onclick = function () {
      if (w.target) Sound.speakPinyinOnly(w.target);
    };
    paintWhack();
  }

  function endWhack() {
    var w = state.whack;
    if (!w) return;
    w.running = false;
    clearInterval(w.timer);
    clearInterval(w.spawnTimer);
    Store.bump("games");
    Sound.complete();
    confetti();
    showModal("🏆", "时间到！", "你抓住了 " + w.score + " 个正确的字！", function () {
      go("games");
    }, function () {
      startWhack();
    });
  }

  // 拼单词
  function startSpell() {
    var list = getEnglishWords(state.enTheme);
    if (list.length < 3) list = getEnglishWords(null);
    // 优先短词
    list = list.filter(function (w) { return w.en.length <= 6; });
    if (list.length < 3) list = getEnglishWords(null).filter(function (w) { return w.en.length <= 7; });
    state.quiz = {
      kind: "spell",
      list: list,
      total: 8,
      index: 0,
      score: 0
    };
    nextSpell();
  }

  function nextSpell() {
    var q = state.quiz;
    if (q.index >= q.total) {
      finishQuiz(q.score, q.total, "games", "拼单词");
      return;
    }
    var word = q.list[Math.floor(Math.random() * q.list.length)];
    q.current = word;
    q.built = "";
    var letters = shuffle(word.en.split(""));
    // 加 2 个干扰字母
    var pool = "abcdefghijklmnopqrstuvwxyz";
    while (letters.length < word.en.length + 2) {
      var ch = pool[Math.floor(Math.random() * pool.length)];
      letters.push(ch);
    }
    letters = shuffle(letters);
    q.letters = letters;

    panel().innerHTML = head("✏️ 拼单词", "games") +
      '<div class="progress-wrap"><div class="progress-bar" style="width:' +
        ((q.index / q.total) * 100) + '%"></div></div>' +
      '<div class="quiz-prompt">' +
        '<span class="label">第 ' + (q.index + 1) + ' / ' + q.total + ' · ⭐ ' + q.score + '</span>' +
        '<div class="emoji-big">' + word.emoji + '</div>' +
        '<div class="prompt-sub">' + word.zh + ' · 听音拼出单词</div>' +
        '<button class="speak-btn" id="btnReplay">🔊 听单词</button>' +
        '<div class="big-word" id="spellBuilt" style="min-height:1.2em;letter-spacing:4px">_</div>' +
      '</div>' +
      '<div class="alpha-grid" id="spellLetters" style="max-width:360px;margin:0 auto"></div>' +
      '<div class="btn-row">' +
        '<button class="btn btn-ghost" id="btnClear">清除</button>' +
        '<button class="btn btn-green" id="btnCheck">检查 ✓</button>' +
      '</div>' +
      '<div class="feedback" id="feedback"></div>';

    $("btnReplay").onclick = function () { Sound.speakEn(word.en); };
    setTimeout(function () { Sound.speakEn(word.en); }, 300);

    var grid = $("spellLetters");
    letters.forEach(function (ch, i) {
      var b = document.createElement("button");
      b.className = "alpha-btn";
      b.textContent = ch;
      b.dataset.idx = i;
      b.onclick = function () {
        if (b.disabled) return;
        b.disabled = true;
        b.style.opacity = "0.35";
        q.built += ch;
        $("spellBuilt").textContent = q.built || "_";
        Sound.click();
      };
      grid.appendChild(b);
    });

    $("btnClear").onclick = function () {
      q.built = "";
      $("spellBuilt").textContent = "_";
      grid.querySelectorAll("button").forEach(function (b) {
        b.disabled = false;
        b.style.opacity = "1";
      });
    };
    $("btnCheck").onclick = function () {
      var fb = $("feedback");
      if (q.built === word.en) {
        q.score++;
        Sound.correct();
        Store.addStars(2);
        Store.bump("enDone");
        if (fb) { fb.className = "feedback ok"; fb.textContent = "Perfect! 🎉 " + word.en; }
        confetti();
        updateStats();
        setTimeout(function () { q.index++; nextSpell(); }, 900);
      } else {
        Sound.wrong();
        if (fb) { fb.className = "feedback bad"; fb.textContent = "再试试～ 正确是 " + word.en; }
        Sound.speakEn(word.en);
      }
    };
  }

  // 结束结算
  function finishQuiz(score, total, back, name) {
    Sound.complete();
    confetti();
    var stars = score >= total * 0.8 ? 3 : score >= total * 0.5 ? 2 : 1;
    Store.addStars(stars);
    updateStats();
    showModal(
      score === total ? "🏆" : "🌟",
      name + " 完成！",
      "答对 " + score + " / " + total + " 题，获得 " + stars + " 颗额外星星",
      function () { go(back); },
      function () {
        if (name === "看拼音认字") startCnQuiz("pinyin");
        else if (name === "听音选字") startCnQuiz("listen");
        else if (name === "听音选词") startEnQuiz("listen");
        else if (name === "看图选词") startEnQuiz("pic");
        else if (name === "拼单词") startSpell();
        else go(back);
      }
    );
  }

  function showModal(emoji, title, text, onHome, onAgain) {
    var old = document.querySelector(".overlay");
    if (old) old.remove();
    var ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML =
      '<div class="modal">' +
        '<div class="big">' + emoji + '</div>' +
        '<h3>' + title + '</h3>' +
        '<p>' + text + '</p>' +
        '<div class="btn-row">' +
          '<button class="btn btn-ghost" id="modalHome">返回</button>' +
          '<button class="btn btn-primary" id="modalAgain">再玩一次</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    $("modalHome").onclick = function () { ov.remove(); onHome && onHome(); };
    $("modalAgain").onclick = function () { ov.remove(); onAgain && onAgain(); };
  }

  // 我的
  function renderMe() {
    var d = Store.load();
    Sound.childVoice = d.childVoice !== false;
    panel().innerHTML = head("⭐ 我的成绩", "home") +
      '<div class="learn-stage">' +
        '<div class="emoji-big">🏅</div>' +
        '<div class="big-word" style="font-size:2rem">星星 ' + (d.stars || 0) + '</div>' +
        '<div class="sub-info">汉字练习 ' + (d.cnDone || 0) + ' 次 · 英语练习 ' + (d.enDone || 0) +
          ' 次 · 游戏 ' + (d.games || 0) + ' 次</div>' +
      '</div>' +
      '<div class="setting-row"><span>童声语调</span>' +
        '<button class="toggle' + (Sound.childVoice ? " on" : "") + '" id="togVoice"></button></div>' +
      '<div class="setting-row"><span>静音音效</span>' +
        '<button class="toggle' + (Sound.muted ? " on" : "") + '" id="togMute"></button></div>' +
      '<div class="btn-row" style="margin-top:20px">' +
        '<button class="btn btn-orange" id="btnReset">重置成绩</button>' +
        '<button class="btn btn-blue" id="btnTest">试听声音</button>' +
      '</div>' +
      '<p class="sub-info" style="text-align:center;margin-top:20px;line-height:1.6">' +
        '英语启蒙参考开源项目思路：<br>kids-english-learning（字母发音）、' +
        'Games to Learn English（听音/选词游戏）、主题词汇卡片式学习。<br>' +
        '汉字含看拼音认字、听音选字两大核心模式。' +
      '</p>';

    $("togVoice").onclick = function () {
      Sound.childVoice = !Sound.childVoice;
      var data = Store.load();
      data.childVoice = Sound.childVoice;
      Store.save(data);
      renderMe();
    };
    $("togMute").onclick = function () {
      Sound.muted = !Sound.muted;
      renderMe();
    };
    $("btnReset").onclick = function () {
      if (confirm("确定清空星星和练习次数吗？")) {
        Store.save({ stars: 0, cnDone: 0, enDone: 0, games: 0, childVoice: Sound.childVoice });
        updateStats();
        renderMe();
      }
    };
    $("btnTest").onclick = function () {
      Sound.correct();
      setTimeout(function () {
        Sound.speakZh("你好，我们一起认字吧");
        setTimeout(function () { Sound.speakEn("Hello, let's learn English"); }, 1600);
      }, 400);
    };
  }

  // 事件委托
  function bind() {
    document.body.addEventListener("click", function (e) {
      var goEl = e.target.closest("[data-go]");
      if (goEl) {
        // 清理 whack 定时器
        if (state.whack && state.whack.running) {
          state.whack.running = false;
          clearInterval(state.whack.timer);
          clearInterval(state.whack.spawnTimer);
        }
        go(goEl.dataset.go);
        return;
      }
      var gradeEl = e.target.closest("[data-grade]");
      if (gradeEl && state.page === "chinese") {
        state.grade = gradeEl.dataset.grade;
        Sound.click();
        renderChineseHub();
      }
    });

    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (state.whack && state.whack.running) {
          state.whack.running = false;
          clearInterval(state.whack.timer);
          clearInterval(state.whack.spawnTimer);
        }
        go(btn.dataset.page);
      });
    });
  }

  // 启动
  document.addEventListener("DOMContentLoaded", function () {
    var d = Store.load();
    Sound.childVoice = d.childVoice !== false;
    bind();
    updateStats();
    go("home");
    // 首次触摸解锁音频
    document.body.addEventListener("touchstart", function once() {
      Sound.init();
      document.body.removeEventListener("touchstart", once);
    }, { passive: true });
  });

  window.KidsApp = { go: go };
})();
