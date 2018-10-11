'use strict'

const moment = require('moment')

module.exports = function generateTimeSlots (diary, inputDate) {
  const slots = []

  console.log('Inside generate-time-slots')

  const date = moment(inputDate).format('YYYY-MM-DD')
  console.log('Date selected is ', date)
  let startTime = moment(date + 'T' + diary.slots.startTime)
  console.log('Start time for date is ', startTime)
  let endTime = moment(date + 'T' + diary.slots.endTime)
  console.log('End time for date is ', startTime)

  while (startTime.isBefore(endTime)) {
    console.log('Adding slot ', startTime.format('HH:mm:ss'))
    slots.push([startTime.format('HH:mm:ss'), 0])
    console.log('Adding to start time ', diary.slots.durationMinutes)
    startTime.add(diary.slots.durationMinutes, 'm')
  }

  return slots
}
