import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "RATING3PRO Blog",
	subtitle: "",
	lang: "zh_cn", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	mirrors: {
		enable: true,
		sites: [
			{
				name: "主站Vercel",
				url: "https://xie.today",
			},
			{
				name: "镜像站Edgeone",
				url: "https://eocdnblog.xie.today",
			},
			{
				name: "镜像站Cloudflare",
				url: "https://cfcdnblog.xie.today",
			},
			{
				name: "镜像站Vercel",
				url: "https://vlcdnblog.xie.today",
			},
			{
				name: "镜像站Netlify",
				url: "https://nlcdnblog.xie.today",
			},
		],
	},
	favicon: [
		{
			src: "/favicon/rt3box-favicon.jpg",
			sizes: "32x32",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		LinkPreset.Donation,
		{
			name: "友链",
			url: "/friends/",
			external: false,
		},
		{
			name: "状态页",
			url: "https://stats.uptimerobot.com/AcTZsUozQm",
			external: true,
		},
		{
			name: "探针",
			url: "https://komari.xie.today",
			external: true,
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "RATING3PRO",
	bio: "",
	links: [
		{
			name: "Twitter",
			icon: "fa6-brands:twitter", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://x.com/rating3pro",
		},
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://steamcommunity.com/id/rating3pro/",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/RATING3PRO",
		},
		{
			name: "Telegram",
			icon: "fa6-brands:telegram",
			url: "https://t.me/Exeluck",
		},
		{
			name: "QQ",
			icon: "fa6-brands:qq",
			url: "https://qm.qq.com/q/JSR8FO5fwI",
		},
		{
			name: "WeChat",
			icon: "fa6-brands:weixin",
			url: "https://u.wechat.com/EMGUyhWS2pITJyJoQMsj-9A?s=2",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export const giscusConfig = {
	enable: true,
	repo: "RATING3PRO/blog-comments", // 替换为你的GitHub仓库
	repoId: "R_kgDOPnR_3g", // 替换为你的仓库ID
	category: "Announcements", // 替换为你的讨论分类
	categoryId: "DIC_kwDOPnR_3s4Cuy-v", // 替换为你的分类ID
	mapping: "pathname", // 使用页面路径作为映射
	strict: "0",
	reactionsEnabled: "1",
	emitMetadata: "0",
	inputPosition: "top",
	theme: "preferred_color_scheme", // 使用首选颜色方案
	lang: "zh-CN", // 设置语言为中文
};
