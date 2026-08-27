import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireCapability } from '@/middleware/requireCapability';
import * as contactsController from '../controllers/contacts.controller';

const router = Router();

router.use(authenticate);

// Lecture seule, ouvert à tout utilisateur authentifié — utilisé par le
// sélecteur de contact sur place du module Missions (remplace le fetch N+1
// organisations → contacts). USER_DIRECTORY_VIEW (capacité personnelle,
// présente à tous les niveaux) préserve exactement le même comportement que
// l'ancien requireRole('agent'), qui n'excluait déjà personne.
router.get('/', requireCapability('USER_DIRECTORY_VIEW'), contactsController.lister);

export default router;
