'use strict'

const moment = require('moment')
const isWithinRange = require('./helpers/is-within-range')

module.exports = class CreateDiaryEntry {
  init (resourceConfig, env, callback) {
    this.entryModel = env.bootedServices.storage.models.tymly_diaryEntry
    this.resourceConfig = resourceConfig
    this.diaryId = resourceConfig.diaryId
    this.services = env.bootedServices
    callback(null)
  }

  async run (event, context) {
    const namespace = context.stateMachineMeta.namespace
    const diary = this.services.diaries.diaries[namespace + '_' + this.diaryId]

    const startDateTime = moment(event.startDateTime)
    const endDateTime = moment(event.startDateTime).add(diary.slots.durationMinutes, 'minutes')

    const date = startDateTime.format('YYYY-MM-DD')

    const formattedStartDateTime = startDateTime.format('YYYY-MM-DD HH:mm:ss')
    const formattedEndDateTime = endDateTime.format('YYYY-MM-DD HH:mm:ss')

    const comparableStartDate = startDateTime.format('YYYY-MM-DDTHH:mm:ss')

    const entriesAtDate = await this.entryModel.find({
      where: {
        diaryId: {
          equals: this.diaryId
        },
        startDateTime: {
          like: date
        }
      }
    })

    const entriesAtDateTime = entriesAtDate.filter(entry => comparableStartDate === entry.startDateTime)

    if (entriesAtDate.length >= diary.slots.maxCapacity) {
      return context.sendTaskFailure({
        error: 'createDiaryEntryFail',
        cause: `Max. appointments of ${diary.slots.maxCapacity} already made on ${date}.`
      })
    }

    if (entriesAtDateTime.length >= diary.slots.maxConcurrency) {
      return context.sendTaskFailure({
        error: 'createDiaryEntryFail',
        cause: `Max. appointments of ${diary.slots.maxConcurrency} already made at ${formattedStartDateTime}.`
      })
    }

    if (diary.slots.endTime && diary.slots.startTime) {
      const startRule = moment(date + 'T' + diary.slots.startTime)
      const startIsSame = startDateTime.isSame(startRule)
      const startIsBefore = startDateTime.isBefore(startRule)

      if (!startIsSame && startIsBefore) {
        return context.sendTaskFailure({
          error: 'createDiaryEntryFail',
          cause: `The appointment must be after ${startRule.format('HH:mm')}.`
        })
      }

      const endRule = moment(date + 'T' + diary.slots.endTime)
      const endIsSame = endDateTime.isSame(endRule)
      const endIsAfter = endDateTime.isAfter(endRule)

      if (!endIsSame && endIsAfter) {
        return context.sendTaskFailure({
          error: 'createDiaryEntryFail',
          cause: `The appointment must be before ${endRule.format('HH:mm')}.`
        })
      }
    }

    if (diary.slots.restrictions) {
      let error = false
      Object.keys(diary.slots.restrictions).forEach(restriction => {
        const timesAffected = diary.slots.restrictions[restriction].timesAffected
        const changes = diary.slots.restrictions[restriction].changes

        const startRule = moment(date + 'T' + timesAffected[0])
        const endRule = moment(date + 'T' + timesAffected[1])

        if (
          (isWithinRange(startRule, endRule, startDateTime) ||
            isWithinRange(startRule, endRule, endDateTime)) &&
          entriesAtDateTime.length >= changes.maxConcurrency
        ) {
          error = true
        }
      })
      if (error) {
        return context.sendTaskFailure({
          error: 'createDiaryEntryFail',
          cause: 'Max. appointments already made at this time.'
        })
      }
    }

    const options = {
      startDateTime: formattedStartDateTime,
      originId: this.resourceConfig.originId || context.stateMachineMeta.name,
      diaryId: this.diaryId,
      endDateTime: formattedEndDateTime
    }

    if (event.information) options.info = event.information

    this.entryModel.upsert(options, {}, (err, doc) => {
      if (err) return context.sendTaskFailure({ error: 'createDiaryEntryFail', cause: err })
      context.sendTaskSuccess(doc)
    })
  }
}
