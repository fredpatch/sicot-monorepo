import { useParams } from 'react-router-dom';

import MissionCreateStepper from './form/MissionCreateStepper';
import MissionEditForm from './form/MissionEditForm';

// Dispatcher: create uses the guided 5-step stepper (/missions/new), edit
// uses grouped sections (/missions/:id/edit) — deliberately different
// flows per the Phase 2 plan (§3/§10): a minor operational update
// shouldn't force a user through creation-style steps.
export default function MissionFormPage() {
  const { id } = useParams<{ id: string }>();
  return id ? <MissionEditForm /> : <MissionCreateStepper />;
}
