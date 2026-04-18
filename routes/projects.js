import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/stats
// @desc    Get project statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const activeProjects = await Project.countDocuments({ user: req.user._id, status: 'active' });
    const completedProjects = await Project.countDocuments({ user: req.user._id, status: 'completed' });
    const onHoldProjects = await Project.countDocuments({ user: req.user._id, status: 'on-hold' });
    const totalProjects = await Project.countDocuments({ user: req.user._id });

    res.json({
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalProjects
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user owns the project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post('/', [
  protect,
  body('title').notEmpty().withMessage('Title is required'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      status,
      progress,
      githubUrl,
      backendUrl,
      frontendUrl,
      liveLinks,
      tags,
      startDate,
      endDate
    } = req.body;

    const project = await Project.create({
      user: req.user._id,
      title,
      description,
      category,
      status,
      progress,
      githubUrl,
      backendUrl,
      frontendUrl,
      liveLinks,
      tags,
      startDate,
      endDate
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private
router.put('/:id', [
  protect,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
], async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      status,
      progress,
      githubUrl,
      backendUrl,
      frontendUrl,
      liveLinks,
      tags,
      startDate,
      endDate
    } = req.body;

    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user owns the project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        status,
        progress,
        githubUrl,
        backendUrl,
        frontendUrl,
        liveLinks,
        tags,
        startDate,
        endDate
      },
      { new: true, runValidators: true }
    );

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user owns the project
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project removed' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/updates
// @desc    Add a daily progress update
// @access  Private
router.post('/:id/updates', protect, async (req, res) => {
  try {
    const { progress, note, status } = req.body;
    
    if (progress === undefined) {
      return res.status(400).json({ message: 'Progress value is required' });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    project.progress = progress;
    if (status) {
      // Auto set endDate when first marked completed
      if (status === 'completed' && project.status !== 'completed' && !project.endDate) {
        project.endDate = new Date();
      }
      project.status = status;
    }

    // Prevent duplicate entries within 10 seconds
    const lastUpdate = project.dailyUpdates[project.dailyUpdates.length - 1];
    const tenSecondsAgo = new Date(Date.now() - 10000);
    if (!lastUpdate || new Date(lastUpdate.date) < tenSecondsAgo) {
      project.dailyUpdates.push({ progress, note });
    }
    
    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Add update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;