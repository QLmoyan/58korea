import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-zinc-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="pt-2 text-lg font-semibold text-zinc-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-1 text-base font-semibold text-zinc-900">{children}</h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900">{children}</strong>
          ),
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") {
              return null;
            }

            return (
              <span className="relative my-2 block aspect-[16/9] max-h-[260px] w-full overflow-hidden rounded-xl">
                <Image
                  src={src}
                  alt={alt ?? "文章图片"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 720px"
                />
              </span>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-500 underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5">{children}</ol>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
