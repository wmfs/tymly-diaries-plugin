'use strict'

module.exports = class CancelDiaryEntry {
  init (resourceConfig, env) {
    this.entryModel = env.bootedServices.storage.models.tymly_diaryEntry
  }

  run (event, context) {
    this.entryModel.destroyById(event, err => {
      if (err) return context.sendTaskFailure({ error: 'cancelDiaryEntryFail', cause: err })
      context.sendTaskSuccess()
    })
  }
}
