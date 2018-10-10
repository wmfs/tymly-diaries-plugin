/* eslint-env mocha */

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect

const GET_TIMES_STATE_MACHINE_NAME = 'test_getAvailableTimes'

const DATE_TIME_1 = '2018-04-23'
const DATE_TIME_2 = '2018-04-24'

// booked: 8:30-9:30, 9:30-10:30, 12:30-13:30(x5), 13:30-14:30(x5) 14:30-15:30
const initialData = [
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T08:30:00',
    endDateTime: '2018-04-23T09:30:00',
    info: {},
    id: '6d7fdfe8-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T09:30:00',
    endDateTime: '2018-04-23T10:30:00',
    info: {},
    id: '6d7fdb4c-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T14:30:00',
    endDateTime: '2018-04-23T15:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T13:30:00',
    endDateTime: '2018-04-23T14:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T13:30:00',
    endDateTime: '2018-04-23T14:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T13:30:00',
    endDateTime: '2018-04-23T14:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T13:30:00',
    endDateTime: '2018-04-23T14:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T13:30:00',
    endDateTime: '2018-04-23T14:30:00',
    info: {},
    id: '6d7fde94-46d3-11e8-842f-0ed5f89f718b'
  }
]

// booked: 8:30-9:30(x10)
const standardMaxConcurrency = [
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-24T08:30:00',
    endDateTime: '2018-04-24T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  }
]

const additionalData = [
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T08:30:00',
    endDateTime: '2018-04-23T09:30:00',
    info: {},
    id: '426b87a8-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T08:30:00',
    endDateTime: '2018-04-23T09:30:00',
    info: {},
    id: 'b0250512-46f6-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T10:30:00',
    endDateTime: '2018-04-23T11:30:00',
    info: {},
    id: '426b8be0-46f1-11e8-842f-0ed5f89f718b'
  },
  {
    originId: 'test',
    diaryId: 'doctors',
    startDateTime: '2018-04-23T20:30:00',
    endDateTime: '2018-04-23T21:30:00',
    info: {},
    id: '426b8e06-46f1-11e8-842f-0ed5f89f718b'
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

  it('should setup some data in the entries model, including 5 bookings at 12:30 and 13:30 to test concurrency', async () => {
    for (const datum of initialData) {
      const doc = await entryModel.upsert(datum, {})
      expect(doc).to.not.eql(undefined)
    }
  })

  it('should setup some data in the entries model, to test for the general max concurrency', async () => {
    for (const datum of standardMaxConcurrency) {
      const doc = await entryModel.upsert(datum, {})
      expect(doc).to.not.eql(undefined)
    }
  })

  it('should find that 0830-0930 does not appear as per max standard concurrency rules', async () => {
    const executionDescription = await statebox.startExecution(
      { date: DATE_TIME_2 },
      GET_TIMES_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(executionDescription.currentStateName).to.eql('GetAvailableTimes')
    expect(executionDescription.currentResource).to.eql('module:getAvailableDiarySlots')
    expect(executionDescription.status).to.eql('SUCCEEDED')
    const filtered = executionDescription.ctx.availableTimes.filter(e => e.label === '08:30 - 09:30')
    expect(filtered.length).to.eql(0)
  })

  it('should find that 1230-1330 and 1330-1430 are not listed as available', async () => {
    const executionDescription = await statebox.startExecution(
      { date: DATE_TIME_1 },
      GET_TIMES_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(executionDescription.currentStateName).to.eql('GetAvailableTimes')
    expect(executionDescription.currentResource).to.eql('module:getAvailableDiarySlots')
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(executionDescription.ctx.availableTimes[0].label).to.eql('08:30 - 09:30')
    const filtered = executionDescription.ctx.availableTimes.filter(e => ['12:30 - 13:30', '13:30 - 14:30'].includes(e.label))
    expect(filtered.length).to.eql(0)
  })

  it('should setup some test additionalData in the entries model to remove/change the availableTimes return', async () => {
    for (const datum of additionalData) {
      const doc = await entryModel.upsert(datum, {})
      expect(doc).to.not.eql(undefined)
    }
  })

  it('should start a second get available times state machine', async () => {
    const executionDescription = await statebox.startExecution(
      { date: DATE_TIME_1 },
      GET_TIMES_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )
    expect(executionDescription.currentStateName).to.eql('GetAvailableTimes')
    expect(executionDescription.currentResource).to.eql('module:getAvailableDiarySlots')
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(executionDescription.ctx.availableTimes[0].label).to.be.a('string')
    expect(executionDescription.ctx.availableTimes[0].label).to.eql('09:30 - 10:30')
    expect(executionDescription.ctx.availableTimes[0].value.includes('2018-04-23T09:30:00')).to.eql(true)
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
