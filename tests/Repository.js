import should from 'should/as-function'
import sinon from 'sinon'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateEvent = require(`${libFolder}/AggregateEvent`).default
const AggregateMethod = require(`${libFolder}/AggregateMethod`).default
const AggregateFactory = require(`${libFolder}/AggregateFactory`).default
const Repository = require(`${libFolder}/Repository`).default
const AggregateLoadingError = require(`${libFolder}/Repository`).AggregateLoadingError
const AggregateSavingError = require(`${libFolder}/Repository`).AggregateSavingError

function getMockEventstoreService (working) {
  let streams = {
    'SnapshottingAggregate::xyz': [
      {type: 'SomethingHappened', data: '{"when": 1490306633949}'},
      {type: 'SomethingHappened', data: '{"when": 1490306670621}'},
      {type: 'SomethingHappened', data: '{"when": 1490306680621}'},
      {type: 'SomethingHappened', data: '{"when": 1490306780621}'}
    ]
  }

  function getEventsFromStream (stream) {
    return streams[stream] || null
  }
  function addEventsToStream (stream, events) {
    let existingEvents = getEventsFromStream(stream)
    if (existingEvents) {
      existingEvents.push(events)
    } else {
      streams[stream] = events
    }
  }

  return {
    getEventsOfStream: ({stream, fromVersion}) => Promise.resolve().then(() => {
      if (!working) throw new Error('eventstoreservice not working')
      let events = getEventsFromStream(stream)
      return events ? events.slice(fromVersion) : []
    }),
    saveEventsToMultipleStreams: (writeOperations) => Promise.resolve().then(() => {
      if (!working) throw new Error('eventstoreservice not working')
      writeOperations.forEach(({stream, events, expectedVersion}) => {
        let existingEvents = getEventsFromStream(stream)
        let actualStreamVersion = (existingEvents && existingEvents.length) || 0
        switch (expectedVersion) {
          case -2: break
          case -1:
            if (!actualStreamVersion) throw new Error(`stream ${stream} does not exists`)
            break
          default:
            if (expectedVersion !== actualStreamVersion) throw new Error(`stream ${stream} version mismatch`)
        }
      })
      writeOperations.forEach(({stream, events}) => addEventsToStream(stream, events))
    })
  }
}
function getMockSnapshotService (working) {
  let snapshots = {
    'SnapshottingAggregate::xyz': {
      version: 2,
      state: '{"thingsHappened": 2, "lastThingAppenedOn": 1490306670621}'
    }
  }

  return {
    loadSnapshot: (snapshotKey) => Promise.resolve().then(() => {
      if (!working) throw new Error('snapshotservice not working')
      return snapshots[snapshotKey]
    }),
    saveSnapshot: (snapshotKey, snapshot) => Promise.resolve().then(() => {
      if (!working) throw new Error('snapshotservice not working')
      snapshots[snapshotKey] = snapshot
    })
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
  it('throws if snapshotService is truthy and has not a valid interface {loadSnapshot(), saveSnapshot()}', () => {
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
    }).throw(new RegExp('^snapshotService.saveSnapshot.* MUST be a function$'))
    should(() => {
      Repository({
        eventstoreService: {
          getEventsOfStream () {},
          saveEventsToMultipleStreams () {}
        },
        snapshotService: {
          saveSnapshot () {}
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
          saveSnapshot () {}
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

    sinon.spy(ifaces.snapshotService, 'loadSnapshot')

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

    sinon.spy(ifaces.eventstoreService, 'getEventsOfStream')

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
  it('if a snapshotService is available, attempts to save a snapshot of each aggregate needing it after being loaded', (done) => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)
    let SnapshottingAggregate = AggregateFactory({
      type: 'SnapshottingAggregate',
      methods: [],
      errors: [],
      events: [],
      snapshotThreshold: 2
    })
    let AnotherAggregate = AggregateFactory({
      type: 'AnotherAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let snapshotting = SnapshottingAggregate('xyz')
    let another = AnotherAggregate('xyz')

    sinon.spy(ifaces.snapshotService, 'saveSnapshot')

    repository.load([snapshotting, another]).then(([snapshottingLoaded, anotherLoaded]) => {
      should(ifaces.snapshotService.saveSnapshot.calledOnce).be.True()
      // console.log(ifaces.snapshotService.saveSnapshot.firstCall)
      should(ifaces.snapshotService.saveSnapshot.calledWithMatch(snapshotting.snapshotKey, {
        version: snapshottingLoaded.version,
        state: snapshottingLoaded.serializedState
      })).be.True()
      done()
    })
    .catch(done)
  })
  it('returns a promise of a list of loaded aggregates', () => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)
    should(repository.load([])).be.a.Promise()
  })
  it('the returned promise is rejected with `AggregateLoadingError` if the loading of an aggregate fails', (done) => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(false),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    let Aggregate = AggregateFactory({
      type: 'Aggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    repository.load([aggregate])
    .then(() => done(new Error('should fail')))
    .catch((e) => {
      should(e).be.an.instanceOf(Error)
      should(e).be.an.instanceOf(AggregateLoadingError)
      done()
    })
  })
  it('the AggregateLoadingError instance has a .originalError property that references the error provided by the eventstoreService', (done) => {
    let ifaces = {
      eventstoreService: getMockEventstoreService(false),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    let Aggregate = AggregateFactory({
      type: 'Aggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    repository.load([aggregate])
    .then(() => done(new Error('should fail')))
    .catch((e) => {
      should(e.originalError).be.an.instanceOf(Error)
      should(e.originalError.message).equal('eventstoreservice not working')
      done()
    })
    .catch(done)
  })
})

describe('repository.save(aggregates)', () => {
  it('throws if aggregates is not an array of 0 or more aggregates instances', () => {
    let repository = Repository({eventstoreService: getMockEventstoreService(true)})
    should(() => {
      repository.save()
    }).throw(new RegExp('^aggregates MUST be an array of 0 or more aggregate instances unique by stream$'))
    should(() => {
      repository.save([1])
    }).throw(new RegExp('^aggregates MUST be an array of 0 or more aggregate instances unique by stream$'))

    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')
    should(() => {
      repository.save([aggregate])
    }).not.throw()
  })
  it('throws if aggregates are not unique by stream', () => {
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')
    let aggregateSameStream = MyAggregate('xyz')

    let repository = Repository({eventstoreService: getMockEventstoreService(true)})
    should(() => {
      repository.save([aggregate, aggregateSameStream])
    }).throw(new RegExp('^aggregates MUST be an array of 0 or more aggregate instances unique by stream$'))
  })
  it('calls eventstoreService.saveEventsToMultipleStreams() with an array of objects representing stream writing requests', (done) => {
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'DoThis',
          handler: (aggregate) => aggregate.emit.DidThis()
        })
      ],
      errors: [],
      events: [
        AggregateEvent({
          type: 'DidThis',
          reducer: () => {}
        })
      ]
    })
    let aggregate = MyAggregate('xyz')
    aggregate.DoThis()

    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    sinon.spy(ifaces.eventstoreService, 'saveEventsToMultipleStreams')
    repository.save([aggregate]).then(() => {
      should(ifaces.eventstoreService.saveEventsToMultipleStreams.calledOnce).be.True()
      done()
    })
    .catch(done)
  })
  it('returns a promise of a list of loaded aggregates', () => {
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = MyAggregate('xyz')

    let ifaces = {
      eventstoreService: getMockEventstoreService(true),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    should(repository.save([aggregate])).be.a.Promise()
  })
  it('the returned promise is rejected with `AggregateSavingError` if the operation fails', (done) => {
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'DoThis',
          handler: (aggregate) => aggregate.emit.DidThis()
        })
      ],
      errors: [],
      events: [
        AggregateEvent({
          type: 'DidThis',
          reducer: () => {}
        })
      ]
    })
    let aggregate = MyAggregate('xyz')
    aggregate.DoThis()

    let ifaces = {
      eventstoreService: getMockEventstoreService(false),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    repository.save([aggregate])
      .then(() => done('Should reject with AggregateSavingError'))
      .catch((e) => {
        should(e).be.an.instanceOf(Error)
        should(e).be.an.instanceOf(AggregateSavingError)
        done()
      })
      .catch(done)
  })
  it('the AggregateSavingError instance has a .originalError property that references the error provided by the eventstoreService', (done) => {
    let MyAggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'DoThis',
          handler: (aggregate) => aggregate.emit.DidThis()
        })
      ],
      errors: [],
      events: [
        AggregateEvent({
          type: 'DidThis',
          reducer: () => {}
        })
      ]
    })
    let aggregate = MyAggregate('xyz')
    aggregate.DoThis()

    let ifaces = {
      eventstoreService: getMockEventstoreService(false),
      snapshotService: getMockSnapshotService(true)
    }
    let repository = Repository(ifaces)

    repository.save([aggregate])
      .then(() => done('Should reject with AggregateSavingError'))
      .catch((e) => {
        should(e.originalError).be.an.instanceOf(Error)
        should(e.originalError.message).equal('eventstoreservice not working')
        done()
      })
      .catch(done)
  })
})
