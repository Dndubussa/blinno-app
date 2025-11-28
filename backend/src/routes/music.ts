import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { 
  createTrack, 
  getTracks, 
  getTrackById, 
  updateTrack, 
  deleteTrack,
  getMusicianTracks,
  getTrackStats
} from '../services/musicService.js';

const router = Router();

// Public routes
router.get('/', async (req, res) => {
  try {
    const tracks = await getTracks();
    res.json(tracks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const track = await getTrackById(req.params.id);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json(track);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes (musician only)
router.post('/', authenticate, requireRole('musician'), async (req, res) => {
  try {
    const track = await createTrack({ ...req.body, musician_id: (req as any).userId });
    res.status(201).json(track);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/tracks', authenticate, requireRole('musician'), async (req, res) => {
  try {
    const tracks = await getMusicianTracks((req as any).userId);
    res.json(tracks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/stats', authenticate, requireRole('musician'), async (req, res) => {
  try {
    const stats = await getTrackStats((req as any).userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticate, requireRole('musician'), async (req, res) => {
  try {
    const track = await updateTrack(req.params.id, req.body);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json(track);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, requireRole('musician'), async (req, res) => {
  try {
    const result = await deleteTrack(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json({ message: 'Track deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;