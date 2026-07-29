import { useEffect, useRef } from 'react';
import type { ChartConfiguration, ChartType } from 'chart.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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

    const existing = Chart.getChart(canvasRef.current);
    existing?.destroy();

    const chart = new Chart(canvasRef.current, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
      },
    } as ChartConfiguration<TType>);

    return () => chart.destroy();
  }, [config]);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${hauteur}px` }}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
