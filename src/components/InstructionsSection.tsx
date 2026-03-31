import { Keyboard, Mouse, Download } from "lucide-react";

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-block px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-mono border">
    {children}
  </kbd>
);

const instructions = [
  {
    icon: Keyboard,
    title: "Mode clavier",
    steps: [
      <><Kbd>Ctrl</Kbd>+<Kbd>M</Kbd> pour activer l'extension</>,
      <><Kbd>Entrée</Kbd> pour coloriser l'élément focusé</>,
      <><Kbd>Tab</Kbd> pour naviguer entre éléments</>,
      <><Kbd>Échap.</Kbd> pour désactiver</>,
    ],
  },
  {
    icon: Mouse,
    title: "Mode souris",
    steps: [
      <>Cliquer sur l'icône <span className="syllable-dot font-bold">A·</span> dans la barre d'outils</>,
      <>Cliquer sur un élément pour le coloriser</>,
      <>Survoler les éléments pour les coloriser au passage</>,
      <><Kbd>Échap.</Kbd> pour revenir en mode attente</>,
    ],
  },
];

const InstructionsSection = () => {
  return (
    <section className="w-full max-w-3xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-8 text-foreground">
        Comment l'utiliser
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {instructions.map((block) => (
          <div
            key={block.title}
            className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <block.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{block.title}</h3>
            </div>
            <ol className="space-y-2.5">
              {block.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm font-body text-muted-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-display font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-highlight/30 p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Installation</h3>
        </div>
        <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
          Extension Firefox — chargez le dossier <code className="px-1.5 py-0.5 rounded bg-secondary text-sm">extension/</code> via{" "}
          <code className="px-1.5 py-0.5 rounded bg-secondary text-sm">about:debugging</code> →
          « Charger un module temporaire » → sélectionner <code className="px-1.5 py-0.5 rounded bg-secondary text-sm">manifest.json</code>.
        </p>
      </div>
    </section>
  );
};

export default InstructionsSection;