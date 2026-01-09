/**
 * Utility functions for Giscus comments system
 */
import { giscusConfig } from "../config";

export function setGiscusTheme(theme: string) {
	const iframe = document.querySelector(
		"iframe.giscus-frame",
	) as HTMLIFrameElement;
	if (!iframe) return;
	const message = {
		setConfig: {
			theme: theme,
		},
	};
	iframe.contentWindow?.postMessage({ giscus: message }, "https://giscus.app");
}

export function loadGiscus() {
	// 如果Giscus未启用，则不加载
	if (!giscusConfig.enable) {
		return;
	}

	// 检查是否已经加载过Giscus
	if (document.querySelector(".giscus-frame")) {
		return;
	}

	const currentTheme = localStorage.getItem("theme");
	let theme = giscusConfig.theme;
	if (currentTheme === "light") {
		theme = "light";
	} else if (currentTheme === "dark") {
		theme = "dark";
	}

	// 创建Giscus脚本
	const script = document.createElement("script");
	script.src = "https://giscus.app/client.js";
	script.setAttribute("data-repo", giscusConfig.repo);
	script.setAttribute("data-repo-id", giscusConfig.repoId);
	script.setAttribute("data-category", giscusConfig.category);
	script.setAttribute("data-category-id", giscusConfig.categoryId);
	script.setAttribute("data-mapping", giscusConfig.mapping);
	script.setAttribute("data-strict", giscusConfig.strict);
	script.setAttribute("data-reactions-enabled", giscusConfig.reactionsEnabled);
	script.setAttribute("data-emit-metadata", giscusConfig.emitMetadata);
	script.setAttribute("data-input-position", giscusConfig.inputPosition);
	script.setAttribute("data-theme", theme);
	script.setAttribute("data-lang", giscusConfig.lang);
	script.setAttribute("data-loading", "lazy");
	script.setAttribute("crossorigin", "anonymous");
	script.async = true;

	// 将脚本添加到页面
	const giscusContainer = document.querySelector(".giscus");
	if (giscusContainer) {
		giscusContainer.appendChild(script);
	}
}
