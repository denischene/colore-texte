import { useState } from "react";
import SyllabifiedText from "./SyllabifiedText";

const DEMO_TEXT =
  "La lecture est une activité fondamentale qui permet de découvrir le monde et d'enrichir ses connaissances. Grâce à la syllabification, chaque mot devient plus accessible et plus facile à déchiffrer.";

const DemoSection = () => {
  const [active, setActive] = useState(false);

  return (
    <section className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl border bg-card p-6 md:p-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display font-semibold text-foreground">
            Démonstration interactive
          </h3>
          <button
            onClick={() => setActive(!active)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-medium
              transition-all duration-300
              ${active
                ? "bg-primary text-primary-foreground animate-pulse-glow"
                : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
              }
            `}
          >
            <span className="text-base">{active ? "🎨" : "⬚"}</span>
            {active ? "Actif" : "Activer"}
          </button>
        </div>

        <div
          className={`
            text-lg leading-relaxed font-body transition-all duration-500
            ${active ? "demo-highlight p-4 rounded-lg" : ""}
          `}
        >
          {active ? (
            <SyllabifiedText text={DEMO_TEXT} />
          ) : (
            <p className="text-muted-foreground">{DEMO_TEXT}</p>
          )}
        </div>

        {active && (
          <p className="mt-4 text-sm text-muted-foreground font-display animate-fade-up">
            Les points médians <span className="syllable-dot text-base">·</span> séparent visuellement les syllabes pour faciliter la lecture.
          </p>
        )}
      </div>
    </section>
  );
};

export default DemoSection;