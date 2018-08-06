/* eslint-env mocha */

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect

const CREATE_ENTRY_STATE_MACHINE_NAME = 'test_makeDentistBooking'

const TEST_DATA = [
  {
    startDateTime: '2018-08-21T08:30:00',
    endDateTime: '2018-08-21 09:30:00'
  },
  {
    startDateTime: '2018-08-21T08:30:00+01:00',
    endDateTime: '2018-08-21 09:30:00'
  },
  {
    startDateTime: '2018-08-21T09:30:00',
    endDateTime: '2018-08-21 10:30:00'
  },
  {
    startDateTime: '2018-08-21T10:30:00',
    endDateTime: '2018-08-21 11:30:00'
  },
  {
    startDateTime: '2018-08-21T11:30:00',
    endDateTime: '2018-08-21 12:30:00'
  },
  {
    startDateTime: '2018-08-21T12:30:00',
    endDateTime: '2018-08-21 13:30:00'
  },
  {
    startDateTime: '2018-08-21T13:30:00',
    endDateTime: '2018-08-21 14:30:00'
  }
]

describe('Testing create booking', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let tymlyService, statebox, entryModel

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
        entryModel = tymlyServices.storage.models['tymly_diaryEntry']
        done()
      }
    )
  })

  it('should test a series of bookings', async () => {
    for (const test of TEST_DATA) {
      const execDesc = await statebox.startExecution(
        {startDateTime: test.startDateTime},
        CREATE_ENTRY_STATE_MACHINE_NAME,
        {sendResponse: 'COMPLETE'}
      )

      const id = execDesc.ctx.idProperties.id
      const res = await entryModel.findById(id)
      expect(res.endDateTime).to.eql(test.endDateTime)
    }
  })

  it('should test a booking with timezone', async () => {
    const start = '2018-08-21T08:30:00+01:00'
    const end = '2018-08-21 09:30:00'

    const execDesc = await statebox.startExecution(
      {startDateTime: start},
      CREATE_ENTRY_STATE_MACHINE_NAME,
      {sendResponse: 'COMPLETE'}
    )

    const id = execDesc.ctx.idProperties.id
    const res = await entryModel.findById(id)
    expect(res.endDateTime).to.eql(end)
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
