import { useState, useMemo } from "react";
import SyllabifiedText from "./SyllabifiedText";

const DEMO_TEXT =
  "La lecture est une activité fondamentale qui permet de découvrir le monde et d'enrichir ses connaissances.";

const PARAGRAPH_TEXT =
  "La raison du plus fort est toujours la meilleure. Nous l'allons montrer tout à l'heure. Un Agneau se désaltérait dans le courant d'une onde pure.";

/* ─── Syllable splitting (French heuristic) ─── */
const VOWELS = "aeiouyàâäéèêëïîôùûüœæAEIOUYÀÂÄÉÈÊËÏÎÔÙÛÜŒÆ";
function isVowel(ch: string) { return VOWELS.includes(ch); }

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
      } else { syllables.push(current); }
      current = ""; continue;
    }
    const next = word[i + 1];
    if (isVowel(ch) && !isVowel(next) && i + 2 < word.length && isVowel(word[i + 2])) {
      syllables.push(current); current = ""; continue;
    }
    if (!isVowel(ch) && !isVowel(next) && current.length > 1) {
      const clusters = ["bl","br","ch","cl","cr","dr","fl","fr","gl","gr","ph","pl","pr","qu","sc","sk","sl","sm","sn","sp","st","sw","th","tr","vr","wr"];
      if (!clusters.includes((ch + next).toLowerCase())) {
        syllables.push(current); current = ""; continue;
      }
    }
  }
  if (current) {
    if (syllables.length > 0 && current.length === 1) syllables[syllables.length - 1] += current;
    else syllables.push(current);
  }
  const merged: string[] = [];
  for (const s of syllables) {
    if (merged.length > 0 && s.length === 1 && !isVowel(s)) merged[merged.length - 1] += s;
    else merged.push(s);
  }
  return merged.length > 0 ? merged : [word];
}

/* ─── Coloring renderers ─── */
const SYLLABLE_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 80%, 50%)",
];

const PHONEME_COLORS: Record<string, string> = {
  a: "#7f3c00", e: "#ff7900", i: "#ffd200", o: "#ff47c2", u: "#ff0000", y: "#c40083",
  é: "#ff7900", è: "#008000", ê: "#008000", ë: "#008000",
  à: "#7f3c00", â: "#7f3c00", ä: "#7f3c00",
  î: "#ffd200", ï: "#ffd200",
  ô: "#ff47c2", ö: "#ff47c2",
  ù: "#ff0000", û: "#ff0000", ü: "#ff0000",
  œ: "#6688ff", æ: "#6688ff",
  ch: "#bef574", ph: "#bf3030", ou: "#ff0000", an: "#16b84e", en: "#16b84e",
  on: "#f88e55", in: "#cfc3b4", un: "#cfc3b4", oi: "#b58e6b", au: "#ff47c2", eau: "#ff47c2",
};

interface ColoredWordProps {
  word: string;
  mode: "syllables-separated" | "syllables-colored" | "phonemes-colored";
}

const ColoredWord = ({ word, mode }: ColoredWordProps) => {
  const syllables = splitSyllables(word);

  if (mode === "syllables-separated") {
    return (
      <span>
        {syllables.map((syl, i) => (
          <span key={i}>
            {syl}
            {i < syllables.length - 1 && <span className="syllable-dot">·</span>}
          </span>
        ))}
      </span>
    );
  }

  if (mode === "syllables-colored") {
    return (
      <span>
        {syllables.map((syl, i) => (
          <span key={i} style={{ color: SYLLABLE_COLORS[i % SYLLABLE_COLORS.length] }}>
            {syl}
          </span>
        ))}
      </span>
    );
  }

  // phonemes-colored: color each character by its phoneme group
  return (
    <span>
      {word.split("").map((ch, i) => {
        const lower = ch.toLowerCase();
        const color = PHONEME_COLORS[lower];
        return (
          <span key={i} style={color ? { color, fontWeight: 500 } : undefined}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

const ColoredText = ({ text, mode }: { text: string; mode: ColoredWordProps["mode"] }) => {
  const tokens = text.split(/(\s+|[.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+)/);
  return (
    <span>
      {tokens.map((token, i) => {
        if (!token || /^[\s.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }
        return <ColoredWord key={i} word={token} mode={mode} />;
      })}
    </span>
  );
};

/* ─── Demo cards ─── */
type DemoMode = "syllables-separated" | "syllables-colored" | "phonemes-colored" | "scope-word" | "scope-sentence" | "scope-paragraph";

interface DemoCardProps {
  title: string;
  description: string;
  mode: DemoMode;
}

const DemoCard = ({ title, description, mode }: DemoCardProps) => {
  const [active, setActive] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<number | null>(null);
  const [hoveredSentence, setHoveredSentence] = useState(false);

  const text = DEMO_TEXT;
  const tokens = useMemo(() => text.split(/(\s+|[.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+)/), [text]);

  const renderContent = () => {
    if (!active) {
      return <p className="text-muted-foreground">{text}</p>;
    }

    if (mode === "syllables-separated" || mode === "syllables-colored" || mode === "phonemes-colored") {
      return <ColoredText text={text} mode={mode} />;
    }

    if (mode === "scope-word") {
      return (
        <span>
          {tokens.map((token, i) => {
            if (!token || /^[\s.,;:!?'"()\[\]{}<>\/\\—–\-…«»""]+$/.test(token)) {
              return <span key={i}>{token}</span>;
            }
            const isHovered = hoveredWord === i;
            return (
              <span
                key={i}
                onMouseEnter={() => setHoveredWord(i)}
                onMouseLeave={() => setHoveredWord(null)}
                className={`cursor-pointer rounded transition-colors ${isHovered ? "demo-highlight px-0.5" : ""}`}
              >
                {isHovered ? <SyllabifiedText text={token} /> : token}
              </span>
            );
          })}
        </span>
      );
    }

    if (mode === "scope-sentence") {
      return (
        <span
          onMouseEnter={() => setHoveredSentence(true)}
          onMouseLeave={() => setHoveredSentence(false)}
          className={`cursor-pointer rounded transition-colors ${hoveredSentence ? "demo-highlight p-1" : ""}`}
        >
          {hoveredSentence ? <SyllabifiedText text={text} /> : text}
        </span>
      );
    }

    if (mode === "scope-paragraph") {
      return (
        <div className="demo-highlight p-3 rounded-lg">
          <SyllabifiedText text={PARAGRAPH_TEXT} />
        </div>
      );
    }

    return <p>{text}</p>;
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm" role="region" aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-display font-semibold text-foreground">{title}</h3>
        <button
          onClick={() => setActive(!active)}
          aria-pressed={active}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-display font-medium
            transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            ${active
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            }
          `}
        >
          <span className="text-sm">{active ? "🎨" : "⬚"}</span>
          {active ? "Actif" : "Activer"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3 font-body">{description}</p>
      <div className="text-base leading-relaxed font-body">
        {renderContent()}
      </div>
    </div>
  );
};

const DemoSection = () => {
  return (
    <section className="w-full max-w-4xl mx-auto" aria-labelledby="demos-title">
      <h2 id="demos-title" className="text-2xl md:text-3xl font-display font-bold text-center mb-8 text-foreground">
        Démonstrations interactives
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        <DemoCard
          title="Syllabes séparées"
          description="Les syllabes sont séparées par des points médians (·) pour faciliter le déchiffrage."
          mode="syllables-separated"
        />
        <DemoCard
          title="Syllabes colorées"
          description="Les syllabes alternent entre deux couleurs pour un repérage visuel rapide."
          mode="syllables-colored"
        />
        <DemoCard
          title="Prononciations colorées"
          description="Chaque phonème est coloré selon sa prononciation pour aider au décodage des sons."
          mode="phonemes-colored"
        />
        <DemoCard
          title="Sur le mot"
          description="Survolez un mot pour voir ses syllabes. La coloration s'applique uniquement au mot pointé."
          mode="scope-word"
        />
        <DemoCard
          title="Sur la phrase"
          description="Survolez la phrase pour coloriser toutes les syllabes. La coloration s'applique à la phrase entière."
          mode="scope-sentence"
        />
        <DemoCard
          title="Sur le paragraphe"
          description="La coloration s'applique à un paragraphe entier pour une lecture continue."
          mode="scope-paragraph"
        />
      </div>
    </section>
  );
};

export default DemoSection;
