const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { Driver } = require('../models');
const { cacheGet } = require('../config/redis');

router.use(protect);

router.get('/driver/:driverId', async (req, res) => {
  const cached = await cacheGet(`driver:location:${req.params.driverId}`);
  if (cached) return res.json({ success: true, data: cached });

  const driver = await Driver.findOne({ where: { userId: req.params.driverId } });
  res.json({
    success: true,
    data: { lat: driver?.currentLat || null, lng: driver?.currentLng || null },
  });
});

module.exports = router;
