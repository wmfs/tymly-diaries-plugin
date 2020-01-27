'use strict'

const moment = require('moment')

module.exports = function generateTimeSlots (diary, inputDate) {
  const slots = []

  const date = moment(inputDate).format('YYYY-MM-DD')
  const startTime = moment(date + 'T' + diary.slots.startTime)
  const endTime = moment(date + 'T' + diary.slots.endTime)

  while (startTime.isBefore(endTime)) {
    slots.push([startTime.format('HH:mm:ss'), 0])
    startTime.add(diary.slots.durationMinutes, 'm')
  }

  return slots
}
