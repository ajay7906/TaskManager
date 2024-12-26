
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const userController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = users[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      await pool.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
        [user.user_id]
      );

      const token = jwt.sign(
        { 
          userId: user.user_id, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, role: user.role });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  async createEmployee(req, res) {
    try {
      const { 
        username, 
        password, 
        email, 
        fullName, 
        departmentId, 
        jobTitle, 
        skills 
      } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Create user
        const [userResult] = await connection.execute(
          `INSERT INTO users (username, password_hash, email, full_name, role) 
           VALUES (?, ?, ?, ?, 'employee')`,
          [username, hashedPassword, email, fullName]
        );

        // Create employee profile
        await connection.execute(
          `INSERT INTO employee_profiles 
           (user_id, department_id, job_title, skills, hire_date) 
           VALUES (?, ?, ?, ?, CURRENT_DATE)`,
          [userResult.insertId, departmentId, jobTitle, JSON.stringify(skills)]
        );

        await connection.commit();
        res.status(201).json({ message: 'Employee created successfully' });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = userController;
