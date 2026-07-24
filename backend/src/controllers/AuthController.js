import authService from '../services/AuthenticationService.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, name, role, companyName, bio, website } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      if (role && !['customer', 'organizer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid user role specified' });
      }

      const user = await authService.register({
        email,
        password,
        name,
        role,
        companyName,
        bio,
        website
      });

      return res.status(201).json({
        message: 'Registration successful',
        user: user.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await authService.login(email, password);

      // Return refresh token as cookie (best practice) or inside response body
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        message: 'Login successful',
        user: result.user,
        organizerProfile: result.organizerProfile,
        accessToken: result.tokens.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user.id;
      await authService.logout(userId);
      
      res.clearCookie('refreshToken');
      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      // Look for token in cookies or body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const tokens = await authService.refresh(refreshToken);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      await authService.requestPasswordReset(email);
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      await authService.resetPassword(token, newPassword);
      return res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
