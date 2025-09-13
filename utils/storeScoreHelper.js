const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Store = require('../models/storeModel');

async function updateStoreScore(sellerId) {
  const objectId = mongoose.Types.ObjectId(sellerId);

  const result = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'success',
        orderStatus: 'Success',
        'products.sellerId': sellerId,
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        weighted: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$satisfactionStatus', 'Satisfied ❤'] }, then: 1 },
                { case: { $eq: ['$satisfactionStatus', 'I Like It 💛'] }, then: 0.5 },
              ],
              default: 0
            }
          }
        }
      }
    },
    {
      $project: {
        score: {
          $cond: {
            if: { $eq: ['$total', 0] },
            then: 0,
            else: { $multiply: [{ $divide: ['$weighted', '$total'] }, 100] }
          }
        }
      }
    }
  ]);

  const score = result[0]?.score || 0;
  await Store.findOneAndUpdate({ sellerId }, { sellerScore: score });
}

module.exports = { updateStoreScore };
