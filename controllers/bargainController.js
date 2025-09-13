const mongoose = require('mongoose');
const Bargain = require('../models/bargainModel');
const Product = require('../models/productModel');

const BACKEND_URL = 'http://172.20.10.2:5000';

// ✅ Clean and build full image URLs
function getFullImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${BACKEND_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}


function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Items array is required and cannot be empty';
  }
  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
      return 'Each item must have productId and positive quantity';
    }
  }
  return null;
}

function isBargainExpired(bargain) {
  const expiryDays = 7;
  const createdAt = bargain.createdAt || bargain._id.getTimestamp();
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  return new Date() > expiryDate;
}

// ✅ Clean image URLs in all offers
function cleanImageUrls(bargains) {
  bargains.forEach(bargain => {
    [...(bargain.buyerOffers || []), ...(bargain.sellerOffers || [])].forEach(offer => {
      offer.items.forEach(item => {
        const imagePath = item.product?.imageUrl || item.product?.images?.[0] || '';
        item.product.imageUrl = getFullImageUrl(imagePath);
      });
    });
  });
}


// ========== START BARGAIN ==========
exports.startOrContinueBargain = async (req, res) => {
  const { items, totalOfferedPrice, buyerName, buyerPhone, note } = req.body;


  if (!buyerName || !buyerPhone) {
    return res.status(400).json({ message: 'buyerName and buyerPhone are required' });
  }

  const itemsError = validateItems(items);
  if (itemsError) return res.status(400).json({ message: itemsError });

  if (typeof totalOfferedPrice !== 'number' || totalOfferedPrice <= 0) {
    return res.status(400).json({ message: 'totalOfferedPrice must be a positive number' });
  }

  try {
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).populate('seller');

    if (products.length !== items.length) {
      return res.status(400).json({ message: 'Some products not found' });
    }

    for (const item of items) {
      const product = products.find(p => p._id.equals(item.productId));
      if (!product.isBargainable) {
        return res.status(400).json({ message: `Product '${product.name}' is not bargainable` });
      }
      if (item.quantity > product.stock) {
        return res.status(400).json({ message: `Insufficient stock for '${product.name}'` });
      }
    }

    const sellerId = products[0].seller._id;
    const sameSeller = products.every(p => p.seller._id.equals(sellerId));
    if (!sameSeller) {
      return res.status(400).json({ message: 'All items must belong to the same seller' });
    }

    const maxPrice = items.reduce((sum, item) => {
      const product = products.find(p => p._id.equals(item.productId));
      return sum + product.price * item.quantity;
    }, 0);

    if (totalOfferedPrice > maxPrice) {
      return res.status(400).json({
        message: `totalOfferedPrice cannot exceed combined price of products (${maxPrice})`,
      });
    }

    const formattedItems = items.map(i => ({
      product: i.productId,
      quantity: i.quantity,
    }));

    const bargain = new Bargain({
      seller: sellerId,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      note: (note || '').trim(),
      buyerOffers: [{
        items: formattedItems,
        totalOfferedPrice,
        time: new Date(),
      }],
      status: 'pending',
    });


    await bargain.save();
    res.status(200).json({ message: 'Offer sent', bargain });
  } catch (err) {
    console.error('Bargain error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== RESPOND TO BARGAIN (SELLER) ==========
exports.respondToBargain = async (req, res) => {
  const { bargainId, items, totalCounterPrice, action } = req.body;
  const sellerId = req.user._id;

  try {
    const bargain = await Bargain.findById(bargainId);
    if (!bargain || !bargain.seller.equals(sellerId)) {
      return res.status(404).json({ message: 'Bargain not found or unauthorized' });
    }

    if (bargain.status !== 'pending') {
      return res.status(400).json({ message: `Cannot respond to a bargain with status '${bargain.status}'` });
    }

    if (isBargainExpired(bargain)) {
      bargain.status = 'expired';
      await bargain.save();
      return res.status(400).json({ message: 'Bargain has expired' });
    }

    if (action === 'accept') {
      bargain.status = 'accepted';

      // ✅ seller is accepting the buyer's most recent offer
      const lastBuyer = bargain.buyerOffers?.[bargain.buyerOffers.length - 1];
      if (lastBuyer) {
        bargain.acceptedPrice = lastBuyer.totalOfferedPrice;
      }

    } else if (action === 'reject') {
      bargain.status = 'rejected';

    } else if (action === 'counter') {
      const itemsError = validateItems(items);
      if (itemsError) return res.status(400).json({ message: itemsError });

      if (typeof totalCounterPrice !== 'number' || totalCounterPrice <= 0) {
        return res.status(400).json({ message: 'totalCounterPrice must be a positive number' });
      }

      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds } });

      for (const item of items) {
        const product = products.find(p => p._id.equals(item.productId));
        if (!product || item.quantity > product.stock) {
          return res.status(400).json({ message: `Invalid or insufficient stock for product` });
        }
      }

      const maxPrice = items.reduce((sum, item) => {
        const product = products.find(p => p._id.equals(item.productId));
        return sum + product.price * item.quantity;
      }, 0);

      if (totalCounterPrice > maxPrice) {
        return res.status(400).json({ message: 'Counter price exceeds maximum value' });
      }

      if (!Array.isArray(bargain.sellerOffers)) bargain.sellerOffers = [];
      if (bargain.sellerOffers.length >= 5) {
        return res.status(400).json({ message: 'Seller offer limit reached' });
      }

      bargain.sellerOffers.push({
        items: items.map(i => ({
          product: i.productId,
          quantity: i.quantity,
        })),
        totalCounterPrice,
        time: new Date(), // ensure time is stored
      });
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await bargain.save();
    res.status(200).json({
      message: 'Bargain updated',
      bargainId: bargain._id,
      status: bargain.status,
      lastUpdated: bargain.updatedAt,
    });

  } catch (err) {
    console.error('Respond to bargain error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== BUYER RESPOND ==========

exports.buyerRespondToBargain = async (req, res) => {
  const { bargainId, items, totalCounterPrice, action } = req.body;

  try {
    const bargain = await Bargain.findById(bargainId);
    if (!bargain) return res.status(404).json({ message: 'Bargain not found' });

    if (bargain.status !== 'pending') {
      return res.status(400).json({ message: `Cannot respond to a bargain with status '${bargain.status}'` });
    }

    if (isBargainExpired(bargain)) {
      bargain.status = 'expired';
      await bargain.save();
      return res.status(400).json({ message: 'Bargain has expired' });
    }

    if (action === 'accept') {
      bargain.status = 'accepted';

      // ✅ buyer is accepting the seller's most recent counter
      const lastSeller = bargain.sellerOffers?.[bargain.sellerOffers.length - 1];
      if (lastSeller) {
        bargain.acceptedPrice = lastSeller.totalCounterPrice;
      }

    } else if (action === 'reject') {
      bargain.status = 'rejected';

    } else if (action === 'counter') {
      const itemsError = validateItems(items);
      if (itemsError) return res.status(400).json({ message: itemsError });

      if (typeof totalCounterPrice !== 'number' || totalCounterPrice <= 0) {
        return res.status(400).json({ message: 'totalCounterPrice must be a positive number' });
      }

      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds } });

      for (const item of items) {
        const product = products.find(p => p._id.equals(item.productId));
        if (!product || item.quantity > product.stock) {
          return res.status(400).json({ message: `Invalid or insufficient stock for product` });
        }
      }

      const maxPrice = items.reduce((sum, item) => {
        const product = products.find(p => p._id.equals(item.productId));
        return sum + product.price * item.quantity;
      }, 0);

      if (totalCounterPrice > maxPrice) {
        return res.status(400).json({ message: 'Counter price exceeds maximum value' });
      }

      if (!Array.isArray(bargain.buyerOffers)) bargain.buyerOffers = [];
      if (bargain.buyerOffers.length >= 5) {
        return res.status(400).json({ message: 'Buyer offer limit reached' });
      }

      bargain.buyerOffers.push({
        items: items.map(i => ({ product: i.productId, quantity: i.quantity })),
        totalOfferedPrice: totalCounterPrice,
        note: (req.body.note || '').trim(),
        time: new Date(),
      });

    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await bargain.save();
    res.status(200).json({
      message: 'Bargain updated',
      bargainId: bargain._id,
      status: bargain.status,
      lastUpdated: bargain.updatedAt,
    });

  } catch (err) {
    console.error('Buyer respond to bargain error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== GET SELLER BARGAINS ==========
exports.getSellerBargains = async (req, res) => {
  try {
    const bargains = await Bargain.find({ seller: req.user._id })
      .populate('buyerOffers.items.product', 'name price imageUrl')
      .populate('sellerOffers.items.product', 'name price imageUrl');

    cleanImageUrls(bargains);
    res.status(200).json(bargains);
  } catch (error) {
    console.error('Error fetching seller bargains:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== GET BUYER BARGAINS ==========
exports.getBuyerBargains = async (req, res) => {
  const { buyerPhone } = req.query;
  if (!buyerPhone) {
    return res.status(400).json({ message: 'buyerPhone query parameter is required' });
  }

  try {
    const bargains = await Bargain.find({ buyerPhone: buyerPhone.trim() })
      .populate('buyerOffers.items.product', 'name price imageUrl')
      .populate('sellerOffers.items.product', 'name price imageUrl');

    cleanImageUrls(bargains);
    res.status(200).json(bargains);
  } catch (error) {
    console.error('Error fetching buyer bargains:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== GET SUCCESSFUL BARGAINS ==========
exports.getSuccessfulBargains = async (req, res) => {
  try {
    const { buyerPhone } = req.params;
    if (!buyerPhone) {
      return res.status(400).json({ error: 'buyerPhone is required' });
    }

    console.log('🚨 DEBUGGING BARGAINS FETCH...');
    console.log('✅ Phone param:', buyerPhone);
    console.log('✅ Trimmed phone:', buyerPhone.trim());

    // Step 1: Find all bargains with that phone
    const rawBargains = await Bargain.find({ buyerPhone: buyerPhone.trim() });
    console.log(`🔎 Total bargains with phone ${buyerPhone.trim()}:`, rawBargains.length);

    // Step 2: Filter accepted
    const accepted = rawBargains.filter(b =>
      (b.status || '').toLowerCase() === 'accepted'
    );
    console.log(`✅ Accepted bargains count:`, accepted.length);

    // Step 3: Filter addedToCart = false
    const notInCart = accepted.filter(b => b.addedToCart === false);
    console.log(`✅ Accepted + not addedToCart count:`, notInCart.length);

    notInCart.forEach((b, i) => {
      console.log(`📦 [${i + 1}] ID: ${b._id}, Status: ${b.status}, addedToCart: ${b.addedToCart}`);
    });

    // Step 4: Final query with product data
    const bargains = await Bargain.find({
      buyerPhone: buyerPhone.trim(),
      status: 'accepted',
      addedToCart: false
    }).populate({
      path: 'sellerOffers.items.product',
      select: 'name price imageUrl images',
    });

    // Step 5: Extract items & correct price
    const bargainItems = bargains.flatMap(bargain => {
      let price = bargain.acceptedPrice;
      let items = [];

      if (price == null) {
        const lastBuyer = bargain.buyerOffers?.[bargain.buyerOffers.length - 1];
        const lastSeller = bargain.sellerOffers?.[bargain.sellerOffers.length - 1];

        if (lastBuyer && lastSeller) {
          if (lastBuyer.time && lastSeller.time) {
            items = lastBuyer.time > lastSeller.time ? lastBuyer.items : lastSeller.items;
            price = lastBuyer.time > lastSeller.time
              ? lastBuyer.totalOfferedPrice
              : lastSeller.totalCounterPrice;
          } else {
            items = lastSeller ? lastSeller.items : lastBuyer.items;
            price = lastSeller ? lastSeller.totalCounterPrice : lastBuyer.totalOfferedPrice;
          }
        } else if (lastBuyer) {
          items = lastBuyer.items;
          price = lastBuyer.totalOfferedPrice;
        } else if (lastSeller) {
          items = lastSeller.items;
          price = lastSeller.totalCounterPrice;
        }
      } else {
        const allOffers = [
          ...(bargain.buyerOffers || []).map(o => ({
            price: o.totalOfferedPrice,
            items: o.items
          })),
          ...(bargain.sellerOffers || []).map(o => ({
            price: o.totalCounterPrice,
            items: o.items
          })),
        ];
        const match = allOffers.find(o => o.price === price);
        if (match) items = match.items;
      }

      if (!items || items.length === 0) return [];

      const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const unitPrice = totalQty > 0 ? price / totalQty : price;

      return items.map(it => ({
        bargainId: bargain._id.toString(),
        productId: it.product?._id?.toString() || it.product?.toString?.() || '',
        sellerId: bargain.seller.toString(),
        productName: it.product?.name || 'Unknown',
        price: unitPrice,
        quantity: it.quantity,
        imageUrl:
          it.product?.imageUrl ||
          it.product?.images?.[0] ||
          `${process.env.BACKEND_URL || ''}/assets/images/default.png`,
      }));
    });

    if (bargainItems.length === 0) {
      console.log('❌ No successful bargain items found to return.');
      return res.status(200).json([]);
    }

    console.log(`✅ Returning ${bargainItems.length} bargain items.`);
    res.json(bargainItems);
  } catch (error) {
    console.error('❌ Error fetching successful bargains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// ========== DELETE ==========
exports.deleteBargain = async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user._id;

  try {
    const bargain = await Bargain.findById(id);
    if (!bargain || !bargain.seller.equals(sellerId)) {
      return res.status(404).json({ message: 'Bargain not found or unauthorized' });
    }
    if (bargain.status !== 'pending') {
      return res.status(400).json({ message: `Cannot delete a bargain with status '${bargain.status}'` });
    }

    await Bargain.deleteOne({ _id: id });
    res.status(200).json({ message: 'Bargain deleted successfully' });
  } catch (error) {
    console.error('Delete bargain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== GET BY ID ==========
exports.getBargainById = async (req, res) => {
  const { id } = req.params;
  const buyerPhone = req.query.buyerPhone;

  if (!buyerPhone) {
    return res.status(400).json({ message: 'buyerPhone query parameter is required' });
  }

  try {
    const bargain = await Bargain.findById(id)
      .populate('seller', 'name') // no email
      .populate('buyerOffers.items.product', 'name price imageUrl')
      .populate('sellerOffers.items.product', 'name price imageUrl');

    if (!bargain || bargain.buyerPhone.trim().toLowerCase() !== buyerPhone.trim().toLowerCase()) {
      return res.status(404).json({ message: 'Unauthorized or not found' });
    }

    cleanImageUrls([bargain]);

    // Remove sensitive info
    const sanitized = bargain.toObject(); // plain JS object
    delete sanitized.buyerPhone;
    delete sanitized.buyerName;

    // Also remove from offers
    if (Array.isArray(sanitized.buyerOffers)) {
      sanitized.buyerOffers = sanitized.buyerOffers.map(offer => {
        const { buyerPhone, buyerName, ...rest } = offer;
        return rest;
      });
    }

    res.status(200).json(sanitized);
  } catch (error) {
    console.error('Get bargain by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.markBargainsAsUsed = async (req, res) => {
  const { bargainIds } = req.body;
  if (!Array.isArray(bargainIds) || bargainIds.length === 0) {
    return res.status(400).json({ message: 'bargainIds is required' });
  }

  try {
    await Promise.all(bargainIds.map(id => {
      return Bargain.findByIdAndUpdate(id, {
        addedToCart: true,
        ordered: true
      });
    }));


    res.status(200).json({ message: 'Bargains marked as used' });
  } catch (error) {
    console.error('Mark bargains as used error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== ADD TO CART FROM BARGAIN ==========
exports.addToCartFromBargain = async (req, res) => {
  try {
    const { bargainId } = req.params;
    const { buyerPhone } = req.body;

    if (!buyerPhone || !bargainId) {
      return res.status(400).json({ error: 'buyerPhone and bargainId are required' });
    }

    const bargain = await Bargain.findById(bargainId)
      .populate('buyerOffers.items.product')
      .populate('sellerOffers.items.product');

    if (!bargain || bargain.buyerPhone.trim() !== buyerPhone.trim()) {
      return res.status(404).json({ error: 'Bargain not found or unauthorized' });
    }

    if (bargain.status !== 'accepted') {
      return res.status(400).json({ error: 'Bargain not accepted' });
    }

    if (bargain.addedToCart) {
      return res.status(400).json({ error: 'Bargain already added to cart' });
    }

    const Cart = require('../models/cartModel');
    let cart = await Cart.findOne({ buyerPhone });
    if (!cart) cart = new Cart({ buyerPhone, items: [] });

    const alreadyExists = cart.items.some(item =>
      item.bargainId?.toString() === bargain._id.toString()
    );
    if (alreadyExists) {
      return res.status(400).json({ error: 'Bargain already in cart' });
    }

    // ✅ Step: Extract final agreed price and items
    let finalPrice = bargain.acceptedPrice;
    let finalItems = [];

    if (finalPrice == null) {
      const lastBuyer = bargain.buyerOffers?.[bargain.buyerOffers.length - 1];
      const lastSeller = bargain.sellerOffers?.[bargain.sellerOffers.length - 1];
      if (lastBuyer && lastSeller) {
        if (lastBuyer.time && lastSeller.time) {
          if (lastBuyer.time > lastSeller.time) {
            finalPrice = lastBuyer.totalOfferedPrice;
            finalItems = lastBuyer.items;
          } else {
            finalPrice = lastSeller.totalCounterPrice;
            finalItems = lastSeller.items;
          }
        }
      } else if (lastBuyer) {
        finalPrice = lastBuyer.totalOfferedPrice;
        finalItems = lastBuyer.items;
      } else if (lastSeller) {
        finalPrice = lastSeller.totalCounterPrice;
        finalItems = lastSeller.items;
      }
    } else {
      const allOffers = [
        ...(bargain.buyerOffers || []).map(o => ({ price: o.totalOfferedPrice, items: o.items })),
        ...(bargain.sellerOffers || []).map(o => ({ price: o.totalCounterPrice, items: o.items })),
      ];
      const match = allOffers.find(o => o.price === finalPrice);
      if (match) finalItems = match.items;
    }

    if (!finalItems || finalItems.length === 0) {
      return res.status(400).json({ error: 'No valid accepted items found' });
    }

    const totalQty = finalItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const unitPrice = totalQty > 0 ? finalPrice / totalQty : finalPrice;

    for (const item of finalItems) {
      if (!item.product) continue;

      const product = item.product;
      const seller = product.seller || bargain.seller;

      cart.items.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: unitPrice,
        imageUrl:
          product.imageUrl ||
          product.images?.[0] ||
          `${process.env.BACKEND_URL || ''}/assets/images/default.png`,

        sellerId: seller._id || seller,
        sellerLocation: seller.location || '',

        isBargain: true,
        isGroupBuy: false,
        bargainId: bargain._id,
        groupBuyId: null,
      });
    }

    bargain.addedToCart = true;
    bargain.ordered = true;

    await Promise.all([cart.save(), bargain.save()]);
    res.status(200).json({ message: 'Bargain items added to cart' });
  } catch (err) {
    console.error('addToCartFromBargain error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// ========== ACCEPT SELLER OFFER ==========
exports.acceptSellerOffer = async (req, res) => {
  try {
    const { bargainId, acceptedPrice } = req.body;

    const bargain = await Bargain.findById(bargainId);
    if (!bargain) {
      return res.status(404).json({ error: 'Bargain not found' });
    }

    // ✅ Mark status as accepted
    bargain.status = 'accepted';

    // ✅ Use given acceptedPrice or fallback to last seller offer
    if (typeof acceptedPrice === 'number') {
      bargain.acceptedPrice = acceptedPrice;
    } else {
      const lastSellerOffer = bargain.sellerOffers?.[bargain.sellerOffers.length - 1];

      if (lastSellerOffer && typeof lastSellerOffer.totalCounterPrice === 'number') {
        bargain.acceptedPrice = lastSellerOffer.totalCounterPrice;
      } else {
        return res.status(400).json({ error: 'No valid seller offer found and no accepted price provided' });
      }
    }

    await bargain.save();

    res.json({
      message: 'Seller offer accepted successfully',
      bargain,
    });
  } catch (err) {
    console.error('❌ Error in acceptSellerOffer:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
};



