import { Keyboard, Mouse, Download } from "lucide-react";
import { Button } from "./ui/button";

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
      <><Kbd>Ctrl</Kbd>+<Kbd>Maj</Kbd>+<Kbd>J</Kbd> pour activer et désactiver l'extension</>,
      <><Kbd>Tab</Kbd> pour naviguer entre les éléments</>,
      <><Kbd>Entrée</Kbd> pour coloriser l'élément focusé</>,
      <>Si l'élément est activable (lien, bouton), un 2e <Kbd>Entrée</Kbd> l'active</>,
      <><Kbd>Échap.</Kbd> pour revenir en mode attente</>,
    ],
  },
  {
    icon: Mouse,
    title: "Mode souris",
    steps: [
      <>Cliquer sur l'icône <span className="font-bold text-primary">J</span> dans la barre d'outils pour activer</>,
      <>Cliquer ou survoler un élément pour le coloriser (selon le réglage)</>,
      <>Si l'élément est activable, un 2e clic l'active (lien, bouton…)</>,
      <>Clic droit pour revenir en mode attente</>,
    ],
  },
];

const handleDownload = () => {
  fetch("/colore-texte.zip")
    .then((res) => {
      if (!res.ok) throw new Error(`Échec du téléchargement : ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "colore-texte.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => alert(err.message));
};

const InstructionsSection = () => {
  return (
    <section className="w-full max-w-3xl mx-auto" aria-labelledby="instructions-title">
      <h2 id="instructions-title" className="text-2xl md:text-3xl font-display font-bold text-center mb-8 text-foreground">
        Comment l'utiliser
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {instructions.map((block) => (
          <div
            key={block.title}
            className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            role="region"
            aria-label={block.title}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center" aria-hidden="true">
                <block.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{block.title}</h3>
            </div>
            <ol className="space-y-2.5" aria-label={`Étapes du ${block.title.toLowerCase()}`}>
              {block.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm font-body text-muted-foreground">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-display font-bold mt-0.5" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-highlight/30 p-6 text-center" role="region" aria-label="Téléchargement">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Download className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 className="font-display font-semibold text-foreground">Télécharger & Installer</h3>
        </div>
        <p className="text-sm text-muted-foreground font-body max-w-md mx-auto mb-4">
          Extension Firefox — téléchargez le fichier ZIP puis chargez-le via{" "}
          <code className="px-1.5 py-0.5 rounded bg-secondary text-sm">about:debugging</code> →
          « Charger un module temporaire » → sélectionner <code className="px-1.5 py-0.5 rounded bg-secondary text-sm">manifest.json</code>.
        </p>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" aria-hidden="true" />
          Télécharger J'cOLorE le texte
        </Button>
      </div>
    </section>
  );
};

export default InstructionsSection;
