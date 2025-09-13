const mongoose = require('mongoose');
const GroupBuy = require('../models/groupBuyModel');
const Cart = require('../models/cartModel');

const BACKEND_URL = 'http://172.20.10.2:5000';

function getFullImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${BACKEND_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

// Create group buy
exports.createGroupBuy = async (req, res) => {
  try {
    const { title, description, pricePerUnit, minParticipants, deadline, productId } = req.body;

    const newGroup = new GroupBuy({
      sellerId: req.user._id || req.user.id,
      productId: new mongoose.Types.ObjectId(productId),
      title,
      description,
      pricePerUnit,
      minParticipants,
      deadline,
      participants: [],
      paidParticipants: [],
      visible: true,
      status: 'open',
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all public group buys
exports.getPublicGroupBuys = async (req, res) => {
  try {
    const now = new Date();
    const { sellerId } = req.query;

    const filter = {
      visible: true,
      deadline: { $gte: now },
    };

    if (sellerId) {
      filter.sellerId = sellerId;
    }

    const groups = await GroupBuy.find(filter)
      .populate('productId', 'name price images')
      .sort({ deadline: 1 });


    const enriched = groups.map(group => {
      const joinedQuantity = group.participants.reduce((sum, p) => sum + (p.quantity || 0), 0);
      return {
        ...group.toObject({ virtuals: true }),
        joinedQuantity,
        isFull: joinedQuantity >= group.minParticipants,
        productId: {
          ...group.productId?.toObject(),
          images: (group.productId?.images || []).map(getFullImageUrl)
        }
      };
    });

    res.set('Cache-Control', 'no-store');
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Join a group buy
exports.joinGroupBuy = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, phone, quantity } = req.body;

    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });

    const group = await GroupBuy.findById(groupId).populate('productId', 'name price images');
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    if (group.participants.some(p => p.phone === phone)) {
      return res.status(400).json({ error: 'Already joined' });
    }

    const joinedQuantity = group.participants.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const slotsLeft = group.minParticipants - joinedQuantity;
    if (slotsLeft <= 0) return res.status(400).json({ error: 'Group buy is full' });
    if (quantity > slotsLeft) return res.status(400).json({ error: `Only ${slotsLeft} slots left` });

    group.participants.push({ name, phone, quantity });
    await group.save();

    const isFull = group.participants.reduce((sum, p) => sum + p.quantity, 0) >= group.minParticipants;
    if (isFull && group.status === 'open') {
      group.status = 'full';
      await group.save();
    }

    res.status(200).json({
      message: 'Joined successfully',
      group: {
        ...group.toObject(),
        isFull,
        joinedQuantity: group.participants.reduce((sum, p) => sum + p.quantity, 0),
        productId: {
          ...group.productId?.toObject(),
          images: (group.productId?.images || []).map(getFullImageUrl)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Seller views their group buys
exports.getSellerGroupBuys = async (req, res) => {
  try {
    const sellerId = req.user._id || req.user.id;
    const groups = await GroupBuy.find({ sellerId }).sort({ createdAt: -1 }).populate('productId', 'name price images');

    const enriched = groups.map(group => {
      const joinedQuantity = group.participants.reduce((sum, p) => sum + p.quantity, 0);
      return {
        ...group.toObject(),
        joinedQuantity,
        isFull: joinedQuantity >= group.minParticipants,
        productId: {
          ...group.productId?.toObject(),
          images: (group.productId?.images || []).map(getFullImageUrl)
        }
      };
    });

    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update group buy
exports.updateGroupBuy = async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const group = await GroupBuy.findById(groupBuyId);
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    if (group.participants.length > 0) {
      return res.status(403).json({ error: 'Cannot edit a group buy with participants' });
    }

    Object.assign(group, req.body);
    await group.save();
    res.status(200).json({ message: 'Group buy updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete group buy
exports.deleteGroupBuy = async (req, res) => {
  try {
    await GroupBuy.findByIdAndDelete(req.params.groupBuyId);
    res.status(200).json({ message: 'Group buy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle visibility
exports.toggleVisibility = async (req, res) => {
  try {
    const group = await GroupBuy.findById(req.params.groupBuyId);
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    group.visible = req.body.visible;
    await group.save();
    res.status(200).json({ message: 'Visibility updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark as ready
exports.markGroupBuyAsReady = async (req, res) => {
  try {
    const group = await GroupBuy.findById(req.params.groupBuyId);
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    group.status = 'ready';
    await group.save();
    res.status(200).json({ message: 'Group buy marked as ready' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Buyer pays
exports.payForGroupBuy = async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const { phone, quantity } = req.body;

    const group = await GroupBuy.findById(groupBuyId);
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    if (group.paidParticipants.find(p => p.phone === phone)) {
      return res.status(400).json({ error: 'Already paid' });
    }

    const match = group.participants.find(p => p.phone === phone);
    if (!match) return res.status(400).json({ error: 'Join the group before paying' });

    group.paidParticipants.push({
      phone,
      quantity: quantity || match.quantity || 1,
      paidAt: new Date(),
    });

    await group.save();
    res.status(200).json({ message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add to cart from group buy
exports.addToCartFromGroupBuy = async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const { phone } = req.body;

    const group = await GroupBuy.findById(groupBuyId).populate({
      path: 'productId',
      populate: { path: 'seller' },
    });
    if (!group) return res.status(404).json({ error: 'Group buy not found' });

    const paid = group.paidParticipants.find(p => p.phone === phone);
    if (!paid) return res.status(400).json({ error: 'Not paid yet' });
    if (paid.addedToCart) return res.status(400).json({ error: 'Already in cart' });


    let cart = await Cart.findOne({ buyerPhone: phone });
    if (!cart) cart = new Cart({ buyerPhone: phone, items: [] });

    const alreadyInCart = cart.items.find(item =>
      item.productId.toString() === group.productId._id.toString() && item.isGroupBuy
    );
    if (alreadyInCart) return res.status(400).json({ error: 'Already in cart' });

    cart.items.push({
      productId: group.productId._id,
      productName: group.productId.name,
      quantity: paid.quantity,
      price: group.pricePerUnit,
      imageUrl: getFullImageUrl(group.productId.images?.[0] || ''),
      sellerId: group.productId.seller?._id,
      sellerLocation: group.productId.seller?.location || '',
      isGroupBuy: true,
    });

    paid.addedToCart = true;
    paid.ordered = true;
    await Promise.all([group.save(), cart.save()]);

    res.status(200).json({ message: 'Added to cart', cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get paid but unused group buy items
// Get paid but unused group buy items
exports.getSuccessfulGroupBuyItems = async (req, res) => {
  try {
    const { buyerPhone } = req.params;

    const groups = await GroupBuy.find({
      'paidParticipants': {
        $elemMatch: {
          phone: buyerPhone,
          addedToCart: { $ne: true },
          ordered: { $ne: true }
        }
      }
    }).populate('productId');

    const items = [];

    for (const group of groups) {
      const paid = group.paidParticipants.find(p =>
        p.phone === buyerPhone && !p.addedToCart && !p.ordered
      );

      if (!paid || !group.productId) continue;

      items.push({
        productId: group.productId._id,
        productName: group.productId.name,
        price: group.pricePerUnit,
        quantity: paid.quantity,
        imageUrl: getFullImageUrl(group.productId.images?.[0] || group.productId.imageUrl || ''),
        sellerId: group.productId.seller?._id || group.productId.seller,
        groupBuyId: group._id.toString(),
      });
    }

    return res.status(200).json({ items });
  } catch (err) {
    console.error('getSuccessfulGroupBuyItems error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Mark group buys as used
exports.markGroupBuysAsUsed = async (req, res) => {
  const { groupBuyIds, buyerPhone } = req.body;

  if (!Array.isArray(groupBuyIds) || groupBuyIds.length === 0 || !buyerPhone) {
    return res.status(400).json({ message: 'groupBuyIds and buyerPhone are required' });
  }

  try {
    const GroupBuy = require('../models/groupBuyModel');

    await Promise.all(groupBuyIds.map(async (groupId) => {
      const group = await GroupBuy.findById(groupId);
      if (!group) return;

      let modified = false;

      group.paidParticipants.forEach(p => {
        if (p.phone === buyerPhone && !p.addedToCart && !p.ordered) {
          p.addedToCart = true;
          p.ordered = true;
          modified = true;
        }
      });

      if (modified) await group.save();
    }));

    res.status(200).json({ message: 'Group buys marked as used' });
  } catch (error) {
    console.error('Error marking group buys as used:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




