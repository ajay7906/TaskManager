const adminAuthMiddleware = async (req, res, next) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    } catch (error) {
      res.status(403).json({ message: 'Access denied' });
    }
  };
  
  module.exports = adminAuthMiddleware;