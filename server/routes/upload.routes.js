const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { uploadDeliveryProof, uploadDocuments } = require('../middleware/upload.middleware');

router.use(protect);

router.post('/delivery-proof', uploadDeliveryProof.single('proof'), (req, res) => {
  if (!req.file) throw new Error('No file uploaded');
  res.json({ success: true, data: { url: req.file.path } });
});

router.post('/document', uploadDocuments.single('document'), (req, res) => {
  if (!req.file) throw new Error('No file uploaded');
  res.json({ success: true, data: { url: req.file.path } });
});

module.exports = router;
