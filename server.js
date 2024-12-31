// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const routes = require('./routes/employeeRoutes');

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use('/api', routes);

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
















require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Database pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'A1ay79/6@.c60',
    database: 'contactDb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}); 



const secret = process.env.JWT_SECRET || 'default_secret';


// Authentication middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        console.log(token);
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};   




// Routes

// Login




app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
       

        const [users] = await pool.execute(
            `SELECT * FROM admins WHERE email = ?`,
            [email]
        );
        console.log(users);
        

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials 1' });
        }

        const user = users[0];

        if (password.trim() !== user.password.trim()) {
            return res.status(401).json({ message: 'Invalid credentials 3' });
        }
        

        // Direct comparison (not secure for production)
        // if (password !== user.password) {
        //     return res.status(401).json({ message: 'Invalid credentials 2' });
        // }
       
        const token = jwt.sign(
            { id: user.admin_id }, // Use admin_id as the identifier
            secret,
            { expiresIn: '24h' }  
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});









// Create employee
app.post('/api/employees', authMiddleware, async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.execute(
            'INSERT INTO employees (first_name, last_name, email, password, phone, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, hashedPassword, phone, req.user.id]
        );

        res.status(201).json({
            message: 'Employee created successfully',
            employee_id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get employee tasks
app.get('/api/employee/tasks', authMiddleware, async (req, res) => {
    try {
        const [tasks] = await pool.execute(
            `SELECT t.*, et.assigned_at 
             FROM tasks t 
             JOIN employee_tasks et ON t.task_id = et.task_id 
             WHERE et.employee_id = ?`,
            [req.user.id]
        );

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create task
app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const { title, description, priority, deadline } = req.body;

        const [result] = await pool.execute(
            'INSERT INTO tasks (title, description, priority, deadline, created_by) VALUES (?, ?, ?, ?, ?)',
            [title, description, priority, deadline, req.user.id]
        );

        res.status(201).json({
            message: 'Task created successfully',
            task_id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Assign task








app.post('/api/tasks/assign', authMiddleware, async (req, res) => {
    try {
        const { task_id, employee_ids } = req.body;
        console.log(req.user.id, task_id, employee_ids);
        

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            for (const employee_id of employee_ids) {
                await connection.execute(
                    'INSERT INTO employee_tasks (employee_id, task_id, assigned_by) VALUES (?, ?, ?)',
                    [employee_id, task_id, req.user.id]
                );
            }

            await connection.commit();
            res.json({ message: 'Task assigned successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
















// Update task status
app.put('/api/tasks/status', authMiddleware, async (req, res) => {
    try {
        const { task_id, status } = req.body;

        await pool.execute(
            'UPDATE tasks SET status = ? WHERE task_id = ?',
            [status, task_id]
        );

        res.json({ message: 'Task status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
