// docs/sync-website.mjs — the documentation system: collect each
// submodule's docs/architecture.md + the depot map, and regenerate the
// ~/development/personal/website project pages (src/content/projects/)
// so the site stays in sync with the repos. Mermaid blocks become
// rendered imagery via mermaid.ink.
//
//   node docs/sync-website.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const depot = dirname(here); // system/
const website = join(depot, "..", "personal", "website", "src", "content", "projects");

const TODAY = new Date().toISOString().slice(0, 10);
const PROJECTS = [
    { slug: "depot",     title: "depot",     repo: "https://github.com/akinevz2/depot",       docs: join(depot, "docs/architecture.md"), readme: join(depot, "README.md"), gh: "akinevz2/depot" },
    { slug: "herbctl",   title: "herbctl",   repo: "https://github.com/akinevz2/herbctl",     docs: join(depot, "herbctl/docs/architecture.md"), readme: join(depot, "herbctl/README.md"), gh: "akinevz2/herbctl" },
    { slug: "herbstutil", title: "herbstutil", repo: "https://github.com/akinevz2/herbstutil", docs: join(depot, "herbstutil/docs/architecture.md"), readme: join(depot, "herbstutil/README.md"), gh: "akinevz2/herbstutil" },
    { slug: "polyframes", title: "polyframes", repo: "https://github.com/akinevz2/polyframes", docs: join(depot, "polyframes/docs/architecture.md"), readme: join(depot, "polyframes/README.md"), gh: "akinevz2/polyframes" },
    { slug: "polytags",  title: "polytags",  repo: "https://github.com/akinevz2/polytags",    docs: join(depot, "polytags/docs/architecture.md"), readme: join(depot, "polytags/README.md"), gh: "akinevz2/polytags" },
    { slug: "on-deploy", title: "on-deploy", repo: "https://github.com/akinevz2/on-deploy",   docs: join(depot, "on-deploy/docs/architecture.md"), readme: join(depot, "on-deploy/README.md"), gh: "akinevz2/on-deploy" },
];

const b64 = (s) => Buffer.from(s, "utf8").toString("base64url");

// the themed-gray composite: the diagram background AND the arrow-label
// backgrounds share the gray (the labels blend in), and themeCSS rounds
// the container + the node bodies (12px). The base theme (not dark) so
// the variables are the single source of the palette.
const GRAY = "#3a3a3a";
const RADIUS = "12px";
const mermaidImg = (code, heading) => {
    const cfg = {
        code,
        mermaid: {
            theme: "base",
            themeVariables: {
                background: GRAY,
                primaryColor: "#3d3d3d",
                primaryBorderColor: "#5a5a5a",
                primaryTextColor: "#e6e6e6",
                lineColor: "#9a9a9a",
                edgeLabelBackground: GRAY,
                clusterBkg: "#333333",
                clusterBorder: "#5a5a5a",
                fontSize: "14px",
            },
            themeCSS: `svg, #container { border-radius: ${RADIUS}; }`
                + ` .node rect, .node polygon { rx: 8px; ry: 8px; }`
                + ` .edgeLabel foreignObject div, .edgeLabel span.edgeLabel`
                + `, .labelBkg { background-color: ${GRAY}; }`,
        },
        backgroundColor: GRAY,
    };
    return `![${heading}](https://mermaid.ink/img/${b64(JSON.stringify(cfg))}?type=png)`;
};

function sectionsFromMarkdown(md) {
    // split on ## headings; a ```mermaid block becomes imagery, the
    // prose paragraphs become markdown content lines
    const sections = [];
    const parts = md.split(/^## /m).slice(1);
    for (const part of parts) {
        const [head, ...body] = part.split("\n");
        const text = body.join("\n");
        const content = [];
        const mm = text.match(/```mermaid\n([\s\S]*?)```/);
        if (mm) content.push(mermaidImg(mm[1], safeAlt(head.trim())));
        for (const para of text.replace(/```mermaid[\s\S]*?```/, "").split(/\n{2,}/)) {
            const p = para.trim();
            if (p) content.push(p);
        }
        sections.push({ heading: head.trim(), content, theme: "open" });
    }
    return sections;
}

const description = (md, readmePath) => {
    // the README's first prose PARAGRAPH is the project description —
    // consecutive non-heading lines joined (a wrapped tagline arrives
    // whole; the architecture md opens with a mermaid fence — never a
    // description)
    if (existsSync(readmePath)) {
        const para = [];
        for (const l of readFileSync(readmePath, "utf8").split("\n").slice(1)) {
            const t = l.trim().replaceAll("`", "");
            if (!t) { if (para.length > 0) break; continue; }
            if (t.startsWith("#")) continue;
            para.push(t);
            if (para.length >= 3) break;
        }
        if (para.length > 0) return para.join(" ");
    }
    for (const l of md.split("\n")) {
        const t = l.trim();
        if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("![")) continue;
        return t;
    }
    return "the architecture, structurally and logically";
};

/** the image alt: word-safe (the renderer breaks on colons/brackets) */
const safeAlt = (heading) => heading.replace(/[^A-Za-z0-9 ]/g, "").trim();

for (const p of PROJECTS) {
    if (!existsSync(p.docs)) {
        console.log(`sync: ${p.slug} — no docs/architecture.md, skipped`);
        continue;
    }
    const md = readFileSync(p.docs, "utf8");
    const json = {
        slug: p.slug,
        title: p.title,
        description: description(md, p.readme),
        github: p.repo,
        lastModified: TODAY,
        content: {
            heading: `${p.title} — the architecture`,
            content: sectionsFromMarkdown(md),
            theme: "open",
        },
    };
    const out = join(website, `${p.slug}.json`);
    // CURATED PAGES ARE NEVER REGENERATED: a page marked "curated": true
    // is maintained by hand — the sync skips it (the architecture
    // imagery was merged in once, at curation time).
    if (existsSync(out) && JSON.parse(readFileSync(out, "utf8")).curated) {
        console.log(`sync: ${p.slug} — curated, skipped`);
        continue;
    }
    writeFileSync(out, JSON.stringify(json, null, 2) + "\n");
    console.log(`sync: ${out}`);
}
