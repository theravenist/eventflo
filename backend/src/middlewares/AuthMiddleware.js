import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_2026';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Expecting 'Bearer <token>'
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token missing or invalid format' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Access token is expired or invalid' });
      }

      req.user = decoded; // { id, email, role, name }
      next();
    });
  } else {
    // If no header, they are treated as a visitor
    // Check if visitor is allowed for the endpoint, otherwise return 401
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Role authorization checks
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: role '${req.user.role}' does not have permission to access this resource` 
      });
    }

    next();
  };
};
