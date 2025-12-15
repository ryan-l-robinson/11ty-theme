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
import lodash from 'lodash';

/**
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} options
 */
export default function (eleventyConfig, options = {}) {
	// Passthrough for the sitemap stylesheet
	eleventyConfig.addPassthroughCopy({ "11ty-theme/xsl/sitemap.xsl": "/sitemap.xsl" });

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
				(tag) => ["all", "posts", "sidebar", "tagPages", "postsByYear", "postsByYear.pages", "tagPages.pages"].indexOf(tag) === -1,
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

	eleventyConfig.addFilter("slugify", (str) => {
		if (!str) {
			return;
		}
		return lodash.kebabCase(str.toLowerCase());
	});

	// 3. SHORTCODES
	eleventyConfig.addShortcode("currentBuildDate", () =>
		new Date().toISOString(),
	);

	eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

	// 4. BUNDLES
	eleventyConfig.addBundle("css", { toFileDirectory: "dist" });
	eleventyConfig.addBundle("js", { toFileDirectory: "dist" });

	// 5. COLLECTIONS
	function createPagedCollection(collectionApi, { grouperFn, pageSize, keySort = 'asc', permalink }) {
		let postsByKey = {};
		collectionApi.getFilteredByTag("posts").forEach(post => {
			const keys = grouperFn(post);
			(Array.isArray(keys) ? keys : [keys]).forEach(key => {
				if (key === undefined || key === null) return;
				const keyString = String(key);
				if(!postsByKey[keyString]) {
					postsByKey[keyString] = [];
				}
				postsByKey[keyString].push(post);
			});
		});

		let postsByKeyPaged = [];
		let sortedKeys = Object.keys(postsByKey).sort();

		if (keySort === 'desc') {
			sortedKeys.reverse();
		}

		for(let key of sortedKeys) {
			postsByKey[key].sort((a, b) => b.date - a.date);

			let totalPages = Math.ceil(postsByKey[key].length / pageSize);
			let hrefs = [];
			if(permalink) {
				for(let i = 1; i <= totalPages; i++) {
					hrefs.push(permalink(key, i));
				}
			}

			lodash.chunk(postsByKey[key], pageSize).forEach((posts, index) => {
				postsByKeyPaged.push({
					key: key,
					posts: posts,
					pageNumber: index,
					hrefs: hrefs,
					pages: new Array(totalPages)
				});
			});
		}

		const keys = {};
		Object.keys(postsByKey).forEach(key => {
			keys[key] = postsByKey[key].length;
		});

		return {
			pages: postsByKeyPaged,
			keys: keys
		};
	}

	eleventyConfig.addCollection("tagPages", function (collectionApi) {
		const filterTagList = (tags) =>
		  (tags || []).filter((tag) => ["all", "posts"].indexOf(tag) === -1);

		return createPagedCollection(collectionApi, {
			grouperFn: (post) => filterTagList(post.data.tags),
			pageSize: 10,
			keySort: 'asc',
			permalink: (key, pageNumber) => {
				const keySlug = eleventyConfig.getFilter("slugify")(key);
				if (pageNumber === 1) {
					return `/tags/${keySlug}/`;
				}
				return `/tags/${keySlug}/${pageNumber}/`;
			}
		});
	});

	eleventyConfig.addCollection("postsByYear", collectionApi => {
		return createPagedCollection(collectionApi, {
			grouperFn: (post) => post.date.getFullYear(),
			pageSize: 20,
			keySort: 'desc',
			permalink: (key, pageNumber) => {
				if (pageNumber === 1) {
					return `/${key}/`;
				}
				return `/${key}/${pageNumber}/`;
			}
		});
	});

	// 6. EVENTS (Pagefind)
	eleventyConfig.on("eleventy.after", () => {
		execSync(`npx pagefind --site _site`, { encoding: "utf-8" });
	});
}
