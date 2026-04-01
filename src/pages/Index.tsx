import { useNavigate } from 'react-router-dom';
import { Sun, Zap, Globe, Radio, ArrowRight } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="scan-line" />

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(hsl(205 100% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(205 100% 55% / 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

        <div className="text-center z-10 px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sun className="w-10 h-10 text-primary" />
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-black tracking-widest text-primary glow-text-primary mb-4">
            HELIOS-LINK
          </h1>
          <p className="font-mono text-sm text-muted-foreground mb-2 tracking-wider">
            SPACE-BASED SOLAR POWER SIMULATION PLATFORM
          </p>
          <p className="text-xs text-muted-foreground/60 font-mono mb-12 max-w-md mx-auto">
            AI-powered orbital mechanics • Microwave power transmission • Real-time 3D visualization
          </p>

          <button
            onClick={() => navigate('/simulation')}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-primary text-primary-foreground font-display text-sm uppercase tracking-widest hover:shadow-[0_0_30px_hsl(205_100%_55%/0.5)] transition-all animate-pulse-glow"
          >
            Launch Mission
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-2xl mx-auto">
            {[
              { icon: <Globe className="w-5 h-5" />, title: '3D Visualization', desc: 'Real-time orbital simulation' },
              { icon: <Zap className="w-5 h-5" />, title: 'Physics Engine', desc: '4-stage power pipeline' },
              { icon: <Radio className="w-5 h-5" />, title: 'AI Validation', desc: 'Smart parameter correction' },
            ].map((f) => (
              <div key={f.title} className="border border-border rounded-lg p-4 bg-card/50 hover:border-primary/30 transition-all">
                <div className="text-primary mb-2">{f.icon}</div>
                <h3 className="font-display text-xs tracking-wider text-foreground mb-1">{f.title}</h3>
                <p className="text-[10px] font-mono text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-border">
        <p className="text-[10px] font-mono text-muted-foreground/40">
          HELIOS-LINK © 2026 • Space-Based Solar Power Research Platform
        </p>
      </footer>
    </div>
  );
}
