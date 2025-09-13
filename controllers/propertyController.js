const Property = require('../models/propertyModel');
const Transaction = require('../models/transactionModel');

// Upload property
exports.createProperty = async (req, res) => {
  try {
    console.log('📥 Incoming property upload');
    console.log('🧾 Body fields:', req.body);
    console.log('📎 File keys:', Object.keys(req.files || {}));
    console.log('🖼 Image files:', req.files?.images?.map(f => f.originalname));
    console.log('📄 Document files:', req.files?.documents?.map(f => f.originalname));
    console.log('🎥 Video file:', req.files?.video?.[0]?.originalname);

    const {
      landlordId,
      title,
      description,
      propertyType,
      transactionType,
      price,
      locationDetails,
      amenities,
      availability,
    } = req.body;

    if (!landlordId || !title || !propertyType || !transactionType || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const parsedAmenities = amenities ? JSON.parse(amenities) : [];
    const parsedLocation = locationDetails ? JSON.parse(locationDetails) : {};
    const parsedAvailability = availability ? JSON.parse(availability) : {};

    const images = req.files?.images?.map(file => `/uploads/${file.filename}`) || [];
    const documents = req.files?.documents?.map(file => `/uploads/${file.filename}`) || [];
    const videoFile = req.files?.video?.[0];
    const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;

    const property = new Property({
      landlordId,
      title,
      description,
      propertyType,
      transactionType,
      images,
      videoUrl,
      documents,
      price,
      verified: false,
      location: parsedLocation,
      amenities: parsedAmenities,
      availability: parsedAvailability,
    });

    await property.save();

    const transaction = new Transaction({
      userId: landlordId,
      propertyId: property._id,
      type: 'listing_fee',
      amount: 5000,
      status: 'pending',
    });

    await transaction.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const propertyObj = property.toObject();

    propertyObj.images = property.images.map(img => baseUrl + img.replace(/\\/g, '/'));
    propertyObj.documents = property.documents.map(doc => baseUrl + doc.replace(/\\/g, '/'));
    if (property.videoUrl) {
      propertyObj.videoUrl = baseUrl + property.videoUrl.replace(/\\/g, '/');
    }

    res.status(201).json({ message: 'Property uploaded successfully', property: propertyObj });
  } catch (error) {
    console.error('❌ Property upload failed:', error);
    res.status(500).json({ message: 'Failed to upload property', error: error.message });
  }
};

// Get all verified properties (public)
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find({ verified: true }).sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const propertiesWithUrls = properties.map(p => {
      const obj = p.toObject();
      obj.images = obj.images.map(img => baseUrl + img.replace(/\\/g, '/'));
      obj.documents = obj.documents.map(doc => baseUrl + doc.replace(/\\/g, '/'));
      if (obj.videoUrl) {
        obj.videoUrl = baseUrl + obj.videoUrl.replace(/\\/g, '/');
      }
      return obj;
    });

    res.status(200).json(propertiesWithUrls);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch properties', error: error.message });
  }
};

// Get all pending properties (admin only)
exports.getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.find({ verified: false }).sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const propertiesWithUrls = properties.map(p => {
      const obj = p.toObject();
      obj.images = obj.images.map(img => baseUrl + img.replace(/\\/g, '/'));
      obj.documents = obj.documents.map(doc => baseUrl + doc.replace(/\\/g, '/'));
      if (obj.videoUrl) {
        obj.videoUrl = baseUrl + obj.videoUrl.replace(/\\/g, '/');
      }
      return obj;
    });

    res.status(200).json(propertiesWithUrls);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending properties', error: error.message });
  }
};

// Verify (approve) a property (admin only)
exports.verifyProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    property.verified = true;
    await property.save();

    res.status(200).json({ message: 'Property verified successfully', property });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify property', error: error.message });
  }
};

// Reject a property (admin only)
exports.rejectProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    // You can either delete the property or mark it as rejected (choose your business logic)
    await Property.deleteOne({ _id: id });

    res.status(200).json({ message: 'Property rejected and removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject property', error: error.message });
  }
};

// Get all properties by landlord ID
exports.getPropertiesByLandlord = async (req, res) => {
  try {
    const { id } = req.params;
    const properties = await Property.find({ landlordId: id }).sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const propertiesWithUrls = properties.map(p => {
      const obj = p.toObject();
      obj.images = obj.images.map(img => baseUrl + img.replace(/\\/g, '/'));
      obj.documents = obj.documents.map(doc => baseUrl + doc.replace(/\\/g, '/'));
      if (obj.videoUrl) {
        obj.videoUrl = baseUrl + obj.videoUrl.replace(/\\/g, '/');
      }
      return obj;
    });

    res.status(200).json(propertiesWithUrls);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch landlord properties', error: error.message });
  }
};

// Update a property by ID (landlord or admin only)
exports.updateProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const updates = req.body;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Authorization check: landlord or admin only
    if (req.user.role !== 'admin' && property.landlordId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this property' });
    }

    Object.assign(property, updates);
    await property.save();

    res.status(200).json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Server error updating property', error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching property with id:', id);
    const property = await Property.findById(id);

    if (!property) {
      console.log('Property not found');
      return res.status(404).json({ message: 'Property not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const propertyObj = property.toObject();

    propertyObj.images = property.images.map(img => baseUrl + img.replace(/\\/g, '/'));
    propertyObj.documents = property.documents.map(doc => baseUrl + doc.replace(/\\/g, '/'));
    if (property.videoUrl) {
      propertyObj.videoUrl = baseUrl + property.videoUrl.replace(/\\/g, '/');
    }

    res.status(200).json(propertyObj);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
