const getAvailableDiarySlots = require('./helpers/generate-time-slots')
const moment = require('moment')

module.exports = class GetAvailableDiarySlots {
  init (resourceConfig, env) {
    this.entryModel = env.bootedServices.storage.models.tymly_diaryEntry
    this.diaryId = resourceConfig.diaryId
    this.services = env.bootedServices
  }

  async run (event, context) {
    const namespace = context.stateMachineMeta.namespace
    const diaryService = this.services.diaries
    const diary = diaryService.diaries[namespace + '_' + this.diaryId]

    let entries = await this.entryModel.find({ where: { diaryId: { equals: this.diaryId } } })
    entries = entries.filter(booking => moment(event.date).format('YYYY-MM-DD') === moment(booking.startDateTime).format('YYYY-MM-DD'))

    const availableTimes = getAvailableDiarySlots(diary, event.date)

    const remove = []

    Object.values(availableTimes).forEach((timeSlot, index) => {
      Object.values(entries).forEach(booking => {
        const d = event.date.split('T')[0] + 'T' + timeSlot[0]
        if (moment(d).isSame(moment(booking.startDateTime))) {
          timeSlot[1]++
          if (timeSlot[1] >= diary.slots.maxConcurrency) {
            remove.push(index)
          }
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

      const today = moment(new Date())
      const isToday = moment(event.date).format('YYYY-MM-DD') === today.format('YYYY-MM-DD')

      if (isToday) {
        const timeSlot_ = moment(today.format('YYYY-MM-DD') + 'T' + timeSlot[0])
        const isBefore = moment(timeSlot_).isBefore(today)

        if (isBefore) {
          remove.push(index)
        }
      }
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
