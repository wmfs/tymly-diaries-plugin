'use strict'

class DiaryService {
  boot (options) {
    this.diaries = options.blueprintComponents.diaries || {}
  }
}

module.exports = {
  serviceClass: DiaryService
}
