// packages/client/src/pages/AnalyticsPage.tsx
import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { ONGLETS } from './analytics/analytics.constants';
import { resoudrePeriode } from './analytics/analytics.utils';
import type { Onglet, PeriodePreset } from './analytics/analytics.types';
import { PeriodeSelector } from './analytics/components/PeriodSelector';
import { OngletGlobal } from './analytics/components/tabs/GlobalTab';
import { OngletAccords } from './analytics/components/tabs/AgreementsTab';
import { OngletCourriers } from './analytics/components/tabs/CourriersTab';
import { OngletMissions } from './analytics/components/tabs/MissionsTab';
import { OngletTraductions } from './analytics/components/tabs/TraductionsTab';
import { OngletDemandes } from './analytics/components/tabs/RequestsTab';
import { OngletDocuments } from './analytics/components/tabs/DocumentsTab';
import { OngletGlossaire } from './analytics/components/tabs/GlossaryTab';
import { OngletRapports } from './analytics/components/tabs/ReportsTab';

export default function AnalyticsPage() {
  const [onglet, setOnglet] = useState<Onglet>('global');
  const [preset, setPreset] = useState<PeriodePreset>('90j');
  const [customDebut, setCustomDebut] = useState('');
  const [customFin, setCustomFin] = useState('');

  const periode = useMemo(
    () => resoudrePeriode(preset, customDebut, customFin),
    [preset, customDebut, customFin]
  );

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-anac-navy/8 flex items-center justify-center">
            <BarChart3 size={18} className="text-anac-navy" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-anac-navy">Analytics & Rapports</h2>
            <p className="text-anac-muted text-sm mt-0.5">
              Pilotage stratégique - tendances et volumes d&apos;activité
            </p>
          </div>
        </div>

        <PeriodeSelector
          preset={preset}
          onPresetChange={setPreset}
          customDebut={customDebut}
          onCustomDebutChange={setCustomDebut}
          customFin={customFin}
          onCustomFinChange={setCustomFin}
          ongletActif={onglet}
          periode={periode}
        />
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────── */}
      <Tabs value={onglet} onValueChange={(v) => setOnglet(v as Onglet)}>
        <TabsList>
          {ONGLETS.map((o) => (
            <TabsTrigger key={o.cle} value={o.cle}>
              {o.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="global">
          <OngletGlobal periode={periode} />
        </TabsContent>
        <TabsContent value="accords">
          <OngletAccords periode={periode} />
        </TabsContent>
        <TabsContent value="courriers">
          <OngletCourriers periode={periode} />
        </TabsContent>
        <TabsContent value="missions">
          <OngletMissions periode={periode} />
        </TabsContent>
        <TabsContent value="traductions">
          <OngletTraductions periode={periode} />
        </TabsContent>
        <TabsContent value="demandes">
          <OngletDemandes periode={periode} />
        </TabsContent>
        <TabsContent value="documents">
          <OngletDocuments periode={periode} />
        </TabsContent>
        <TabsContent value="glossaire">
          <OngletGlossaire periode={periode} />
        </TabsContent>
        <TabsContent value="rapports">
          <OngletRapports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
