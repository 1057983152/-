// 英语启蒙数据
// 设计参考开源项目思路：
// - puppe1990/kids-english-learning：字母/数字点选发音
// - Games to Learn English：听音选词、看图选词、配对
// - Edversity / 儿童英语单词游戏：主题词汇 + 互动小游戏

const ENGLISH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function (L) {
  return {
    upper: L,
    lower: L.toLowerCase(),
    sound: L.toLowerCase(),
    example: {
      A: "Apple 苹果", B: "Ball 球", C: "Cat 猫", D: "Dog 狗",
      E: "Egg 鸡蛋", F: "Fish 鱼", G: "Girl 女孩", H: "Hat 帽子",
      I: "Ice 冰", J: "Juice 果汁", K: "Kite 风筝", L: "Lion 狮子",
      M: "Moon 月亮", N: "Nose 鼻子", O: "Orange 橙子", P: "Pig 猪",
      Q: "Queen 女王", R: "Rabbit 兔子", S: "Sun 太阳", T: "Tree 树",
      U: "Umbrella 伞", V: "Violin 小提琴", W: "Water 水", X: "Box 盒子",
      Y: "Yellow 黄色", Z: "Zoo 动物园"
    }[L]
  };
});

const ENGLISH_NUMBERS = [
  { n: 1, en: "one", zh: "一", emoji: "1️⃣" },
  { n: 2, en: "two", zh: "二", emoji: "2️⃣" },
  { n: 3, en: "three", zh: "三", emoji: "3️⃣" },
  { n: 4, en: "four", zh: "四", emoji: "4️⃣" },
  { n: 5, en: "five", zh: "五", emoji: "5️⃣" },
  { n: 6, en: "six", zh: "六", emoji: "6️⃣" },
  { n: 7, en: "seven", zh: "七", emoji: "7️⃣" },
  { n: 8, en: "eight", zh: "八", emoji: "8️⃣" },
  { n: 9, en: "nine", zh: "九", emoji: "9️⃣" },
  { n: 10, en: "ten", zh: "十", emoji: "🔟" }
];

const ENGLISH_THEMES = {
  "动物 Animals": [
    { en: "cat", zh: "猫", emoji: "🐱" },
    { en: "dog", zh: "狗", emoji: "🐶" },
    { en: "bird", zh: "鸟", emoji: "🐦" },
    { en: "fish", zh: "鱼", emoji: "🐟" },
    { en: "rabbit", zh: "兔子", emoji: "🐰" },
    { en: "lion", zh: "狮子", emoji: "🦁" },
    { en: "tiger", zh: "老虎", emoji: "🐯" },
    { en: "bear", zh: "熊", emoji: "🐻" },
    { en: "monkey", zh: "猴子", emoji: "🐵" },
    { en: "panda", zh: "熊猫", emoji: "🐼" },
    { en: "elephant", zh: "大象", emoji: "🐘" },
    { en: "duck", zh: "鸭子", emoji: "🦆" }
  ],
  "颜色 Colors": [
    { en: "red", zh: "红色", emoji: "🔴" },
    { en: "blue", zh: "蓝色", emoji: "🔵" },
    { en: "green", zh: "绿色", emoji: "🟢" },
    { en: "yellow", zh: "黄色", emoji: "🟡" },
    { en: "orange", zh: "橙色", emoji: "🟠" },
    { en: "purple", zh: "紫色", emoji: "🟣" },
    { en: "pink", zh: "粉色", emoji: "💗" },
    { en: "black", zh: "黑色", emoji: "⚫" },
    { en: "white", zh: "白色", emoji: "⚪" },
    { en: "brown", zh: "棕色", emoji: "🟤" }
  ],
  "水果 Food": [
    { en: "apple", zh: "苹果", emoji: "🍎" },
    { en: "banana", zh: "香蕉", emoji: "🍌" },
    { en: "orange", zh: "橙子", emoji: "🍊" },
    { en: "grape", zh: "葡萄", emoji: "🍇" },
    { en: "watermelon", zh: "西瓜", emoji: "🍉" },
    { en: "strawberry", zh: "草莓", emoji: "🍓" },
    { en: "peach", zh: "桃子", emoji: "🍑" },
    { en: "pear", zh: "梨", emoji: "🍐" },
    { en: "milk", zh: "牛奶", emoji: "🥛" },
    { en: "bread", zh: "面包", emoji: "🍞" },
    { en: "egg", zh: "鸡蛋", emoji: "🥚" },
    { en: "cake", zh: "蛋糕", emoji: "🎂" }
  ],
  "身体 Body": [
    { en: "head", zh: "头", emoji: "🗣️" },
    { en: "eye", zh: "眼睛", emoji: "👁️" },
    { en: "ear", zh: "耳朵", emoji: "👂" },
    { en: "nose", zh: "鼻子", emoji: "👃" },
    { en: "mouth", zh: "嘴巴", emoji: "👄" },
    { en: "hand", zh: "手", emoji: "✋" },
    { en: "foot", zh: "脚", emoji: "🦶" },
    { en: "leg", zh: "腿", emoji: "🦵" },
    { en: "arm", zh: "胳膊", emoji: "💪" },
    { en: "hair", zh: "头发", emoji: "💇" }
  ],
  "家庭 Family": [
    { en: "mom", zh: "妈妈", emoji: "👩" },
    { en: "dad", zh: "爸爸", emoji: "👨" },
    { en: "baby", zh: "宝宝", emoji: "👶" },
    { en: "brother", zh: "哥哥/弟弟", emoji: "👦" },
    { en: "sister", zh: "姐姐/妹妹", emoji: "👧" },
    { en: "grandma", zh: "奶奶", emoji: "👵" },
    { en: "grandpa", zh: "爷爷", emoji: "👴" },
    { en: "family", zh: "家庭", emoji: "👨‍👩‍👧‍👦" },
    { en: "home", zh: "家", emoji: "🏠" },
    { en: "friend", zh: "朋友", emoji: "🤝" }
  ],
  "学校 School": [
    { en: "book", zh: "书", emoji: "📖" },
    { en: "pen", zh: "笔", emoji: "🖊️" },
    { en: "bag", zh: "书包", emoji: "🎒" },
    { en: "school", zh: "学校", emoji: "🏫" },
    { en: "teacher", zh: "老师", emoji: "👩‍🏫" },
    { en: "student", zh: "学生", emoji: "🧑‍🎓" },
    { en: "desk", zh: "课桌", emoji: "🪑" },
    { en: "chair", zh: "椅子", emoji: "💺" },
    { en: "ruler", zh: "尺子", emoji: "📏" },
    { en: "eraser", zh: "橡皮", emoji: "🩹" }
  ],
  "自然 Nature": [
    { en: "sun", zh: "太阳", emoji: "☀️" },
    { en: "moon", zh: "月亮", emoji: "🌙" },
    { en: "star", zh: "星星", emoji: "⭐" },
    { en: "sky", zh: "天空", emoji: "🌤️" },
    { en: "rain", zh: "雨", emoji: "🌧️" },
    { en: "snow", zh: "雪", emoji: "❄️" },
    { en: "tree", zh: "树", emoji: "🌳" },
    { en: "flower", zh: "花", emoji: "🌸" },
    { en: "water", zh: "水", emoji: "💧" },
    { en: "fire", zh: "火", emoji: "🔥" }
  ]
};

function getEnglishThemes() {
  return Object.keys(ENGLISH_THEMES);
}

function getEnglishWords(theme) {
  if (theme && ENGLISH_THEMES[theme]) return ENGLISH_THEMES[theme].slice();
  return getEnglishThemes().reduce(function (acc, t) {
    return acc.concat(ENGLISH_THEMES[t]);
  }, []);
}
