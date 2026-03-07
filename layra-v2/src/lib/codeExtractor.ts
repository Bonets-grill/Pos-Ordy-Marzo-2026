// Extract code blocks from Claude's response
// Supports: ```tsx, ```html, ```typescript, ```sql, etc.

export interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

/**
 * Extract all fenced code blocks from markdown text.
 * Handles ```lang filename\n...\n``` patterns.
 */
export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "text",
      filename: match[2]?.trim(),
      content: match[3].trim(),
    });
  }

  return blocks;
}

/**
 * Extract the first HTML block, or generate one from TSX.
 */
export function extractHtmlPreview(text: string): string | null {
  const blocks = extractCodeBlocks(text);

  // First try: explicit HTML block
  const htmlBlock = blocks.find(
    (b) => b.language === "html" || b.filename?.endsWith(".html")
  );
  if (htmlBlock) return htmlBlock.content;

  // Second try: unclosed/truncated HTML block (streaming or cut off)
  const unclosedHtml = text.match(/```html\n([\s\S]*?)$/);
  if (unclosedHtml) {
    let html = unclosedHtml[1];
    // Auto-close if it has a doctype or html tag but no closing
    if (html.includes("<!DOCTYPE") || html.includes("<html")) {
      if (!html.includes("</html>")) html += "\n</body></html>";
      return html;
    }
  }

  // Third try: generate HTML wrapper from TSX
  const tsxBlock = blocks.find(
    (b) =>
      b.language === "tsx" ||
      b.language === "jsx" ||
      b.filename?.endsWith(".tsx")
  );
  if (tsxBlock) {
    return generateHtmlFromTsx(tsxBlock.content);
  }

  return null;
}

/**
 * Merge HTML from multiple assistant messages into one complete page.
 * - First message with <!DOCTYPE html> is the base
 * - Subsequent messages may have <section> blocks or partial HTML to merge
 * - Also handles continue messages that have full HTML (picks the longest)
 */
export function mergeHtmlFromMessages(messages: { role: string; content: string }[]): string | null {
  const assistants = messages.filter((m) => m.role === "assistant" && m.content.length > 100);
  if (assistants.length === 0) return null;

  // Collect ALL html blocks from ALL messages
  const allHtmlBlocks: { html: string; isBase: boolean; index: number }[] = [];

  for (let i = 0; i < assistants.length; i++) {
    const msg = assistants[i];
    const blocks = extractCodeBlocks(msg.content);
    const htmlBlocks = blocks.filter(
      (b) => b.language === "html" || b.filename?.endsWith(".html")
    );

    for (const block of htmlBlocks) {
      const isBase = block.content.includes("<!DOCTYPE") || block.content.includes("<html");
      allHtmlBlocks.push({ html: block.content, isBase, index: i });
    }

    // Also check for unclosed HTML blocks (streaming)
    if (htmlBlocks.length === 0) {
      const unclosed = msg.content.match(/```html\n([\s\S]*?)$/);
      if (unclosed) {
        let html = unclosed[1];
        const isBase = html.includes("<!DOCTYPE") || html.includes("<html");
        if (isBase && !html.includes("</html>")) {
          html += "\n</body></html>";
        }
        if (html.length > 200) {
          allHtmlBlocks.push({ html, isBase, index: i });
        }
      }
    }
  }

  if (allHtmlBlocks.length === 0) return null;

  // Find the best base HTML (longest one with <!DOCTYPE)
  const bases = allHtmlBlocks.filter((b) => b.isBase);
  if (bases.length === 0) {
    // No base found — just return the longest block
    return allHtmlBlocks.sort((a, b) => b.html.length - a.html.length)[0].html;
  }

  // Start with the longest base
  let baseHtml = bases.sort((a, b) => b.html.length - a.html.length)[0];

  // Collect section blocks from OTHER messages (not the base message)
  const sectionFragments: string[] = [];
  for (const block of allHtmlBlocks) {
    if (block.index === baseHtml.index) continue; // Skip the base message itself
    if (block.isBase) {
      // Another full HTML — if it's longer, use it as base instead
      if (block.html.length > baseHtml.html.length) {
        baseHtml = block;
        continue;
      }
    }
    // Extract <section> blocks from non-base messages
    const sections = extractSections(block.html);
    sectionFragments.push(...sections);
  }

  // Also extract raw section blocks from non-code-block text in continue messages
  for (let i = 0; i < assistants.length; i++) {
    if (i === baseHtml.index) continue;
    const msg = assistants[i];
    // Look for section blocks outside of code fences
    const rawSections = extractSections(msg.content);
    for (const sec of rawSections) {
      // Only add if it has module markers and isn't already in our list
      if (sec.includes('class="module-panel') || sec.includes("module-section") || sec.includes("MODULE:")) {
        if (!sectionFragments.some((f) => f.includes(sec.slice(0, 100)))) {
          sectionFragments.push(sec);
        }
      }
    }
  }

  if (sectionFragments.length === 0) {
    return baseHtml.html;
  }

  // Merge: inject section fragments before </main> or </body>
  let merged = baseHtml.html;
  const joinedSections = "\n" + sectionFragments.join("\n") + "\n";

  // Try inserting before </main>
  if (merged.includes("</main>")) {
    merged = merged.replace("</main>", joinedSections + "</main>");
  } else if (merged.includes("</body>")) {
    // Insert before the last </body>
    const lastBody = merged.lastIndexOf("</body>");
    merged = merged.slice(0, lastBody) + joinedSections + merged.slice(lastBody);
  }

  return merged;
}

/**
 * Extract <section ...>...</section> blocks from HTML text.
 */
function extractSections(html: string): string[] {
  const sections: string[] = [];
  const regex = /<section\s[^>]*>[\s\S]*?<\/section>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    sections.push(match[0]);
  }
  return sections;
}

/**
 * Generate a standalone HTML page that renders TSX via Babel Standalone + React CDN.
 */
function generateHtmlFromTsx(tsx: string): string {
  // Escape backticks and ${} in the TSX for template literal embedding
  const escapedTsx = tsx
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    // Stubs for common imports
    const Link = ({to, children, ...props}) => <a href={to} {...props}>{children}</a>;
    const Badge = ({children, className=""}) => <span className={"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " + className}>{children}</span>;
    const Button = ({children, className="", variant, size, ...props}) => <button className={"inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 " + className} {...props}>{children}</button>;

    ${escapedTsx}

    // Try to find and render the default export or first component
    const components = [typeof App !== 'undefined' && App, typeof Page !== 'undefined' && Page, typeof Dashboard !== 'undefined' && Dashboard, typeof Main !== 'undefined' && Main].filter(Boolean);
    if (components.length > 0) {
      const Root = components[0];
      ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
    }
  </script>
</body>
</html>`;
}

/**
 * Build Sandpack files map from extracted code blocks.
 */
export function buildSandpackFiles(
  text: string
): Record<string, string> {
  const blocks = extractCodeBlocks(text);
  const files: Record<string, string> = {};

  for (const block of blocks) {
    if (block.language === "sql" || block.language === "text") continue;

    let filename = block.filename;
    if (!filename) {
      const ext =
        block.language === "tsx"
          ? ".tsx"
          : block.language === "jsx"
          ? ".jsx"
          : block.language === "typescript" || block.language === "ts"
          ? ".ts"
          : block.language === "css"
          ? ".css"
          : block.language === "json"
          ? ".json"
          : `.${block.language}`;
      filename = `/App${ext}`;
    }

    // Ensure leading slash
    if (!filename.startsWith("/")) filename = `/${filename}`;

    files[filename] = block.content;
  }

  // Ensure there's an App.tsx entry point
  if (!files["/App.tsx"] && !files["/App.jsx"]) {
    const first = Object.entries(files).find(
      ([k]) => k.endsWith(".tsx") || k.endsWith(".jsx")
    );
    if (first) {
      files["/App.tsx"] = first[1];
    }
  }

  return files;
}
