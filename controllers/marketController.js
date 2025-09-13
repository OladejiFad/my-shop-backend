const moment = require('moment-timezone');

const getMarketStatus = (req, res) => {
  const { role } = req.query;

  if (!role || !['buyer', 'seller'].includes(role.toLowerCase())) {
    return res.status(400).json({ message: 'Missing or invalid role' });
  }

  const timezone = 'Africa/Lagos';
  const now = moment.tz(timezone);
  const currentDay = now.day(); // 0 = Sunday
  const currentMinutes = now.hours() * 60 + now.minutes();

  let isActive = false;
  let openTime, closeTime;

  if (currentDay === 0) {
    if (role === 'buyer') {
      openTime = moment.tz({ hour: 15, minute: 0 }, timezone);
      closeTime = moment.tz({ hour: 22, minute: 0 }, timezone);
      isActive = currentMinutes >= 15 * 60 && currentMinutes <= 22 * 60;
    } else {
      openTime = moment.tz({ hour: 13, minute: 0 }, timezone);
      closeTime = moment.tz({ hour: 23, minute: 30 }, timezone);
      isActive = currentMinutes >= 13 * 60 && currentMinutes <= (23 * 60 + 30);
    }
  } else {
    const nextSunday = now.clone().add((7 - currentDay) % 7, 'days').startOf('day');
    if (role === 'buyer') {
      openTime = nextSunday.clone().hour(15).minute(0);
      closeTime = nextSunday.clone().hour(22).minute(0);
    } else {
      openTime = nextSunday.clone().hour(13).minute(0);
      closeTime = nextSunday.clone().hour(23).minute(30);
    }
  }

  res.json({
    active: isActive,
    now: now.format(),          // in Africa/Lagos timezone
    openTime: openTime.format(),
    closeTime: closeTime.format()
  });
};

module.exports = { getMarketStatus };
