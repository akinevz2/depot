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
    { slug: "depot",     title: "depot",     repo: "https://github.com/akinevz2/depot",       docs: join(depot, "docs/architecture.md"), gh: "akinevz2/depot" },
    { slug: "herbctl",   title: "herbctl",   repo: "https://github.com/akinevz2/herbctl",     docs: join(depot, "herbctl/docs/architecture.md"), gh: "akinevz2/herbctl" },
    { slug: "herbstutil", title: "herbstutil", repo: "https://github.com/akinevz2/herbstutil", docs: join(depot, "herbstutil/docs/architecture.md"), gh: "akinevz2/herbstutil" },
    { slug: "polyframes", title: "polyframes", repo: "https://github.com/akinevz2/polyframes", docs: join(depot, "polyframes/docs/architecture.md"), gh: "akinevz2/polyframes" },
    { slug: "polytags",  title: "polytags",  repo: "https://github.com/akinevz2/polytags",    docs: join(depot, "polytags/docs/architecture.md"), gh: "akinevz2/polytags" },
    { slug: "on-deploy", title: "on-deploy", repo: "https://github.com/akinevz2/on-deploy",   docs: join(depot, "on-deploy/docs/architecture.md"), gh: "akinevz2/on-deploy" },
];

const b64 = (s) => Buffer.from(s, "utf8").toString("base64url");
const mermaidImg = (code, heading) =>
    `![${heading}](https://mermaid.ink/img/${b64(code)}?type=svg)`;

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
        if (mm) content.push(mermaidImg(mm[1], head.trim()));
        for (const para of text.replace(/```mermaid[\s\S]*?```/, "").split(/\n{2,}/)) {
            const p = para.trim();
            if (p) content.push(p);
        }
        sections.push({ heading: head.trim(), content, theme: "open" });
    }
    return sections;
}

const description = (md) =>
    (md.split("\n").find((l) => l.trim() && !l.startsWith("#")) ?? "").trim();

for (const p of PROJECTS) {
    if (!existsSync(p.docs)) {
        console.log(`sync: ${p.slug} — no docs/architecture.md, skipped`);
        continue;
    }
    const md = readFileSync(p.docs, "utf8");
    const json = {
        slug: p.slug,
        title: p.title,
        description: description(md),
        github: p.repo,
        lastModified: TODAY,
        content: {
            heading: `${p.title} — the architecture`,
            content: sectionsFromMarkdown(md),
            theme: "open",
        },
    };
    const out = join(website, `${p.slug}.json`);
    writeFileSync(out, JSON.stringify(json, null, 2) + "\n");
    console.log(`sync: ${out}`);
}
