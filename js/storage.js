// 本地进度
const Store = {
  key: "kids_learn_park_v1",

  load() {
    try {
      var raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { stars: 0, cnDone: 0, enDone: 0, games: 0, childVoice: true };
  },

  save(data) {
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch (e) {}
  },

  addStars(n) {
    var d = this.load();
    d.stars = (d.stars || 0) + (n || 1);
    this.save(d);
    return d.stars;
  },

  bump(field) {
    var d = this.load();
    d[field] = (d[field] || 0) + 1;
    this.save(d);
    return d;
  }
};
