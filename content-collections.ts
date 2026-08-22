// The MDX pipeline for a blog that does not exist yet.
//
// STATUS, stated plainly because a config that looks live and is not is worse than
// no config: there is no content/ directory, no /blog route and no posts. This
// compiles an empty collection on every build. It stays wired only because
// next.config.mjs wraps the whole Next config in withContentCollections, so
// deleting this file breaks the build until that wrapper goes too. See the
// follow-up note in the handover: removing the blog is a three-file edit
// (this file, next.config.mjs, tsconfig.json's "content-collections" path alias)
// plus five dependencies.
//
// remarkCodeMeta used to run here. It was a hand-written recursive tree walk that
// copied a code fence's meta string onto hProperties, typed `any` throughout so
// tsc proved nothing about it, and its only consumer was this transform. It has
// been deleted. If that walk is ever wanted back, unist-util-visit is already
// installed transitively and does it in one call.

import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import remarkGfm from "remark-gfm";
import { z } from "zod";

const posts = defineCollection({
    name: "posts",
    directory: "content",
    include: "**/*.mdx",
    schema: z.object({
        title: z.string(),
        publishedAt: z.string(),
        updatedAt: z.string().optional(),
        author: z.string().optional(),
        summary: z.string(),
        image: z.string().optional(),
        content: z.string(),
    }),
    transform: async (document, context) => {
        const mdx = await compileMDX(context, document, {
            remarkPlugins: [remarkGfm],
        });
        return {
        ...document,
            mdx,
        };
    },
});

export default defineConfig({
    collections: [posts],
});
