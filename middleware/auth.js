const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('Authorization');
    
    // Check if no token
    if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    try {
        // Verify token
        const tokenValue = token.split(' ')[1];
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET || 'your-secret-key');
        
        // Add user from payload
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
