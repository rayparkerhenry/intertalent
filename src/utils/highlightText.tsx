import React from 'react';

/**
 * Highlights matching keywords in text with a yellow/orange background
 * Supports both single keyword strings and arrays of keywords
 * @param text - The text to search and highlight in
 * @param keywords - The search keywords (string or array of strings)
 * @returns JSX with highlighted matches
 */
export function highlightKeywords(
  text: string,
  keywords: string | string[] | undefined
): React.ReactNode {
  if (!text) {
    return text;
  }

  // Handle empty keywords
  if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
    return text;
  }

  // Convert single string to array for uniform processing
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];

  // Filter out empty strings and trim all keywords
  const trimmedKeywords = keywordArray
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (trimmedKeywords.length === 0) {
    return text;
  }

  // For each keyword, try to match it as a complete phrase first
  // Then collect all individual words from all keywords for fallback matching
  const allPhrases: string[] = [];
  const allWords: string[] = [];

  trimmedKeywords.forEach((keyword) => {
    // Add the complete phrase
    allPhrases.push(keyword);

    // Also split into individual words for fallback
    const words = keyword.split(/\s+/).filter((w) => w.length > 0);
    allWords.push(...words);
  });

  // Create regex pattern that matches any complete phrase OR any individual word
  const escapedPhrases = allPhrases.map((phrase) =>
    phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const escapedWords = allWords.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Combine phrases and words, prioritizing longer matches (phrases first)
  const allPatterns = [...escapedPhrases, ...escapedWords];
  const pattern = allPatterns.join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  // Split text by matches and wrap matches in highlight spans
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches any keyword phrase or word (case-insensitive)
        const isMatch = allPatterns.some((pattern) => {
          const patternRegex = new RegExp(`^${pattern}$`, 'i');
          return patternRegex.test(part);
        });

        if (isMatch && part.trim()) {
          return (
            <mark
              key={index}
              className="bg-orange-200 text-gray-900 font-medium px-1 rounded"
              style={{ backgroundColor: '#fed7aa' }}
            >
              {part}
            </mark>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
