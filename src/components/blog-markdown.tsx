import type { ReactNode } from "react";

function safeHref(value: string) {
  const href = value.trim();
  if (!href || href.startsWith("//")) return null;
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\x60[^\x60]+\x60|\[[^\]]+\]\([^)]+\))/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) output.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = keyPrefix + "-" + index++;
    if (token.startsWith("**")) output.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) output.push(<em key={key}>{token.slice(1, -1)}</em>);
    else if (token.startsWith("\x60")) output.push(<code key={key}>{token.slice(1, -1)}</code>);
    else {
      const split = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = split ? safeHref(split[2]) : null;
      if (split && href) {
        const external = href.startsWith("https://");
        output.push(<a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{split[1]}</a>);
      } else output.push(token);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
}

export function BlogMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (/^\s*\x60{3}/.test(line)) {
      const language = line.trim().slice(3).trim();
      index++;
      const code: string[] = [];
      while (index < lines.length && !/^\s*\x60{3}/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push(<pre key={"code-" + index} data-language={language || undefined}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 4);
      const children = inline(heading[2], "heading-" + index);
      if (level === 2) blocks.push(<h2 key={"heading-" + index}>{children}</h2>);
      else if (level === 3) blocks.push(<h3 key={"heading-" + index}>{children}</h3>);
      else blocks.push(<h4 key={"heading-" + index}>{children}</h4>);
      index++;
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={"rule-" + index}/>);
      index++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={"quote-" + index}>{quote.map((part, i) => <p key={i}>{inline(part, "quote-" + index + "-" + i)}</p>)}</blockquote>);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*[-*+]\s+/, ""));
      blocks.push(<ul key={"list-" + index}>{items.map((item, i) => <li key={i}>{inline(item, "ul-" + index + "-" + i)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={"list-" + index}>{items.map((item, i) => <li key={i}>{inline(item, "ol-" + index + "-" + i)}</li>)}</ol>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|>\s?|[-*+]\s+|\d+\.\s*|\x60{3})/.test(lines[index]) && !/^\s*(---|\*\*\*|___)\s*$/.test(lines[index])) paragraph.push(lines[index++].trim());
    if (paragraph.length === 0) { index++; continue; }
    blocks.push(<p key={"paragraph-" + index}>{inline(paragraph.join(" "), "paragraph-" + index)}</p>);
  }
  return <div className="blog-prose">{blocks}</div>;
}
