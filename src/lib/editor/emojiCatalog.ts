/**
 * 命令面板用精简 Emoji 表（非完整 Unicode 集）。
 * label：英文名；keywords：检索词（中英）。
 */
export interface EmojiEntry {
  char: string;
  id: string;
  label: string;
  keywords: string;
}

export const EMOJI_CATALOG: readonly EmojiEntry[] = [
  { char: "😀", id: "grinning", label: "Grinning", keywords: "smile happy 笑 开心" },
  { char: "😂", id: "joy", label: "Joy", keywords: "laugh lol 笑哭" },
  { char: "😊", id: "blush", label: "Smile", keywords: "blush 微笑" },
  { char: "😍", id: "heart-eyes", label: "Heart eyes", keywords: "love 喜欢 爱" },
  { char: "🤔", id: "thinking", label: "Thinking", keywords: "think hmm 思考" },
  { char: "😎", id: "sunglasses", label: "Cool", keywords: "cool sunglasses 酷" },
  { char: "😢", id: "cry", label: "Cry", keywords: "sad tear 哭" },
  { char: "😡", id: "angry", label: "Angry", keywords: "mad angry 生气" },
  { char: "👍", id: "thumbsup", label: "Thumbs up", keywords: "ok yes 赞 好" },
  { char: "👎", id: "thumbsdown", label: "Thumbs down", keywords: "no bad 踩" },
  { char: "👏", id: "clap", label: "Clap", keywords: "applause 鼓掌" },
  { char: "🙏", id: "pray", label: "Folded hands", keywords: "please thanks 拜托 谢谢" },
  { char: "🔥", id: "fire", label: "Fire", keywords: "hot fire 火 热" },
  { char: "✨", id: "sparkles", label: "Sparkles", keywords: "sparkle magic 闪" },
  { char: "⭐", id: "star", label: "Star", keywords: "star 星" },
  { char: "💡", id: "bulb", label: "Idea", keywords: "idea light 想法 灯" },
  { char: "✅", id: "check", label: "Check", keywords: "done ok 完成 对" },
  { char: "❌", id: "x", label: "Cross", keywords: "no wrong 错 叉" },
  { char: "⚠️", id: "warning", label: "Warning", keywords: "warn caution 警告" },
  { char: "❗", id: "exclaim", label: "Exclamation", keywords: "important 重要" },
  { char: "❓", id: "question", label: "Question", keywords: "ask 问" },
  { char: "📝", id: "memo", label: "Memo", keywords: "note write 笔记" },
  { char: "📌", id: "pin", label: "Pin", keywords: "pin 图钉" },
  { char: "🔗", id: "link", label: "Link", keywords: "url link 链接" },
  { char: "📅", id: "calendar", label: "Calendar", keywords: "date 日历 日期" },
  { char: "⏰", id: "alarm", label: "Alarm", keywords: "time clock 时间" },
  { char: "🎉", id: "tada", label: "Party", keywords: "party celebrate 庆祝" },
  { char: "🚀", id: "rocket", label: "Rocket", keywords: "ship launch 火箭" },
  { char: "💻", id: "laptop", label: "Laptop", keywords: "code computer 电脑" },
  { char: "📦", id: "package", label: "Package", keywords: "box npm 包" },
  { char: "🐛", id: "bug", label: "Bug", keywords: "bug fix 缺陷" },
  { char: "🔧", id: "wrench", label: "Wrench", keywords: "tool fix 工具" },
  { char: "❤️", id: "heart", label: "Heart", keywords: "love heart 心" },
  { char: "💯", id: "hundred", label: "Hundred", keywords: "100 perfect 满分" },
  { char: "🌙", id: "moon", label: "Moon", keywords: "night moon 月 夜" },
  { char: "☀️", id: "sun", label: "Sun", keywords: "day sun 日 太阳" },
];
