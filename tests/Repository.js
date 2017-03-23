import should from 'should/as-function'
import sinon from 'sinon'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateFactory = require(`${libFolder}/AggregateFactory`).default
const Repository = require(`${libFolder}/Repository`).default

function getMockEventstoreService (working) {
  return {
    getEventsOfStream: sinon.stub().returns(
      working
       ? Promise.resolve([
         {type: 'SomethingHappened', data: '{"when": 1490306633949}'},
         {type: 'SomethingChanged', data: '{"when": 1490306670621}'}
       ])
       : Promise.reject(new Error('eventstore error'))
     ),
    saveEventsToMultipleStreams: sinon.stub().returns(
      working
        ? Promise.resolve()
        : Promise.reject(new Error('eventstore error'))
    )
  }
}
function getMockSnapshotService (working) {
  return {
    loadSnapshot: sinon.stub().returns(
      working
       ? Promise.resolve({
         version: 4,
         state: '{"computedProp": 42}'
       })
       : Promise.reject(new Error('snapshot service error'))
     ),
    makeSnapshot: sinon.stub().returns(
      working
        ? Promise.resolve()
        : Promise.reject(new Error('snapshot service error'))
    )
  }
}

describe('Repository({eventstoreService, snapshotService})', () => {
  it('throws if eventstoreService has not a valid interface {getEventsOfStream(), saveEventsToMultipleStreams()}', () => {
    should(() => {
      Repository({})
    }).throw(new RegExp('^eventstoreService MUST be an object like .*$'))
    should(() => {
      Repository({eventstoreService: {getEventsOfStream () {}}})
    }).throw(new RegExp('^eventstoreService.saveEventsToMultipleStreams.* MUST be a function$'))
    should(() => {
      Repository({eventstoreService: {saveEventsToMultipleStreams () {}}})
    }).throw(new RegExp('^eventstoreService.getEventsOfStream.* MUST be a function$'))

    should(() => {
      Repository({eventstoreService: {getEventsOfStream () {}, saveEventsToMultipleStreams () {}}})
    }).not.throw()
  })
  it('throws if snapshotService is truthy and has not a valid interface {loadSnapshot(), makeSnapshot()}', () => {
    should(() => {
      Repository({
        eventstoreService: {
          getEventsOfStream () {},
          saveEventsToMultipleStreams () {}
        },
        snapshotService: true
      })
    }).throw(new RegExp('^snapshotService MUST be an object like .*$'))
    should(() => {
      Repository({
        eventstoreService: {
          getEventsOfStream () {},
          saveEventsToMultipleStreams () {}
        },
        snapshotService: {
          loadSnapshot () {}
        }
      })
    }).throw(new RegExp('^snapshotService.makeSnapshot.* MUST be a function$'))
    should(() => {
      Repository({
        eventstoreService: {
          getEventsOfStream () {},
          saveEventsToMultipleStreams () {}
        },
        snapshotService: {
          makeSnapshot () {}
        }
      })
    }).throw(new RegExp('^snapshotService.loadSnapshot.* MUST be a function$'))

    should(() => {
      Repository({
        eventstoreService: {
          getEventsOfStream () {},
          saveEventsToMultipleStreams () {}
        },
        snapshotService: {
          loadSnapshot () {},
          makeSnapshot () {}
        }
      })
    }).not.throw()
  })
})

describe('repository = Repository({eventstoreService, snapshotService})', function () {
  it('is an instance of Repository', () => {
    let repository = Repository({eventstoreService: getMockEventstoreService()})
    should(repository).be.an.instanceOf(Repository)
  })
  it('repository.load(aggregates) is a function', () => {
    let repository = Repository({eventstoreService: getMockEventstoreService()})
    should(repository.load).be.a.Function()
  })
  it('repository.save(aggregates) is a function', () => {
    let repository = Repository({eventstoreService: getMockEventstoreService()})
    should(repository.save).be.a.Function()
  })
})

describe('repository.load(aggregates)', () => {
  it('throws if aggregates is not an array of 0 or more aggregates instances', () => {
    let repository = Repository({eventstoreService: getMockEventstoreService(true)})
    should(() => {
      repository.load()
    }).throw(new RegExp('^aggregates MUST be an array of 0 or more aggregate instances$'))
    should(() => {
      repository.load([1])
    }).throw(new RegExp('^aggregates MUST be an array of 0 or more aggregate instances$'))

    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')
    should(() => {
      repository.load([aggregate])
    }).not.throw()
  })
  it('if a snapshotService is available, calls snapshotService.loadSnapshot(aggregate.snapshotKey) for each aggregate to load', (done) => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')
    let aggregate2 = MyAggregate('abc')
    repository.load([aggregate, aggregate2]).then(() => {
      should(ifaces.snapshotService.loadSnapshot.calledTwice).be.True()
      should(ifaces.snapshotService.loadSnapshot.calledWith(aggregate.snapshotKey)).be.True()
      should(ifaces.snapshotService.loadSnapshot.calledWith(aggregate2.snapshotKey)).be.True()
      done()
    })
    .catch(done)
  })
  it('calls eventstoreService.getEventsOfStream({stream, fromVersion}) for each aggregate to load', (done) => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(false)
    }
    let repository = Repository(ifaces)
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')
    let aggregate2 = MyAggregate('abc')
    repository.load([aggregate, aggregate2]).then(() => {
      should(ifaces.eventstoreService.getEventsOfStream.calledTwice).be.True()
      should(ifaces.eventstoreService.getEventsOfStream.calledWith({
        stream: aggregate.stream,
        fromVersion: aggregate.version
      })).be.True()
      should(ifaces.eventstoreService.getEventsOfStream.calledWith({
        stream: aggregate2.stream,
        fromVersion: aggregate2.version
      })).be.True()
      done()
    })
    .catch(done)
  })
  it('if a snapshotService is available, attempts to save a snapshot of each aggregate needing it after being loaded')
  it('returns a promise of a list of loaded aggregates')
  it('the returned promise is rejected with `AggregateLoadingError` if the loading of an aggregate fails')
  it('the AggregateLoadingError instance has a .originalError property that references the error provided by the eventstoreService')
})

describe('repository.save(aggregates)', () => {
  it('throws if aggregates is not an array of 0 or more aggregates instances')
  it('throws if aggregates are not unique by stream')
  it('calls eventstoreService.saveEventsToMultipleStreams() with an array of objects representing stream writing requests')
  it('returns a promise of a list of loaded aggregates')
  it('the returned promise is rejected with `AggregateSavingError` if the operation fails')
  it('the AggregateSavingError instance has a .originalError property that references the error provided by the eventstoreService')
})
