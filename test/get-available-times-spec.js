/* eslint-env mocha */

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect

const GET_TIMES_STATE_MACHINE_NAME = 'test_getAvailableTimes'

const DATE_TIME = '2018-04-23'

// book 3 at 10:30-11:30
// book 2 at 18:30-19:30
// get times
//  - should NOT see 10:30-11:30 (maxConc. = 3)
//  - should NOT see 12:00-13:30 (maxConc. = 0)
//  - should NOT see 18:30-19:30 (maxConc. = 2)

const data = [
  {
    origin: 'test',
    diaryId: 'doctors',
    startDateTime: `${DATE_TIME}T10:30:00`,
    endDateTime: `${DATE_TIME}T11:30:00`,
    info: {}
  },
  {
    origin: 'test',
    diaryId: 'doctors',
    startDateTime: `${DATE_TIME}T10:30:00`,
    endDateTime: `${DATE_TIME}T11:30:00`,
    info: {}
  },
  {
    origin: 'test',
    diaryId: 'doctors',
    startDateTime: `${DATE_TIME}T10:30:00`,
    endDateTime: `${DATE_TIME}T11:30:00`,
    info: {}
  },
  {
    origin: 'test',
    diaryId: 'doctors',
    startDateTime: `${DATE_TIME}T18:30:00`,
    endDateTime: `${DATE_TIME}T19:30:00`,
    info: {}
  },
  {
    origin: 'test',
    diaryId: 'doctors',
    startDateTime: `${DATE_TIME}T18:30:00`,
    endDateTime: `${DATE_TIME}T19:30:00`,
    info: {}
  }
]

describe('Test the get available times state resource', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let tymlyService, statebox, diaryService, entryModel

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('should run the tymly service', done => {
    tymly.boot(
      {
        pluginPaths: [
          path.resolve(__dirname, './..'),
          path.resolve(__dirname, '../node_modules/@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './fixtures/test-blueprint')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        tymlyService = tymlyServices.tymly
        statebox = tymlyServices.statebox
        diaryService = tymlyServices.diaries
        entryModel = tymlyServices.storage.models['tymly_diaryEntry']
        done()
      }
    )
  })

  it('should check the diary has been picked up in the diary service via the blueprint', () => {
    expect(Object.keys(diaryService.diaries).includes('test_doctors')).to.eql(true)
  })

  it('should set up some data in the entries model', async () => {
    for (const datum of data) {
      const doc = await entryModel.upsert(datum, {})
      expect(doc).to.not.eql(undefined)
    }
  })

  it('should start the state machine to get available times', async () => {
    const executionDescription = await statebox.startExecution(
      { date: DATE_TIME },
      GET_TIMES_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(executionDescription.currentStateName).to.eql('GetAvailableTimes')
    expect(executionDescription.currentResource).to.eql('module:getAvailableDiarySlots')
    expect(executionDescription.status).to.eql('SUCCEEDED')

    const filtered = executionDescription.ctx.availableTimes.filter(e => ['10:30 - 11:30', '12:30 - 13:30', '18:30 - 19:30'].includes(e.label))
    expect(filtered.length).to.eql(0)

    expect(executionDescription.ctx.availableTimes[0].label).to.eql('08:30 - 09:30')
    expect(executionDescription.ctx.availableTimes[10].label).to.eql('21:30 - 22:30')
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
