import type { MessageItem } from "./types";

export const MOCK_MESSAGES: MessageItem[] = [
  {
    id: "msg-comment-1",
    tab: "comment",
    title: "有人评论了你的帖子",
    content: "小厨房：这个还能刀吗？今晚方便面交吗",
    time: "10 分钟前",
    avatarLabel: "小",
    hasThumbnail: true,
  },
  {
    id: "msg-comment-2",
    tab: "comment",
    title: "有人评论了你的帖子",
    content: "吃货阿琳：位置发一下，我也想去",
    time: "2 小时前",
    avatarLabel: "吃",
    hasThumbnail: true,
  },
  {
    id: "msg-reply-1",
    tab: "reply",
    title: "有人回复了你",
    content: "弘大学姐 回复了你：同感，找房真的要看运气",
    time: "1 小时前",
    avatarLabel: "弘",
    hasThumbnail: false,
  },
  {
    id: "msg-like-1",
    tab: "like",
    title: "有人点赞了你的帖子",
    content: "北方胃 赞了你的帖子「新村饺子馆这盘水饺实拍」",
    time: "昨天",
    avatarLabel: "北",
    hasThumbnail: true,
  },
  {
    id: "msg-like-2",
    tab: "like",
    title: "有人点赞了你的帖子",
    content: "跑步搭子 赞了你的帖子「夜跑团招募新成员」",
    time: "2 天前",
    avatarLabel: "跑",
    hasThumbnail: true,
  },
  {
    id: "msg-system-1",
    tab: "system",
    title: "系统通知",
    content: "欢迎使用 58korea，发现韩国华人生活内容",
    time: "3 天前",
    avatarLabel: "58",
    hasThumbnail: false,
  },
];

export function getMockMessagesByTab(tab: MessageItem["tab"]): MessageItem[] {
  return MOCK_MESSAGES.filter((item) => item.tab === tab);
}
