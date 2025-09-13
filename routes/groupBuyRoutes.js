const express = require('express');
const router = express.Router();
const groupBuyController = require('../controllers/groupBuyController');
const { verifyToken, isSeller } = require('../middleware/authMiddleware');

// ✅ Buyers
router.get('/public', groupBuyController.getPublicGroupBuys);
router.post('/join/:groupId', groupBuyController.joinGroupBuy);
router.post('/pay/:groupBuyId', groupBuyController.payForGroupBuy);
router.post('/:groupBuyId/add-to-cart', groupBuyController.addToCartFromGroupBuy);
router.get('/successful/:buyerPhone', groupBuyController.getSuccessfulGroupBuyItems);
router.post('/mark-used', groupBuyController.markGroupBuysAsUsed);

// ✅ Get eligible group buy items for a buyer
router.get('/eligible/:buyerPhone', async (req, res) => {
  const { buyerPhone } = req.params;
  try {
    const groupBuys = await require('../models/groupBuyModel').find({
      'paidParticipants.phone': buyerPhone,
      'paidParticipants.ordered': false,
    }).populate('productId');

    const items = [];

    for (const gb of groupBuys) {
      const participant = gb.paidParticipants.find(p => p.phone === buyerPhone && !p.ordered);
      if (!participant || !gb.productId) continue;

      items.push({
        productId: gb.productId._id,
        productName: gb.productId.name,
        quantity: participant.quantity,
        price: gb.pricePerUnit,
        imageUrl: gb.productId.imageUrl || '',
        sellerId: gb.productId.seller,
        sellerLocation: '', // Optional: populate product.seller if needed
        groupBuyId: gb._id,
      });
    }

    res.status(200).json({ items });
  } catch (err) {
    console.error('❌ Error fetching group buy items:', err);
    res.status(500).json({ message: 'Failed to fetch group buy items' });
  }
});

// ✅ Sellers
router.post('/create', verifyToken, isSeller, groupBuyController.createGroupBuy);
router.get('/seller', verifyToken, isSeller, groupBuyController.getSellerGroupBuys);
router.put('/:groupBuyId', verifyToken, isSeller, groupBuyController.updateGroupBuy);
router.delete('/:groupBuyId', verifyToken, isSeller, groupBuyController.deleteGroupBuy);
router.patch('/visibility/:groupBuyId', verifyToken, isSeller, groupBuyController.toggleVisibility);
router.patch('/mark-ready/:groupBuyId', verifyToken, isSeller, groupBuyController.markGroupBuyAsReady); // ✅ Mark ready

module.exports = router;
