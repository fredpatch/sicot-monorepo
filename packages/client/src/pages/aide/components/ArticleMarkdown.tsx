// packages/client/src/pages/aide/components/ArticleMarkdown.tsx
//
// Renders repository-controlled article Markdown (Phase 10.3). react-markdown
// builds a React element tree directly - no dangerouslySetInnerHTML, and no
// raw-HTML plugin is added, so arbitrary HTML embedded in a Markdown file
// is never rendered (defense in depth: docs/ is repository-controlled, not
// user-authored, but the content is still text parsed at runtime). The only
// customization is the link renderer: external links (http/https) open
// safely in a new tab; internal links (starting with /) use React Router's
// Link for SPA navigation instead of a full page reload.
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//i.test(href);
}

const components: Components = {
  a({ href, children, ...props }) {
    if (isExternal(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }
    if (href?.startsWith('/')) {
      return <Link to={href}>{children}</Link>;
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
};

// @tailwindcss/typography's `prose` handles headings/lists/emphasis/code
// spacing and hierarchy; `prose-sm` matches SICOT's compact type scale
// (13px base) better than the plugin's default size. Colors are SICOT's own
// tokens, not the plugin's default grayscale - see the `.prose` overrides in
// index.css, checked against the white `.card` background this always
// renders inside. `max-w-none` is deliberately omitted: prose's own ~65ch
// measure is the readability width documentation content wants, and is
// narrower than the article page's own container anyway.
export function ArticleMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm">
      <Markdown components={components}>{content}</Markdown>
    </div>
  );
}
