import should from 'should/as-function'

const libFolder = `../${process.env.LIB_FOLDER}`

const Repository = require(`${libFolder}/Repository`).default

describe.only('Repository({eventstoreService, snapshotService})', () => {
  it('throws if eventstoreService has not a valid interface')
  it('throws if snapshotService is truthy and has not a valid interface')
})

describe.only('repository = Repository({eventstoreService, snapshotService})', function () {
  it('is an instance of Repository')
  it('repository.load(aggregates) is a function')
  it('repository.load(aggregates) throws if aggregates is not an array of 0 or more aggregates instances')
  it('repository.load(aggregates) is returns a promise of a list of loaded aggregates')
  it('repository.load(aggregates) attempts to fetch a snapshot of each aggregate if it knows a snapshotService')
  it('repository.load(aggregates) attempts to save a snapshot of each aggregate needing it if it knows a snapshotService')
  it('repository.save(aggregates) is a function')
  it('repository.save(aggregates) throws if aggregates is not an array of 0 or more aggregates instances')
  it('repository.save(aggregates) returns a promise of a list of loaded aggregates')
})
