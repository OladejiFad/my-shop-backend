const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^\+234[0-9]{10}$/,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function (v) {
        return /[A-Z]/.test(v) && /[^a-zA-Z0-9]/.test(v);
      },
      message: 'Password must contain at least one uppercase letter and one special character.'
    }
  },
  location: {
    type: String,
    required: true,
    enum: {
      values: ['Ibadan', 'Lagos'],
      message: 'Trady is not yet in your zone 🫨'
    },
  },
  role: {
    type: String,
    default: 'seller',
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: Boolean,
    default: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  banned: {
    type: Boolean,
    default: false,
  },
  accountNumber: String,
  bankName: String,
  commission: {
    type: Number,
    default: 0,
  },
  pendingCommission: {
    type: Number,
    default: 0,
  },
  pendingPayments: {
    type: Number,
    default: 0,
  },
  phoneVisibleToAdminOnly: {
    type: Boolean,
    default: true,
  },

  // 🛍️ Commerce & Skill Work
  occupation: {
    type: String,
    required: function () {
      return this.role === 'seller'; // ✅ Only required for sellers
    },
  },

  idCard: String,
  nin: String,

  // 📈 Activity & Levels
  sellerLevel: {
    type: Number,
    default: 0,
  },
  completedGreenOrders: {
    type: Number,
    default: 0,
  },
  buyerLevel: {
    type: Number,
    default: 0,
  },
  totalPurchases: {
    type: Number,
    default: 0,
  },
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],

  // 👇 Landlord-specific fields
  bvn: {
    type: String,
    required: function () {
      return this.role === 'landlord';
    }
  },
  internationalPassport: String,
});

// ✅ Validation for required fields based on role only
userSchema.pre('validate', function (next) {
  if (this.role === 'landlord') {
    if (!this.nin && !this.internationalPassport) {
      this.invalidate('nin', 'Either NIN or International Passport is required for landlords');
      this.invalidate('internationalPassport', 'Either NIN or International Passport is required for landlords');
    }
  }

  next();
});

// 🔐 Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
