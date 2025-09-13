const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');


router.get('/', verifyToken, verifyAdmin, complaintController.getAllComplaints);
router.put('/:id', verifyToken, verifyAdmin, complaintController.resolveComplaint);


router.post('/', complaintController.createComplaint);
// Allow users (buyers/sellers) to view their complaints
router.get('/user/:userId', complaintController.getUserComplaints);



module.exports = router;
