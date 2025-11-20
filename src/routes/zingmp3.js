/**
 * ZingMp3 Routes - Direct API endpoints
 * Mount tại /api/zing
 */
const express = require('express');
const zingController = require('../controllers/zingmp3Controller');

const router = express.Router();

// Song APIs
router.get('/song', zingController.getSong);
router.get('/infosong', zingController.getInfoSong);
router.get('/lyric', zingController.getLyric);

// Home & Charts
router.get('/home', zingController.getHome);
router.get('/top100', zingController.getTop100);
router.get('/charthome', zingController.getChartHome);
router.get('/newreleasechart', zingController.getNewReleaseChart);

// Search
router.get('/search', zingController.search);
router.get('/suggest', zingController.getSuggestKeyword);

// Artist
router.get('/artist', zingController.getArtist);
router.get('/artistsong', zingController.getArtistSong);

// Playlist
router.get('/detailplaylist', zingController.getDetailPlaylist);

// Video/MV
router.get('/listmv', zingController.getListMV);
router.get('/categorymv', zingController.getCategoryMV);
router.get('/video', zingController.getVideo);

module.exports = router;


