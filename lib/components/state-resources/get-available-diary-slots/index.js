'use strict'

const getAvailableDiarySlots = require('./helpers/generate-time-slots')
const moment = require('moment')

module.exports = class GetAvailableDiarySlots {
  init (resourceConfig, env, callback) {
    this.entryModel = env.bootedServices.storage.models['tymly_diaryEntry']
    this.diaryId = resourceConfig.diaryId
    this.services = env.bootedServices
    callback(null)
  }

  async run (event, context) {
    const namespace = context.stateMachineMeta.namespace
    const diaryService = this.services.diaries
    const diary = diaryService.diaries[namespace + '_' + this.diaryId]

    let entries = await this.entryModel.find({ where: { 'diaryId': { equals: this.diaryId } } })
    console.log('Getting diary entries for ', this.diaryId)
    entries = entries.filter(booking => moment(event.date).format('YYYY-MM-DD') === moment(booking.startDateTime).format('YYYY-MM-DD'))
    console.log('Found these entries: ', entries)

    const availableTimes = getAvailableDiarySlots(diary, event.date)
    console.log('These are the available time slots (should appear in app)', availableTimes)

    const remove = []

    Object.values(availableTimes).forEach((timeSlot, index) => {
      Object.values(entries).forEach(booking => {
        const d = event.date.split('T')[0] + 'T' + timeSlot[0]
        if (moment(d).isSame(moment(booking.startDateTime))) {
          timeSlot[1]++
          if (timeSlot[1] >= diary.slots.maxConcurrency) remove.push(index)
        }
      })

      Object.values(diary.slots.restrictions).forEach(restriction => {
        if (
          timeSlot[0] >= restriction.timesAffected[0] &&
          timeSlot[0] < restriction.timesAffected[1] &&
          timeSlot[1] >= restriction.changes.maxConcurrency
        ) {
          remove.push(index)
        }
      })
    })

    const final = availableTimes.filter((e, idx) => !remove.includes(idx))

    const times = Object.values(final).map((timeSlot) => {
      const t = moment(event.date.split('T')[0] + 'T' + timeSlot[0])
      return {
        value: t.format(),
        label: t.format('HH:mm') + ' - ' + t.add(diary.slots.durationMinutes, 'm').format('HH:mm')
      }
    })

    context.sendTaskSuccess({ availableTimes: times })
  }
}
