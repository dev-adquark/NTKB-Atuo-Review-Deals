import ReactMarkdown from "react-markdown";

const SAFE_URL_PATTERN = /^(https?:|mailto:|\/|#)/i;

/**
 * Renders external content as markdown safely: react-markdown never uses
 * dangerouslySetInnerHTML and doesn't render embedded raw HTML by default, so
 * this can't be used to inject scripts. The only extra precaution needed is
 * stripping dangerous link protocols (e.g. `javascript:`) from markdown links.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ href, children: linkChildren, ...props }) => {
            const safeHref = href && SAFE_URL_PATTERN.test(href) ? href : undefined;
            return (
              <a href={safeHref} target={safeHref ? "_blank" : undefined} rel="noreferrer" {...props}>
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
