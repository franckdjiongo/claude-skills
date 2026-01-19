import React from 'react';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Highlights matching text with a glowing cyan accent
 * Used in search results to show which parts matched the query
 */
export function HighlightedText({ text, query, className = '' }: HighlightedTextProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark key={index} className="search-highlight">
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}

/**
 * Truncates text and highlights matching portions
 * Smart truncation that keeps the matching text visible
 */
export function HighlightedTextWithTruncation({
  text,
  query,
  maxLength = 150,
  className = '',
}: HighlightedTextProps & { maxLength?: number }) {
  if (!query.trim()) {
    const truncated = text.length > maxLength
      ? text.slice(0, maxLength) + '...'
      : text;
    return <span className={className}>{truncated}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  let displayText = text;
  let prefix = '';
  let suffix = '';

  if (text.length > maxLength) {
    if (matchIndex === -1) {
      displayText = text.slice(0, maxLength);
      suffix = '...';
    } else {
      // Center the match in the visible portion
      const halfLength = Math.floor((maxLength - query.length) / 2);
      const start = Math.max(0, matchIndex - halfLength);
      const end = Math.min(text.length, start + maxLength);

      displayText = text.slice(start, end);
      prefix = start > 0 ? '...' : '';
      suffix = end < text.length ? '...' : '';
    }
  }

  return (
    <span className={className}>
      {prefix}
      <HighlightedText text={displayText} query={query} />
      {suffix}
    </span>
  );
}
