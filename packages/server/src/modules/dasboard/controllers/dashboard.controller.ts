import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service.js';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getDashboardData();
    res.json(data);
  } catch (error) {
    console.error('[dashboard.controller]', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}
