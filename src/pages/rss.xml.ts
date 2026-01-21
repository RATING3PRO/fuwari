import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();
	const container = await AstroContainer.create();

	const items = await Promise.all(
		blog.map(async (post) => {
			const { Content } = await post.render();
			const rawHtml = await container.renderToString(Content);
			const siteUrl = context.site?.toString().replace(/\/$/, "") ?? "";

			// Replace relative links with absolute links
			const html = rawHtml
				.replace(/src="\/([^"]*)"/g, `src="${siteUrl}/$1"`)
				.replace(/href="\/([^"]*)"/g, `href="${siteUrl}/$1"`);

			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: url(`/posts/${post.slug}/`),
				content: sanitizeHtml(html, {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
					allowedAttributes: {
						...sanitizeHtml.defaults.allowedAttributes,
						img: ["src", "alt", "title", "width", "height"],
					},
				}),
			};
		}),
	);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://fuwari.vercel.app",
		items: items,
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
