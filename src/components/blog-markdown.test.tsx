import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogMarkdown } from "./blog-markdown";

describe("BlogMarkdown", () => {
  it("renders supported editorial markdown", () => {
    const html = renderToStaticMarkup(<BlogMarkdown content={"## Thoughtful details\n\nA **considered** room with *soft* textures and \x60natural linen\x60.\n\n- Texture\n- Colour"} />);
    expect(html).toContain("<h3>Thoughtful details</h3>");
    expect(html).toContain("<strong>considered</strong>");
    expect(html).toContain("<em>soft</em>");
    expect(html).toContain("<code>natural linen</code>");
    expect(html).toContain("<ul>");
  });

  it("escapes raw HTML and refuses unsafe link protocols", () => {
    const html = renderToStaticMarkup(<BlogMarkdown content={'<script>alert("x")</script>\n\n[unsafe](javascript:alert(1)) [safe](https://example.com)'} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
