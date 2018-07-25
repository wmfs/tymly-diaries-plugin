module.exports = function isWithinRange (start, end, dateTime) {
  return dateTime.isBetween(start, end, null, '()')
}
