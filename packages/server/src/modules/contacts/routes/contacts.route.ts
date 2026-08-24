import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/requiredRole';
import * as contactsController from '../controllers/contacts.controller';

const router = Router();

router.use(authenticate);

// Lecture seule, agent minimum — utilisé par le sélecteur de contact sur
// place du module Missions (remplace le fetch N+1 organisations → contacts).
router.get('/', requireRole('agent'), contactsController.lister);

export default router;
