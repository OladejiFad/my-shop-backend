const badWords = ['badword1', 'badword2'];
const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\d{3}[-.\s]?){2,4}\d{3,4}/g;

function isMessageAllowed(message) {
  if (phoneRegex.test(message)) return false;

  const lower = message.toLowerCase();
  for (const word of badWords) {
    if (lower.includes(word)) return false;
  }

  return true;
}

module.exports = { isMessageAllowed };
