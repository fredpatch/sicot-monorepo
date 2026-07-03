import { useEffect, useRef } from 'react';
import type { ChartConfiguration, ChartType } from 'chart.js';

const CHARTJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';

// ── Couleurs partagées — cohérence avec DashboardPage.tsx ──────────────────
export const COULEURS_GRAPHIQUE = {
  primaire: '#2a78d6',
  succes: '#1baf7a',
  attention: '#e0a72e',
  danger: '#d64545',
  muted: '#888780',
  grille: '#e1e0d9',
  navy: '#1B2A5E',
};

export function ChartCanvas<TType extends ChartType = ChartType>({
  config,
  hauteur = 220,
  label,
}: {
  config: ChartConfiguration<TType>;
  hauteur?: number;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const construire = () => {
      const Chart = (window as unknown as { Chart: typeof import('chart.js').Chart }).Chart;
      const existing = Chart.getChart(canvasRef.current!);
      existing?.destroy();

      new Chart(canvasRef.current!, {
        ...config,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...config.options,
        },
      } as ChartConfiguration<TType>);
    };

    if ((window as unknown as { Chart?: unknown }).Chart) {
      construire();
    } else {
      const script = document.createElement('script');
      script.src = CHARTJS_CDN;
      script.onload = construire;
      document.head.appendChild(script);
    }
  }, [config]);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${hauteur}px` }}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
