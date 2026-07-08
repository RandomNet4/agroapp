import { Router } from 'express';
import * as miscController from '../controllers/misc.controller';

const router = Router();

router.get('/all-data', miscController.getAll);
router.post('/edukasi', miscController.createEdu);
router.post('/bibit-pupuk/buy', miscController.buy);
router.post('/notifikasi/:id/read', miscController.readNotif);
router.post('/jejak-panen/:id/timeline', miscController.addJejakTimeline);

export default router;
