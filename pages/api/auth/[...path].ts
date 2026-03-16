import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const subpath = Array.isArray(path) ? path.join('/') : path;
  
  try {
    // Mock auth responses - no backend dependency
    if (subpath === 'me') {
      // Mock user profile
      const mockUser = {
        success: true,
        data: {
          user: {
            id: 'user_demo',
            address: null,
            email: null,
            name: 'Demo User',
            avatar: null,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
              theme: 'dark',
              notifications: true,
              language: 'en'
            }
          }
        }
      };
      return res.status(200).json(mockUser);
    }
    
    if (subpath === 'login') {
      // Mock login response
      const mockLogin = {
        success: true,
        data: {
          token: 'mock_jwt_token_' + Date.now(),
          user: {
            id: 'user_demo',
            address: req.body?.address || null,
            name: 'Demo User',
            role: 'user'
          },
          expiresIn: 86400
        }
      };
      return res.status(200).json(mockLogin);
    }
    
    if (subpath === 'logout') {
      // Mock logout response
      const mockLogout = {
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      };
      return res.status(200).json(mockLogout);
    }
    
    if (subpath === 'register') {
      // Mock register response
      const mockRegister = {
        success: true,
        data: {
          user: {
            id: 'user_' + Date.now(),
            address: req.body?.address || null,
            name: req.body?.name || 'New User',
            role: 'user',
            createdAt: new Date().toISOString()
          },
          token: 'mock_jwt_token_' + Date.now()
        }
      };
      return res.status(201).json(mockRegister);
    }
    
    // Default response for unknown auth endpoints
    res.status(404).json({ 
      success: false, 
      error: 'Auth endpoint not found',
      message: `Unknown auth endpoint: ${subpath}`
    });
    
  } catch (error) {
    console.error('Auth API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication service unavailable',
      message: 'Please try again later'
    });
  }
}
