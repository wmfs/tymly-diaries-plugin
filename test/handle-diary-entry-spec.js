/* eslint-env mocha */

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const moment = require('moment')

const CREATE_ENTRY_STATE_MACHINE_NAME = 'test_createDiaryEntry'
const CANCEL_ENTRY_STATE_MACHINE_NAME = 'test_cancelDiaryEntry'

const DURATION = 60
const DATE_TIME = '2018-04-23T09:30:00+01:00'
const EXPECTED_END_DATE_TIME = moment(DATE_TIME).add(DURATION, 'minutes').format()
const BAD_DATE_TIME = '2018-04-23T06:30:00'
const BAD_DATE_TIME_1 = '2018-04-23T12:30:00'
const BAD_DATE_TIME_2 = '2018-04-23T15:30:00'

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
      {startDateTime: DATE_TIME},
      CREATE_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
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

  it('should start the create diary state machine with a date time that does not fall within the start/end rules', async () => {
    const execDesc = await statebox.startExecution(
      {startDateTime: BAD_DATE_TIME},
      CREATE_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
    )

    expect(execDesc.currentStateName).to.eql('CreateEntry')
    expect(execDesc.currentResource).to.eql('module:createDiaryEntry')
    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorMessage).to.eql('createDiaryEntryFail')
    expect(execDesc.errorCode).to.eql('The appointment must be after 08:30.')
  })

  it('should start the create diary state machine with a start date time that collides with lunch time\'s maximum concurrency', async () => {
    const execDesc = await statebox.startExecution(
      {startDateTime: BAD_DATE_TIME_1},
      CREATE_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
    )

    expect(execDesc.currentStateName).to.eql('CreateEntry')
    expect(execDesc.currentResource).to.eql('module:createDiaryEntry')
    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorMessage).to.eql('createDiaryEntryFail')
    expect(execDesc.errorCode).to.eql('Max. appointments already made at this time.')
  })

  it('should start the create diary state machine with a start date time where max concurrency has already been met', async () => {
    const execDesc = await statebox.startExecution(
      {startDateTime: BAD_DATE_TIME_2},
      CREATE_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
    )

    expect(execDesc.currentStateName).to.eql('CreateEntry')
    expect(execDesc.currentResource).to.eql('module:createDiaryEntry')
    expect(execDesc.status).to.eql('FAILED')
    expect(execDesc.errorCode).to.eql('Max. appointments already made at this time.')
    expect(execDesc.errorMessage).to.eql('createDiaryEntryFail')
  })

  it('should start the cancel-diary-entry state machine', async () => {
    const execDesc = await statebox.startExecution(
      {id: entryId},
      CANCEL_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
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
        {startDateTime: time},
        CREATE_ENTRY_STATE_MACHINE_NAME,
        {sendResponse: 'COMPLETE'}
      )
      if (i < 3) {
        expect(execDesc.status).to.eql('SUCCEEDED')
      }
      if (i === 3) {
        expect(execDesc.status).to.eql('FAILED')
        expect(execDesc.errorCode).to.eql('Max. appointments of 3 already made at 2018-06-10 10:30:00.')
      }
    }
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
