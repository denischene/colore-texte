import { useMemo } from "react";

const VOWELS = "aeiouyàâäéèêëïîôùûüœæAEIOUYÀÂÄÉÈÊËÏÎÔÙÛÜŒÆ";

function isVowel(ch: string) {
  return VOWELS.includes(ch);
}

function splitSyllables(word: string): string[] {
  if (word.length <= 2) return [word];
  const syllables: string[] = [];
  let current = "";

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    current += ch;

    if (i === word.length - 1) {
      if (syllables.length > 0 && current.length === 1 && !isVowel(ch)) {
        syllables[syllables.length - 1] += current;
      } else {
        syllables.push(current);
      }
      current = "";
      continue;
    }

    const next = word[i + 1];

    if (isVowel(ch) && !isVowel(next) && i + 2 < word.length && isVowel(word[i + 2])) {
      syllables.push(current);
      current = "";
      continue;
    }

    if (!isVowel(ch) && !isVowel(next) && current.length > 1) {
      const clusters = [
        "bl", "br", "ch", "cl", "cr", "dr", "fl", "fr", "gl", "gr",
        "ph", "pl", "pr", "qu", "sc", "sk", "sl", "sm", "sn", "sp",
        "st", "sw", "th", "tr", "vr", "wr",
      ];
      const pair = (ch + next).toLowerCase();
      if (!clusters.includes(pair)) {
        syllables.push(current);
        current = "";
        continue;
      }
    }
  }

  if (current) {
    if (syllables.length > 0 && current.length === 1) {
      syllables[syllables.length - 1] += current;
    } else {
      syllables.push(current);
    }
  }

  const merged: string[] = [];
  for (const s of syllables) {
    if (merged.length > 0 && s.length === 1 && !isVowel(s)) {
      merged[merged.length - 1] += s;
    } else {
      merged.push(s);
    }
  }

  return merged.length > 0 ? merged : [word];
}

interface SyllabifiedTextProps {
  text: string;
  className?: string;
}

const SyllabifiedText = ({ text, className }: SyllabifiedTextProps) => {
  const parts = useMemo(() => {
    const tokens = text.split(/(\s+|[.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+)/);
    return tokens.map((token, tokenIdx) => {
      if (!token || /^[\s.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+$/.test(token)) {
        return <span key={tokenIdx}>{token}</span>;
      }
      const syllables = splitSyllables(token);
      if (syllables.length <= 1) return <span key={tokenIdx}>{token}</span>;
      return (
        <span key={tokenIdx}>
          {syllables.map((syl, i) => (
            <span key={i}>
              {syl}
              {i < syllables.length - 1 && <span className="syllable-dot">·</span>}
            </span>
          ))}
        </span>
      );
    });
  }, [text]);

  return <span className={className}>{parts}</span>;
};

export default SyllabifiedText;