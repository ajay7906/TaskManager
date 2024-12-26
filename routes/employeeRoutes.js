const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Auth routes
router.post('/login', userController.login);

// Admin routes
router.post('/employees', [authMiddleware, adminAuthMiddleware], userController.createEmployee);
router.post('/tasks', [authMiddleware, adminAuthMiddleware], taskController.createTask);

// Employee routes
router.get('/tasks/my-tasks', authMiddleware, taskController.getEmployeeTasks);
router.patch('/tasks/:taskId/status', authMiddleware, taskController.updateTaskStatus);

module.exports = router;