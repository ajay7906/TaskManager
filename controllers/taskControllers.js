const taskController = {
    async createTask(req, res) {
      try {
        const {
          title,
          description,
          categoryId,
          priority,
          deadline,
          estimatedHours,
          assigneeId
        } = req.body;
  
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
  
          // Create task
          const [taskResult] = await connection.execute(
            `INSERT INTO tasks 
             (title, description, category_id, priority, status, created_by, deadline, estimated_hours) 
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
            [title, description, categoryId, priority, req.user.userId, deadline, estimatedHours]
          );
  
          // Create task assignment if assignee specified
          if (assigneeId) {
            await connection.execute(
              `INSERT INTO task_assignments 
               (task_id, employee_id, assigned_by, status) 
               VALUES (?, ?, ?, 'assigned')`,
              [taskResult.insertId, assigneeId, req.user.userId]
            );
          }
  
          await connection.commit();
          res.status(201).json({ message: 'Task created successfully' });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    },
  
    async updateTaskStatus(req, res) {
      try {
        const { taskId } = req.params;
        const { status } = req.body;
  
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
  
          // Update task status
          await connection.execute(
            'UPDATE tasks SET status = ? WHERE task_id = ?',
            [status, taskId]
          );
  
          // Record in history
          await connection.execute(
            `INSERT INTO task_history 
             (task_id, changed_by, change_type, old_value, new_value) 
             SELECT ?, ?, 'status', status, ? 
             FROM tasks WHERE task_id = ?`,
            [taskId, req.user.userId, status, taskId]
          );
  
          await connection.commit();
          res.json({ message: 'Task status updated successfully' });
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    },
  
    async getEmployeeTasks(req, res) {
      try {
        const [tasks] = await pool.execute(
          `SELECT t.*, tc.name as category_name, 
                  ta.status as assignment_status, 
                  ta.started_at, ta.completed_at
           FROM tasks t
           JOIN task_assignments ta ON t.task_id = ta.task_id
           LEFT JOIN task_categories tc ON t.category_id = tc.category_id
           WHERE ta.employee_id = (
             SELECT employee_id FROM employee_profiles WHERE user_id = ?
           )`,
          [req.user.userId]
        );
  
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    }
  };
  
  module.exports = taskController;