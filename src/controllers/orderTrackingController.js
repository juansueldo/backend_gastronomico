import OrderTrackingService from '../services/orderTrackingService.js';

class OrderTrackingController {
  static async getByToken(req, res) {
    try {
      const result = await OrderTrackingService.getPublicTrackingByToken(req.params.token);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: result.error });
      }
      return res.status(200).json(result.data);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export default OrderTrackingController;
