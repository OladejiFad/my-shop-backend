const Store = require('../models/storeModel');
const User = require('../models/userModel');

// Seller sets up or updates their store
const setupOrUpdateStoreBySeller = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      storeOccupation,  // required once: 'skillworker' or 'vendor'
      occupationType,   // required once (free-text)
      storeName,        // required once
      storeTheme,       // editable anytime
      storeDescription, // editable anytime
      storeCategory,    // editable anytime
    } = req.body;

    let store = await Store.findOne({ sellerId });

    if (!store) {
      // Creating new store
      if (!storeOccupation || !occupationType || !storeName) {
        return res.status(400).json({ error: 'storeOccupation, occupationType, and storeName are required for new store' });
      }

      const normalizedOccupation = storeOccupation.toLowerCase().trim();
      if (!['skillworker', 'vendor'].includes(normalizedOccupation)) {
        return res.status(400).json({ error: 'storeOccupation must be "skillworker" or "vendor"' });
      }

      store = new Store({
        sellerId,
        storeOccupation: normalizedOccupation,
        storeOccupationLocked: true,
        occupationType: occupationType.trim(),
        occupationTypeLocked: true,
        storeName: storeName.trim(),
        storeNameLocked: true,
        storeTheme: storeTheme?.trim() || '',
        storeDescription: storeDescription?.trim() || '',
        storeCategory: storeCategory?.trim() || '',
      });
    } else {
      // Updating existing store
      if (store.storeOccupationLocked && storeOccupation && storeOccupation.toLowerCase().trim() !== store.storeOccupation) {
        return res.status(400).json({ error: 'storeOccupation is locked and cannot be changed' });
      }

      if (store.occupationTypeLocked && occupationType && occupationType.trim() !== store.occupationType) {
        return res.status(400).json({ error: 'occupationType is locked and cannot be changed' });
      }

      if (store.storeNameLocked && storeName && storeName.trim() !== store.storeName) {
        return res.status(400).json({ error: 'storeName is locked and cannot be changed' });
      }

      // Update values if not locked
      if (!store.storeOccupationLocked && storeOccupation) {
        const normalized = storeOccupation.toLowerCase().trim();
        if (!['skillworker', 'vendor'].includes(normalized)) {
          return res.status(400).json({ error: 'storeOccupation must be "skillworker" or "vendor"' });
        }
        store.storeOccupation = normalized;
        store.storeOccupationLocked = true;
      }

      if (!store.occupationTypeLocked && occupationType) {
        store.occupationType = occupationType.trim();
        store.occupationTypeLocked = true;
      }

      if (!store.storeNameLocked && storeName) {
        store.storeName = storeName.trim();
        store.storeNameLocked = true;
      }

      // Always editable
      if (storeTheme !== undefined) store.storeTheme = storeTheme.trim();
      if (storeDescription !== undefined) store.storeDescription = storeDescription.trim();
      if (storeCategory !== undefined) store.storeCategory = storeCategory.trim();
    }

    await store.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('store-update', {
        message: `Store updated by seller.`,
        store,
      });
    }

    res.status(200).json({ message: 'Store setup/updated successfully by seller', store });
  } catch (error) {
    console.error('Error in setupOrUpdateStoreBySeller:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin overrides all fields
const adminUpdateStore = async (req, res) => {
  try {
    const storeId = req.params.id;
    const {
      storeName,
      storeTheme,
      storeDescription,
      storeCategory,
      occupationType,
      storeOccupation,
    } = req.body;

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    if (storeName) {
      store.storeName = storeName.trim();
      store.storeNameLocked = true;
    }

    if (storeTheme) store.storeTheme = storeTheme.trim();
    if (storeDescription) store.storeDescription = storeDescription.trim();
    if (storeCategory) store.storeCategory = storeCategory.trim();

    if (occupationType) {
      store.occupationType = occupationType.trim();
      store.occupationTypeLocked = true;
    }

    if (storeOccupation) {
      const normalized = storeOccupation.toLowerCase().trim();
      if (!['skillworker', 'vendor'].includes(normalized)) {
        return res.status(400).json({ error: 'storeOccupation must be "skillworker" or "vendor"' });
      }
      store.storeOccupation = normalized;
      store.storeOccupationLocked = true;
    }

    await store.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('store-update', {
        message: `Store "${store.storeName}" updated by admin.`,
        store,
      });
    }

    res.status(200).json({ message: 'Store updated by admin successfully', store });
  } catch (error) {
    console.error('Error in adminUpdateStore:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Authenticated seller fetches their own store
const getStoreBySellerId = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const store = await Store.findOne({ sellerId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.status(200).json(store);
  } catch (error) {
    console.error('Error in getStoreBySellerId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Public store lookup by store ID
const getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.status(200).json(store);
  } catch (error) {
    console.error('Error in getStoreById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Public store lookup by sellerId
const getPublicStoreBySellerId = async (req, res) => {
  try {
    const store = await Store.findOne({ sellerId: req.params.sellerId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.status(200).json({ store });
  } catch (error) {
    console.error('Error in getPublicStoreBySellerId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Filtered store fetch (e.g., ?type=skillworker)
const getFilteredStores = async (req, res) => {
  try {
    const { type } = req.query;
    let query = {};

    if (type) {
      const normalized = type.toLowerCase();

      if (normalized === 'skillworker' || normalized === 'skill workers') {
        query.storeOccupation = 'skillworker';
      } else if (normalized === 'vendor') {
        query.$or = [
          { storeOccupation: 'vendor' },
          { storeOccupation: { $exists: false } },
          { storeOccupation: null },
          { storeOccupation: '' }
        ];
      }
    }

    const stores = await Store.find(query);
    res.status(200).json({ stores });
  } catch (error) {
    console.error('Error in getFilteredStores:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  setupOrUpdateStoreBySeller,
  adminUpdateStore,
  getStoreBySellerId,
  getStoreById,
  getPublicStoreBySellerId,
  getFilteredStores,
};
