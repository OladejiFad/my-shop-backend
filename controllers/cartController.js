const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Bargain = require('../models/bargainModel');
const GroupBuy = require('../models/groupBuyModel');

// GET /cart/:buyerPhone
const getCart = async (req, res) => {
  try {
    const { buyerPhone } = req.params;
    if (!buyerPhone) return res.status(400).json({ message: 'Buyer phone required' });

    const cart = await Cart.findOne({ buyerPhone }).populate('items.productId');
    if (!cart) return res.status(200).json({ buyerPhone, items: [] });

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /cart/add
const addOrUpdateCartItem = async (req, res) => {
  try {
    const { buyerPhone, productId, quantity, price, isBargain = false } = req.body;
    if (!buyerPhone || !productId || !quantity || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId).populate('seller');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ message: 'Not enough stock available' });

    let cart = await Cart.findOne({ buyerPhone });
    if (!cart) {
      cart = new Cart({ buyerPhone, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    const sellerId = product.seller?._id || null;
    const sellerLocation = product.seller?.location || '';

    if (existingItem) {
      existingItem.quantity = quantity;
      existingItem.price = price;
      existingItem.isBargain = isBargain;
      existingItem.sellerId = sellerId;
      existingItem.sellerLocation = sellerLocation;
    } else {
      cart.items.push({
        productId,
        productName: product.name,
        sellerId,
        sellerLocation,
        quantity,
        price,
        imageUrl: product.imageUrl,
        isBargain,
        bargainId: null,      // ✅ Add this
        groupBuyId: null,     // ✅ Add this
      });

    }

    cart.updatedAt = new Date();
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /cart/remove/:buyerPhone/:productId
const removeCartItem = async (req, res) => {
  try {
    const { buyerPhone, productId } = req.params;
    const cart = await Cart.findOne({ buyerPhone });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
    await cart.save();

    res.json({ message: 'Item removed', cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /cart/clear
const clearCart = async (req, res) => {
  try {
    const { buyerPhone } = req.body;
    if (!buyerPhone) return res.status(400).json({ message: 'Buyer phone required' });

    await Cart.findOneAndDelete({ buyerPhone });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /cart/sync/:buyerPhone
const syncCart = async (req, res) => {
  try {
    const { buyerPhone } = req.params;
    const { cartItems } = req.body;

    if (!buyerPhone) {
      return res.status(400).json({ error: 'buyerPhone is required to sync cart' });
    }

    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'cartItems must be an array' });
    }

    let existingCart = await Cart.findOne({ buyerPhone });

    const syncedItems = [];

    // ✅ Fetch accepted bargains not yet added to cart
    const bargains = await Bargain.find({
      buyerPhone,
      status: 'accepted',
      addedToCart: false,
    });

    for (const bargain of bargains) {
      const lastOffer = bargain.buyerOffers.at(-1);
      if (!lastOffer) continue;

      for (const item of lastOffer.items) {
        syncedItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: bargain.acceptedOfferPrice || item.productPrice,
          imageUrl: item.imageUrl || '',
          isBargain: true,
          isGroupBuy: false,
          bargainId: bargain._id.toString(), // ✅ ADD THIS
          sellerId: item.sellerId || null,
          sellerLocation: item.sellerLocation || '',
        });
      }


      // Mark bargain as used
      bargain.addedToCart = true;
      await bargain.save();
    }

    // ✅ Fetch group buys not yet synced
    const groupBuys = await GroupBuy.find({ 'paidParticipants.phone': buyerPhone })
      .populate('productId');

    for (const group of groupBuys) {
      const product = group.productId;
      if (!product) continue;

      const participant = group.paidParticipants.find(p =>
        p.phone === buyerPhone && !p.addedToCart && !p.ordered
      );

      if (participant) {
        syncedItems.push({
          productId: product._id,
          productName: product.name,
          quantity: participant.quantity,
          price: group.pricePerUnit,
          imageUrl: product.images?.[0] || product.imageUrl || '',
          isBargain: false,
          isGroupBuy: true,
          groupBuyId: group._id.toString(),
          sellerId: product.seller?._id || product.seller,
          sellerLocation: product.seller?.location || '',
        });

        participant.addedToCart = true;
        await group.save();
      }
    }

    // ✅ Map frontend cartItems
    const mappedIncomingItems = await Promise.all(
      cartItems.map(async (i) => {
        let sellerLocation = i.sellerLocation || '';
        if (!sellerLocation && i.sellerId) {
          const product = await Product.findById(i.productId).populate('seller');
          sellerLocation = product?.seller?.location || '';
        }

        return {
          productId: i.productId.toString(),
          productName: i.productName || 'Unknown',
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl || '',
          isBargain: i.isBargain || false,
          isGroupBuy: i.isGroupBuy || false,
          bargainId: i.bargainId || null,      // ✅ Add this
          groupBuyId: i.groupBuyId || null,    // ✅ Already working
          sellerId: i.sellerId || null,
          sellerLocation,
        };

      })
    );

    // ✅ Merge all items
    const mergeItems = (incoming, existing, synced) => {
      const map = new Map();

      const makeKey = (item) => {
        return [
          item.productId?.toString(),
          item.isBargain ? 'bargain' : '',
          item.isGroupBuy ? 'groupbuy' : '',
          item.bargainId || '',
          item.groupBuyId || '',
        ].join('|');
      };

      [...synced, ...existing, ...incoming].forEach((item) => {
        const key = makeKey(item);
        map.set(key, item);
      });

      return Array.from(map.values());
    };


    const mergedItems = mergeItems(
      mappedIncomingItems,
      existingCart ? existingCart.items : [],
      syncedItems
    );

    const updatedCart = await Cart.findOneAndUpdate(
      { buyerPhone },
      { items: mergedItems, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json(updatedCart);
  } catch (err) {
    console.error('Error syncing cart:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCart,
  addOrUpdateCartItem,
  removeCartItem,
  clearCart,
  syncCart,
};
