import { useParams } from 'react-router-dom';

import CourrierCreateStepper from './components/form/CourrierCreateStepper';
import CourrierEditForm from './components/form/CourrierEditForm';

// Dispatcher: create uses the guided 4-step stepper (/courriers/new), edit
// uses grouped sections (/courriers/:id/edit) — same split as Missions,
// since a minor operational update shouldn't force creation-style steps.
export default function CourrierFormPage() {
  const { id } = useParams<{ id: string }>();
  return id ? <CourrierEditForm /> : <CourrierCreateStepper />;
}
