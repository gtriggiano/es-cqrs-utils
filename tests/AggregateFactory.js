import should from 'should/as-function'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateFactory = require(`${libFolder}/AggregateFactory`).default
const AggregateMethod = require(`${libFolder}/AggregateMethod`).default
const AggregateEvent = require(`${libFolder}/AggregateEvent`).default

describe('AggregateFactory(config)', () => {
  it('is a function', () => should(AggregateFactory).be.a.Function())
  it('throws if config.type is not a valid identifier', () => {
    should(() => AggregateFactory({
      methods: [],
      errors: [],
      events: []
    })).throw(/type MUST be a valid identifier/)
    should(() => AggregateFactory({
      type: '',
      methods: [],
      errors: [],
      events: []
    })).throw(/type MUST be a valid identifier/)
    should(() => AggregateFactory({
      type: '=bad',
      methods: [],
      errors: [],
      events: []
    })).throw(/type MUST be a valid identifier/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: []
    })).not.throw()
  })
  it('throws if config.description is set and is not a string', () => {
    should(() => AggregateFactory({
      type: 'myevent',
      description: true,
      methods: [],
      errors: [],
      events: []
    })).throw()
    should(() => AggregateFactory({
      type: 'myevent',
      description: '',
      methods: [],
      errors: [],
      events: []
    })).not.throw()
  })
  it('throws if config.getStreamName is truthy and is not a function', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: true
    })).throw(/getStreamName MUST be either 'falsy' or a function or a valid identifier/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: 'goodStreamName'
    })).not.throw()
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: () => {}
    })).not.throw()
  })
  it('throws if config.methods is not a list of AggregateMethod instances', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      errors: [],
      events: []
    })).throw(/methods MUST be an array of AggregateMethod\(s\)/)
    should(() => AggregateFactory({
      type: 'myagregate',
      method: null,
      errors: [],
      events: []
    })).throw(/methods MUST be an array of AggregateMethod\(s\)/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [
        AggregateMethod({name: 'mymethod', handler: () => {}}),
        1
      ],
      errors: [],
      events: []
    })).throw(/methods\[1\] is not an AggregateMethod/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [AggregateMethod({name: 'mymethod', handler: () => {}})],
      errors: [],
      events: []
    })).not.throw()
  })
  it('throws if config.methods are not unique by method.name', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [
        AggregateMethod({name: 'mymethod', handler: () => {}}),
        AggregateMethod({name: 'mymethod', handler: () => {}})
      ],
      errors: [],
      events: []
    })).throw(/duplicate method name: mymethod/)
  })
  it('throws if config.errors is not a list of Error constructors', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      events: []
    })).throw(/errors MUST be an array of Error constructors/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: null,
      events: []
    })).throw(/errors MUST be an array of Error constructors/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [
        Error,
        1
      ],
      events: []
    })).throw(/errors\[1\] is not an error constructor/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [Error, TypeError],
      events: []
    })).not.throw()
  })
  it('throws if config.errors are not unique by error.name', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [Error, Error],
      events: []
    })).throw(/duplicate error name: Error/)
  })
  it('throws if config.events is not a list of AggregateEvent instances', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: []
    })).throw(/events MUST be an array of AggregateEvent\(s\)/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: null
    })).throw(/events MUST be an array of AggregateEvent\(s\)/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [
        AggregateEvent({type: 'SomethingHappened', reducer: () => {}}),
        1
      ]
    })).throw(/events\[1\] is not an AggregateEvent/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [AggregateEvent({type: 'SomethingHappened', reducer: () => {}})]
    })).not.throw()
  })
  it('throws if config.events are not unique by event.type', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [
        AggregateEvent({type: 'SomethingHappened', reducer: () => {}}),
        AggregateEvent({type: 'SomethingHappened', reducer: () => {}})
      ]
    })).throw(/duplicate event type: SomethingHappened/)
  })
  it('throws if config.serializeState is truthy and is not a function', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      serializeState: 'bad'
    })).throw(/serializeState MUST be either 'falsy' or a function/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      serializeState: () => {}
    })).not.throw()
  })
  it('throws if config.deserializeState is truthy and is not a function', () => {
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      deserializeState: 'bad'
    })).throw(/deserializeState MUST be either 'falsy' or a function/)
    should(() => AggregateFactory({
      type: 'myagregate',
      methods: [],
      errors: [],
      events: [],
      deserializeState: () => {}
    })).not.throw()
  })

  describe('Aggregate(id, snapshot, events) = AggregateFactory(config)', () => {
    it('is a function')
    it('is an instance of AggregateFactory')
    it('throws?')
    it('Aggregate.name === config.type')
    it('Aggregate.type === config.type')
    it('Aggregate.description is a string, defaulting to `No description provided`')
    it('Aggregate.description === config.description, if provided')
    it('Aggregate.toString() === config.type')
    it('Aggregate.serializeState defaults to JSON.stringify')
    it('Aggregate.deserializeState defaults to JSON.parse')
    it('Aggregate.getStreamName is a function')
    it('Aggregate.getStreamName(id) === config.getStreamName(config.type, id)')

    describe('aggregate = Aggregate(aggregateId, aggregateSnapshot, aggregateEvents)', () => {
      it('is an instance of Aggregate')
      it('is an instance of AggregateEvent')
      it('aggregate.id === aggregateId')
      it('aggregate.type === Aggregate.type')
      it('aggregate.stream === Aggregate.type')
      it('aggregate.version is an integer, starting at 0 for aggregates with no events')
      it('aggregate.Factory === Aggregate')
      it('aggregate.emit is a proxy')
      it('aggregate.error is a proxy')
      it('aggregate.state')
      it('aggregate.serializedState')
      it('aggregate.appendEvents')
      it('aggregate.isDirty')
      it('aggregate.newEvents')
      it('aggregate.persistenceConsistencyPolicy')
      it('aggregate is a proxy which exposes the methods passed to AggregateFactory')
    })
  })
})
