const LOCALE = "pt-BR";

const LOWERCASE_CONNECTORS = new Set([
  "a",
  "à",
  "ao",
  "aos",
  "as",
  "c/",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "p/",
  "para",
  "por",
  "s/",
  "sem",
]);

function capitalizeWord(word: string): string {
  return word.charAt(0).toLocaleUpperCase(LOCALE) + word.slice(1);
}

export function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lowerWord = word.toLocaleLowerCase(LOCALE);
      if (index > 0 && LOWERCASE_CONNECTORS.has(lowerWord)) return lowerWord;
      return capitalizeWord(word);
    })
    .join(" ");
}
