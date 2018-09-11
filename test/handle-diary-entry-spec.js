/* eslint-env mocha */

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const moment = require('moment')
const isWithinRange = require('../lib/components/state-resources/create-diary-entry/helpers/is-within-range')

const CREATE_ENTRY_STATE_MACHINE_NAME = 'test_createDiaryEntry'
const CANCEL_ENTRY_STATE_MACHINE_NAME = 'test_cancelDiaryEntry'

const DURATION = 60
const DATE_TIME = '2018-04-23T09:30:00+01:00'
const EXPECTED_END_DATE_TIME = moment(DATE_TIME).add(DURATION, 'minutes').format('YYYY-MM-DD HH:mm:ss')
const BAD_DATE_TIME = '2018-04-23T12:30:00'

const TEST_RECORDS = [
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-23T09:30:00',
    endDateTime: '2018-04-23T10:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-23T12:30:00',
    endDateTime: '2018-04-23T13:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-22T11:30:00',
    endDateTime: '2018-04-22T12:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-23T15:30:00',
    endDateTime: '2018-04-23T16:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-23T15:30:00',
    endDateTime: '2018-04-23T16:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-23T15:30:00',
    endDateTime: '2018-04-23T16:30:00'
  },
  {
    diaryId: 'doctors',
    startDateTime: '2018-04-22T15:30:00',
    endDateTime: '2018-04-22T16:30:00'
  }
]

const TEST_ENTRIES = [
  {
    startDateTime: '2018-04-25T07:30:00',
    endDateTime: '2018-04-25 08:30:00'
  },
  {
    startDateTime: '2018-04-25T08:30:00',
    endDateTime: '2018-04-25 09:30:00'
  },
  {
    startDateTime: '2018-04-25T09:30:00',
    endDateTime: '2018-04-25 10:30:00'
  },
  {
    startDateTime: '2018-04-25T10:30:00',
    endDateTime: '2018-04-25 11:30:00'
  },
  {
    startDateTime: '2018-04-25T11:30:00',
    endDateTime: '2018-04-25 12:30:00'
  },
  {
    startDateTime: '2018-04-25T12:30:00',
    endDateTime: '2018-04-25 13:30:00'
  },
  {
    startDateTime: '2018-04-25T16:30:00',
    endDateTime: '2018-04-25 17:30:00'
  },
  {
    startDateTime: '2018-04-25T17:30:00',
    endDateTime: '2018-04-25 18:30:00'
  },
  {
    startDateTime: '2018-04-25T19:30:00',
    endDateTime: '2018-04-25 20:30:00'
  },
  {
    startDateTime: '2018-04-25T20:30:00',
    endDateTime: '2018-04-25 21:30:00'
  },
  {
    startDateTime: '2018-04-25T21:30:00',
    endDateTime: '2018-04-25 22:30:00'
  },
  {
    startDateTime: '2018-04-25T22:30:00',
    endDateTime: '2018-04-25 23:30:00'
  }
]

describe('Tests the state resource which handle diary entries', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let tymlyService, statebox, diaryService, entryId, entryModel

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

  it('should create some records', async () => {
    for (let rec of TEST_RECORDS) { await entryModel.upsert(rec, {}) }

    expect((await entryModel.find({})).length).to.eql(TEST_RECORDS.length)
  })

  it('should start the create diary state machine with a valid date time', async () => {
    expect((await entryModel.find({})).length).to.eql(TEST_RECORDS.length)

    const execDesc = await statebox.startExecution(
      { startDateTime: DATE_TIME },
      CREATE_ENTRY_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(execDesc.currentStateName).to.eql('CreateEntry')
    expect(execDesc.currentResource).to.eql('module:createDiaryEntry')
    expect(execDesc.status).to.eql('SUCCEEDED')
    entryId = execDesc.ctx.idProperties.id

    expect((await entryModel.find({})).length).to.eql(TEST_RECORDS.length + 1)
  })

  it('should check the upserted record', async () => {
    const doc = await entryModel.findById(entryId)
    expect(doc.diaryId).to.eql('doctors')
    expect(doc.originId).to.eql(CREATE_ENTRY_STATE_MACHINE_NAME)
    expect(doc.startDateTime).to.eql('2018-04-23 09:30:00')
    expect(doc.endDateTime).to.eql(EXPECTED_END_DATE_TIME)
  })

  it('should start the create diary state machine with a start date time that collides with lunch time\'s maximum concurrency', async () => {
    const execDesc = await statebox.startExecution(
      { startDateTime: BAD_DATE_TIME },
      CREATE_ENTRY_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(execDesc.currentStateName).to.eql('CreateEntry')
    expect(execDesc.currentResource).to.eql('module:createDiaryEntry')
    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorCode).to.eql('createDiaryEntryFail')
    expect(execDesc.errorMessage).to.eql('Max. appointments already made at this time.')
  })

  it('should start the cancel-diary-entry state machine', async () => {
    const execDesc = await statebox.startExecution(
      { id: entryId },
      CANCEL_ENTRY_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    expect(execDesc.currentStateName).to.eql('CancelEntry')
    expect(execDesc.currentResource).to.eql('module:cancelDiaryEntry')
    expect(execDesc.status).to.eql('SUCCEEDED')
  })

  it('should fail to find deleted record', async () => {
    const doc = await entryModel.findById(entryId)
    expect(doc).to.eql(undefined)
  })

  it('should check the amount of entries remain as they were at the start', async () => {
    const doc = await entryModel.find({})
    expect(doc.length).to.eql(TEST_RECORDS.length)
  })

  it('should attempt to create > 3 entries at the same date time and expect failure', async () => {
    const time = `2018-06-10T10:30:00`

    for (let i = 0; i < 4; i++) {
      const execDesc = await statebox.startExecution(
        { startDateTime: time },
        CREATE_ENTRY_STATE_MACHINE_NAME,
        { sendResponse: 'COMPLETE' }
      )
      if (i < 4) {
        expect(execDesc.status).to.eql('SUCCEEDED')
      }
      if (i === 4) {
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorMessage).to.eql('Max. appointments of 3 already made at 2018-06-10 10:30:00.')
      }
    }
  })

  it('should attempt to create > 10 entries at the same date and expect failure', async () => {
    const times = [`2018-07-23T08:30:00`]
    for (let i = 1; i < 11; i++) {
      const time = moment(times[i - 1]).add(1, 'hour')
      if (time.format('HH:mm:ss') === '11:30:00') {
        times.push(time.add(3, 'hours').format('YYYY-MM-DDTHH:mm:ss'))
      } else if (time.format('HH:mm:ss') === '12:30:00') {
        times.push(time.add(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'))
      } else if (time.format('HH:mm:ss') === '13:30:00') {
        times.push(time.add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss'))
      } else {
        times.push(time.format('YYYY-MM-DDTHH:mm:ss'))
      }
    }

    expect(times.length).to.eql(11)

    for (const [i, time] of times.entries()) {
      const execDesc = await statebox.startExecution(
        { startDateTime: time },
        CREATE_ENTRY_STATE_MACHINE_NAME,
        { sendResponse: 'COMPLETE' }
      )

      if (i === 10) {
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorMessage).to.eql('Max. appointments of 10 already made on 2018-07-23.')
      } else {
        expect(execDesc.status).to.eql('SUCCEEDED')
      }
    }
  })

  it('should attempt to create entries at each time slot of the day', async () => {
    for (const [i, timeslot] of TEST_ENTRIES.entries()) {
      const execDesc = await statebox.startExecution(
        { startDateTime: timeslot.startDateTime },
        CREATE_ENTRY_STATE_MACHINE_NAME,
        { sendResponse: 'COMPLETE' }
      )

      if (i === 0) {
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorMessage).to.eql('The appointment must be after 08:30.')
      } else if (i === 4 || i === 5) {
        // Lunch time restrictions
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorMessage).to.eql('Max. appointments already made at this time.')
      } else if (i === 11) {
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorMessage).to.eql('The appointment must be before 22:30.')
      } else {
        expect(execDesc.status).to.eql('SUCCEEDED')
        const id = execDesc.ctx.idProperties.id
        const res = await entryModel.findById(id)
        expect(res.endDateTime.split('+')[0]).to.eql(timeslot.endDateTime)
      }
    }
  })

  it('should test the function to check if a date time is within a range (exclusive)', () => {
    const good = [
      moment('2018-04-25T08:30:00'),
      moment('2018-04-25T21:30:00'),
      moment('2018-04-25T13:30:00'),
      moment('2018-04-25T12:00:00')
    ]
    const bad = [
      moment('2018-04-25T12:30:00'),
      moment('2018-04-25T12:10:00'),
      moment('2018-04-25T13:00:00')
    ]

    const start = moment('2018-04-25T12:00:00')
    const end = moment('2018-04-25T13:30:00')

    for (let time of good) {
      expect(isWithinRange(start, end, time)).to.eql(false)
    }

    for (let time of bad) {
      expect(isWithinRange(start, end, time)).to.eql(true)
    }
  })

  it('should test a booking with timezone', async () => {
    const start = '2018-08-21T08:30:00+01:00'
    const end = '2018-08-21 09:30:00'

    const execDesc = await statebox.startExecution(
      { startDateTime: start },
      CREATE_ENTRY_STATE_MACHINE_NAME,
      { sendResponse: 'COMPLETE' }
    )

    const id = execDesc.ctx.idProperties.id
    const res = await entryModel.findById(id)
    expect(res.endDateTime).to.eql(end)
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
