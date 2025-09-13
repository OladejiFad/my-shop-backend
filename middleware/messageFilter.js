const badWords = ['badword1', 'badword2'];

const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\d{3}[-.\s]?){2,4}\d{3,4}/g;

function filterMessage(req, res, next) {
  const { message } = req.body;

  if (!message) return res.status(400).json({ message: 'Message is required' });

  if (phoneRegex.test(message)) {
    return res.status(400).json({ message: 'Messages cannot contain phone numbers' });
  }

  const lowercaseMessage = message.toLowerCase();
  for (const word of badWords) {
    if (lowercaseMessage.includes(word)) {
      return res.status(400).json({ message: 'Message contains prohibited language' });
    }
  }

  next();
}

module.exports = filterMessage;
