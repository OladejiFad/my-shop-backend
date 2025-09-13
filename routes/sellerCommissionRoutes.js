const express = require("express");
const router = express.Router();

const {
  getSellerAccountAndCommission,
} = require("../controllers/getSellerAccountAndCommission");


const { verifyAdmin } = require("../middleware/authMiddleware");

router.get("/orders/:orderId/seller-commissions", verifyAdmin, getSellerAccountAndCommission);

module.exports = router;
