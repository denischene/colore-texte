import { useMemo } from "react";

const VOWELS = "aeiouyàâäéèêëïîôùûüœæAEIOUYÀÂÄÉÈÊËÏÎÔÙÛÜŒÆ";
const CLUSTERS = [
  "bl", "br", "ch", "cl", "cr", "dr", "fl", "fr", "gl", "gr",
  "ph", "pl", "pr", "qu", "sc", "sk", "sl", "sm", "sn", "sp",
  "st", "sw", "th", "tr", "vr", "wr",
];

function isVowel(ch: string) {
  return VOWELS.includes(ch);
}

function splitSyllables(word: string): string[] {
  if (word.length <= 2) return [word];

  // Find split points using French syllabification rules
  const splits: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (!isVowel(word[i])) continue;
    // Count consonants after this vowel
    let j = i + 1;
    while (j < word.length && !isVowel(word[j])) j++;
    if (j >= word.length) continue; // no vowel after consonants
    const numConsonants = j - i - 1;
    if (numConsonants === 0) continue; // adjacent vowels
    if (numConsonants === 1) {
      splits.push(i + 1); // V-CV
    } else if (numConsonants === 2) {
      const pair = (word[j - 2] + word[j - 1]).toLowerCase();
      if (CLUSTERS.includes(pair)) {
        splits.push(i + 1); // V-CCV (cluster stays together)
      } else {
        splits.push(i + 2); // VC-CV
      }
    } else {
      // 3+ consonants
      const lastTwo = (word[j - 2] + word[j - 1]).toLowerCase();
      if (CLUSTERS.includes(lastTwo)) {
        splits.push(j - 2); // ...C-CCV
      } else {
        splits.push(j - 1); // ...CC-CV
      }
    }
  }

  if (splits.length === 0) return [word];
  const uniqueSplits = [...new Set(splits)].sort((a, b) => a - b);
  const syllables: string[] = [];
  let prev = 0;
  for (const s of uniqueSplits) {
    if (s > prev && s < word.length) {
      syllables.push(word.slice(prev, s));
      prev = s;
    }
  }
  syllables.push(word.slice(prev));
  return syllables.filter(s => s.length > 0);
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
