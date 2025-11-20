/**
 * Home Controller - ZingMp3 Home, Charts, Discovery
 */
const zingmp3Service = require('../../services/zingmp3Service');
const formatResponse = require('../../utils/formatResponse');

class HomeController {
  /**
   * GET /api/v1/user/home
   * Lấy dữ liệu trang chủ ZingMp3
   */
  async getHome(req, res, next) {
    try {
      const homeData = await zingmp3Service.getHome();
      res.json(formatResponse.success(homeData));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/charts/top100
   * Lấy Top 100
   */
  async getTop100(req, res, next) {
    try {
      const top100Data = await zingmp3Service.getTop100();
      res.json(formatResponse.success(top100Data));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/charts/home
   * Lấy bảng xếp hạng trang chủ (RTChart)
   */
  async getChartHome(req, res, next) {
    try {
      const chartData = await zingmp3Service.getChartHome();
      res.json(formatResponse.success(chartData));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/user/charts/new-release
   * Lấy bảng xếp hạng bài hát mới phát hành
   */
  async getNewReleaseChart(req, res, next) {
    try {
      const newReleaseData = await zingmp3Service.getNewReleaseChart();
      res.json(formatResponse.success(newReleaseData));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HomeController();

