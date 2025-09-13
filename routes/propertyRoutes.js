const express = require('express');
const router = express.Router();
const multer = require('multer');
const propertyController = require('../controllers/propertyController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

/* ----------------------------------
   PUBLIC ROUTES (NO AUTH REQUIRED)
---------------------------------- */
router.get('/', propertyController.getProperties); // Get all verified properties
router.get('/:id', propertyController.getPropertyById); // ✅ This goes LAST of all GETs to avoid hijacking

/* ----------------------------------
   ADMIN ROUTES
---------------------------------- */
router.get('/pending', verifyToken, verifyAdmin, propertyController.getPendingProperties);
router.put('/verify/:id', verifyToken, verifyAdmin, propertyController.verifyProperty);
router.post('/:id/reject', verifyToken, verifyAdmin, propertyController.rejectProperty);

/* ----------------------------------
   LANDLORD ROUTES
---------------------------------- */
router.get('/landlord/:id', verifyToken, propertyController.getPropertiesByLandlord);

router.post(
  '/',
  verifyToken,
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'documents', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  propertyController.createProperty
);

router.put('/:id', verifyToken, propertyController.updateProperty);

module.exports = router;
