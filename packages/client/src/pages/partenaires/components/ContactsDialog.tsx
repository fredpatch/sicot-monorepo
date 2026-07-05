import { Mail, Phone, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { FormulaireContact } from './FormulaireContact';
import type { ContactFormData } from '../partenaires.schemas';
import type { Contact, Organisation } from '../partenaires.types';

interface ContactsDialogProps {
  organisation: Organisation | null;
  contacts?: Contact[];
  modeAjout: boolean;
  onOpenChange: (open: boolean) => void;
  onDemarrerAjout: () => void;
  onAnnulerAjout: () => void;
  onSubmitContact: (data: ContactFormData) => void;
  onDefinirPrincipal: (contactId: number) => void;
  chargementAjout: boolean;
}

export function ContactsDialog({
  organisation,
  contacts,
  modeAjout,
  onOpenChange,
  onDemarrerAjout,
  onAnnulerAjout,
  onSubmitContact,
  onDefinirPrincipal,
  chargementAjout,
}: ContactsDialogProps) {
  return (
    <Dialog open={!!organisation} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contacts - {organisation?.nom}</DialogTitle>
          <DialogDescription>
            {organisation?.pays}
            {organisation?.region ? ` · ${organisation.region}` : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] overflow-y-auto space-y-4">
          {!modeAjout ? (
            <>
              {contacts?.length === 0 ? (
                <p className="text-anac-muted text-sm text-center py-8">Aucun contact enregistré.</p>
              ) : (
                <div className="space-y-3">
                  {contacts?.map((contact) => (
                    <div
                      key={contact.id}
                      className="border border-anac-border rounded-lg p-4 flex items-start justify-between hover:bg-anac-gray/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-anac-navy">
                            {contact.prenom} {contact.nom}
                          </span>
                          {contact.principal && <span className="badge-info text-xs">Principal</span>}
                          {!contact.actif && <span className="badge-expire text-xs">Inactif</span>}
                        </div>
                        {contact.poste && <p className="text-anac-muted text-xs">{contact.poste}</p>}
                        <div className="flex gap-4 mt-1.5 text-xs text-anac-muted">
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-1 hover:text-anac-navy transition-colors"
                            >
                              <Mail size={11} /> {contact.email}
                            </a>
                          )}
                          {contact.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {contact.telephone}
                            </span>
                          )}
                        </div>
                      </div>
                      {!contact.principal && contact.actif && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onDefinirPrincipal(contact.id)}
                          className="h-auto p-0 text-xs text-anac-sky hover:text-anac-navy shrink-0 ml-4"
                        >
                          Définir principal
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Button variant="secondary" className="w-full gap-2" onClick={onDemarrerAjout}>
                <Plus size={13} /> Ajouter un contact
              </Button>
            </>
          ) : (
            <div>
              <p className="font-medium text-anac-navy text-sm mb-4">Nouveau contact</p>
              <FormulaireContact
                onSubmit={onSubmitContact}
                onCancel={onAnnulerAjout}
                chargement={chargementAjout}
              />
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
