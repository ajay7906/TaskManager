// config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'A1ay79/6@.c60',
  database: 'contactDb',
  waitForConnections: true,
  connectionLimit: 10,     
  queueLimit: 0
});

module.exports = pool