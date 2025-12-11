// 11ty-theme/config.js
import {
	IdAttributePlugin,
	InputPathToUrlTransformPlugin,
	HtmlBasePlugin,
} from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginNavigation from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { execSync } from "child_process";
import { DateTime } from "luxon";

/**
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} options
 */
export default function (eleventyConfig, options = {}) {
	// 1. PLUGINS
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 },
	});
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

	eleventyConfig.addPlugin(IdAttributePlugin);

	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		extensions: "html",
		formats: ["avif", "webp", "auto"],
		defaultAttributes: { loading: "lazy", decoding: "async" },
	});

	// Feed Plugin (Using options passed from the site config)
	if (options.feedMetadata) {
		eleventyConfig.addPlugin(feedPlugin, {
			outputPath: "/feed/feed.xml",
			stylesheet: "pretty-atom-feed.xsl",
			collection: { name: "posts", limit: 20 },
			metadata: options.feedMetadata,
		});
	}

	// 2. FILTERS
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(
			format || "dd LLLL yyyy",
		);
	});

	eleventyConfig.addFilter("htmlDateString", (dateObj) => {
		return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if (!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if (n < 0) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers);
	});

	// Return the keys used in an object
	eleventyConfig.addFilter("getKeys", (target) => {
		return Object.keys(target);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || [])
			.filter(
				(tag) => ["all", "posts", "sidebar", "tagPages"].indexOf(tag) === -1,
			)
			.sort();
	});

	eleventyConfig.addFilter(
		"postsWithMetadata",
		function (posts, metadataKey, metadataValue) {
			return posts
				.filter((post) => post.data[metadataKey] === metadataValue)
				.sort((a, b) => new Date(a.date) - new Date(b.date));
		},
	);

	// 3. SHORTCODES
	eleventyConfig.addShortcode("currentBuildDate", () =>
		new Date().toISOString(),
	);

	eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

	// 4. BUNDLES
	eleventyConfig.addBundle("css", { toFileDirectory: "dist" });
	eleventyConfig.addBundle("js", { toFileDirectory: "dist" });

	// 5. COLLECTIONS
	eleventyConfig.addCollection("tagPages", function (collectionApi) {
		const posts = collectionApi.getFilteredByTag("posts").reverse();
		const tagMap = new Map();
		const pageSize = 10;
		const tagPages = [];
		const slugify = eleventyConfig.getFilter("slugify");

		// Exclude utility tags
		const filterTagList = (tags) =>
			(tags || []).filter((tag) => ["all", "posts"].indexOf(tag) === -1);

		// Group posts by tag
		for (const post of posts) {
			const tags = filterTagList(post.data.tags);
			for (const tag of tags) {
				if (!tagMap.has(tag)) {
					tagMap.set(tag, []);
				}
				tagMap.get(tag).push(post);
			}
		}

		// Create paginated pages for each tag
		for (const [tag, posts] of tagMap.entries()) {
			const pageCount = Math.ceil(posts.length / pageSize);
			const tagSlug = slugify(tag);
			const pages = [];

			for (let i = 0; i < pageCount; i++) {
				const start = i * pageSize;
				const end = start + pageSize;
				pages.push({
					tagName: tag,
					pageNumber: i,
					totalPages: pageCount,
					posts: posts.slice(start, end),
				});
			}

			// Add pagination data to each page
			for (let i = 0; i < pageCount; i++) {
				const hrefs = [];
				for (let j = 0; j < pageCount; j++) {
					hrefs.push(
						j === 0 ? `/tags/${tagSlug}/` : `/tags/${tagSlug}/${j + 1}/`,
					);
				}

				pages[i].pagination = {
					hrefs: hrefs,
					href: {
						first: hrefs[0],
						last: hrefs[hrefs.length - 1],
					},
					pages: pages.map((p, j) => ({ url: hrefs[j] })),
					pageNumber: i,
					totalPages: pageCount,
				};
			}

			tagPages.push(...pages);
		}

		return tagPages;
	});

	// 6. EVENTS (Pagefind)
	eleventyConfig.on("eleventy.after", () => {
		execSync(`npx pagefind --site _site`, { encoding: "utf-8" });
	});
}
