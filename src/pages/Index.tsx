import SyllabifiedText from "../components/SyllabifiedText";
import DemoSection from "../components/DemoSection";
import InstructionsSection from "../components/InstructionsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-highlight/40 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary text-primary-foreground mb-8 shadow-lg animate-fade-up">
            <span className="text-3xl font-display font-bold">A<span className="opacity-70">·</span></span>
          </div>

          <h1
            className="text-4xl md:text-6xl font-display font-extrabold text-foreground mb-4 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <SyllabifiedText text="Colore Texte" />
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-8 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            Une extension Firefox qui colore le texte pour faciliter la lecture.
          </p>

          <div
            className="flex flex-wrap gap-3 justify-center animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-display font-medium">
              🎯 Accessibilité
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-display font-medium">
              🇫🇷 Français
            </span>
            <span className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-display font-medium">
              ⌨️ Clavier & souris
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 pb-20 space-y-16">
        <DemoSection />
        <InstructionsSection />
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-6 text-center">
        <p className="text-sm text-muted-foreground font-display">
          Auteur : Chêne Denis — Extension Firefox pour l'accessibilité de la lecture
        </p>
      </footer>
    </div>
  );
};

export default Index;