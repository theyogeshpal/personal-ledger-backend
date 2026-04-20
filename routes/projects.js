import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects — all non-deleted projects
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { user: req.user._id, deletedAt: null };
    if (status) query.status = status;
    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/trash — trashed projects
router.get('/trash', protect, async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user._id, deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const activeProjects = await Project.countDocuments({ user: req.user._id, status: 'active', deletedAt: null });
    const completedProjects = await Project.countDocuments({ user: req.user._id, status: 'completed', deletedAt: null });
    const onHoldProjects = await Project.countDocuments({ user: req.user._id, status: 'on-hold', deletedAt: null });
    const totalProjects = await Project.countDocuments({ user: req.user._id, deletedAt: null });
    res.json({ activeProjects, completedProjects, onHoldProjects, totalProjects });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects — create
router.post('/', [protect, body('title').notEmpty().withMessage('Title is required')], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category, status, progress, githubUrl, repos, backendUrl, frontendUrl, liveLinks, credentials, tags, startDate, endDate } = req.body;

    const project = await Project.create({
      user: req.user._id, title, description, category, status, progress,
      githubUrl, repos, backendUrl, frontendUrl, liveLinks, credentials, tags, startDate, endDate
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id — update
router.put('/:id', [protect, body('title').optional().notEmpty().withMessage('Title cannot be empty')], async (req, res) => {
  try {
    const { title, description, category, status, progress, githubUrl, repos, backendUrl, frontendUrl, liveLinks, credentials, tags, startDate, endDate } = req.body;

    let project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    project = await Project.findByIdAndUpdate(
      req.params.id,
      { title, description, category, status, progress, githubUrl, repos, backendUrl, frontendUrl, liveLinks, credentials, tags, startDate, endDate },
      { new: true, runValidators: true }
    );
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id — soft delete (move to trash)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    project.deletedAt = new Date();
    await project.save();
    res.json({ message: 'Project moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id/restore — restore from trash
router.put('/:id/restore', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    project.deletedAt = null;
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id/permanent — permanent delete
router.delete('/:id/permanent', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:id/updates — progress update
router.post('/:id/updates', protect, async (req, res) => {
  try {
    const { progress, note, status } = req.body;
    if (progress === undefined) return res.status(400).json({ message: 'Progress value is required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });

    project.progress = progress;
    if (status) {
      if (status === 'completed' && project.status !== 'completed' && !project.endDate) {
        project.endDate = new Date();
      }
      project.status = status;
    }

    const lastUpdate = project.dailyUpdates[project.dailyUpdates.length - 1];
    const tenSecondsAgo = new Date(Date.now() - 10000);
    if (!lastUpdate || new Date(lastUpdate.date) < tenSecondsAgo) {
      project.dailyUpdates.push({ progress, note });
    }

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
