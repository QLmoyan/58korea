import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="channel-article-markdown space-y-4 text-[15px] leading-7 text-zinc-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="pt-2 text-lg font-semibold leading-8 text-zinc-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-1 text-base font-semibold leading-7 text-zinc-900">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") {
              return null;
            }

            const caption = alt?.trim();

            return (
              <figure className="my-4 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={caption || ""}
                  className="w-full rounded-xl bg-zinc-100"
                  loading="lazy"
                  decoding="async"
                />
                {caption ? (
                  <figcaption className="mt-2 text-center text-xs leading-5 text-zinc-400">
                    {caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          },
          a: ({ href, children }) => {
            if (!href) {
              return <span>{children}</span>;
            }

            const className = "text-rose-500 underline-offset-2 hover:underline";

            if (href.startsWith("/")) {
              return (
                <Link href={href} className={className}>
                  {children}
                </Link>
              );
            }

            if (isExternalHref(href)) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {children}
                </a>
              );
            }

            return (
              <Link href={`/${href}`} className={className}>
                {children}
              </Link>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-200 pl-4 text-zinc-600">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
