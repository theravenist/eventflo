import adminService from '../services/AdminService.js';

export class AdminController {
  async getDashboard(req, res, next) {
    try {
      const stats = await adminService.getAdminDashboard();
      return res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const result = await adminService.listUsers({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['customer', 'organizer', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required' });
      }

      const updated = await adminService.updateUserRole(userId, role);
      return res.json({
        message: 'User role updated successfully',
        user: updated.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async removeEvent(req, res, next) {
    try {
      const { id } = req.params;
      await adminService.removeEvent(id);
      return res.json({ message: 'Event successfully removed by administrator' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
