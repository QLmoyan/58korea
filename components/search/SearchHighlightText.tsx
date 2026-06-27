import { splitTextByKeyword } from "@/lib/search/highlight-text";
import { isSearchQueryEmpty } from "@/lib/search/normalize-query";

interface SearchHighlightTextProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export default function SearchHighlightText({
  text,
  query,
  className,
  highlightClassName = "rounded-sm bg-amber-100 font-medium text-amber-900",
}: SearchHighlightTextProps) {
  if (isSearchQueryEmpty(query)) {
    return <span className={className}>{text}</span>;
  }

  const segments = splitTextByKeyword(text, query);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={`${index}-${segment.text}`} className={highlightClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
