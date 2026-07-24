import { UserRepository } from '../repositories/UserRepository.js';

const userRepo = new UserRepository();

export class UserController {
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userRepo.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      let organizerProfile = null;
      if (user.role === 'organizer') {
        organizerProfile = await userRepo.findOrganizerProfile(userId);
      }

      return res.json({
        user: user.toJSON(),
        organizerProfile
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
