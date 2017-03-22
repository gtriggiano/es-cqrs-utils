import isInteger from 'lodash/isInteger'
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
      type: 'myaggregate',
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
  it('throws if config.getStreamName is truthy and is not a function or a string without spaces', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: true
    })).throw(/getStreamName MUST be either 'falsy' or a function or a string without spaces/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: 'goodStreamName'
    })).not.throw()
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      getStreamName: () => {}
    })).not.throw()
  })
  it('throws if config.methods is not a list of AggregateMethod instances', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
      errors: [],
      events: []
    })).throw(/methods MUST be an array of AggregateMethod\(s\)/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      method: null,
      errors: [],
      events: []
    })).throw(/methods MUST be an array of AggregateMethod\(s\)/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [
        AggregateMethod({name: 'mymethod', handler: () => {}}),
        1
      ],
      errors: [],
      events: []
    })).throw(/methods\[1\] is not an AggregateMethod/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [AggregateMethod({name: 'mymethod', handler: () => {}})],
      errors: [],
      events: []
    })).not.throw()
  })
  it('throws if config.methods are not unique by method.name', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
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
      type: 'myaggregate',
      methods: [],
      events: []
    })).throw(/errors MUST be an array of Error constructors/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: null,
      events: []
    })).throw(/errors MUST be an array of Error constructors/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [
        Error,
        1
      ],
      events: []
    })).throw(/errors\[1\] is not an error constructor/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [Error, TypeError],
      events: []
    })).not.throw()
  })
  it('throws if config.errors are not unique by error.name', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [Error, Error],
      events: []
    })).throw(/duplicate error name: Error/)
  })
  it('throws if config.events is not a list of AggregateEvent instances', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: []
    })).throw(/events MUST be an array of AggregateEvent\(s\)/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: null
    })).throw(/events MUST be an array of AggregateEvent\(s\)/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [
        AggregateEvent({type: 'SomethingHappened', reducer: () => {}}),
        1
      ]
    })).throw(/events\[1\] is not an AggregateEvent/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [AggregateEvent({type: 'SomethingHappened', reducer: () => {}})]
    })).not.throw()
  })
  it('throws if config.events are not unique by event.type', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
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
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      serializeState: 'bad'
    })).throw(/serializeState MUST be either 'falsy' or a function/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      serializeState: () => {}
    })).not.throw()
  })
  it('throws if config.deserializeState is truthy and is not a function', () => {
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      deserializeState: 'bad'
    })).throw(/deserializeState MUST be either 'falsy' or a function/)
    should(() => AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [],
      deserializeState: () => {}
    })).not.throw()
  })

  describe.only('Aggregate(id, snapshot, events) = AggregateFactory(config)', () => {
    it('is a function', () => should(AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })).be.a.Function())
    it('is an instance of AggregateFactory', () => should(AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })).be.an.instanceOf(AggregateFactory))
    it('throws?')
    it('Aggregate.name === config.type', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.name).equal('myaggregate')
    })
    it('Aggregate.type === config.type', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.type).equal('myaggregate')
    })
    it('Aggregate.description is a string, defaulting to `No description provided`', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.description).equal('No description provided')
    })
    it('Aggregate.description === config.description, if provided', () => {
      let customDescription = 'customDescription'
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        description: customDescription,
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.description).equal(customDescription)
    })
    it('Aggregate.toString() === config.type', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.toString()).equal('myaggregate')
    })
    it('Aggregate.serializeState defaults to JSON.stringify', () => {
      let testObj = {one: 1, two: 'two'}
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.serializeState(testObj)).equal(JSON.stringify(testObj))
    })
    it('Aggregate.deserializeState defaults to JSON.parse', () => {
      let testObj = {one: 1, two: 'two'}
      let serializedState = JSON.stringify(testObj)
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.deserializeState(serializedState)).eql(testObj)
    })
    it('Aggregate.getStreamName is a function', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.getStreamName).be.a.Function()
    })
    it('Aggregate.getStreamName defaults to (aggregateId) => `${Aggregate.type}${aggregateId ? `::${aggregateId}` : \'\'}`', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.getStreamName('xyz')).equal('myaggregate::xyz')
      should(Aggregate.getStreamName()).equal('myaggregate')
    })
    it('Aggregate.getStreamName(id) === config.getStreamName(config.type, id) || Aggregate.getStreamName(id) === config.getStreamName', () => {
      let Aggregate = AggregateFactory({
        type: 'myaggregate',
        getStreamName: (type, id) => `test-${type}-${id}`,
        methods: [],
        errors: [],
        events: []
      })
      should(Aggregate.getStreamName('xyz')).equal('test-myaggregate-xyz')

      let SingularAggregate = AggregateFactory({
        type: 'myaggregate',
        getStreamName: 'myaggregate-uniq-stream',
        methods: [],
        errors: [],
        events: []
      })
      should(SingularAggregate.getStreamName('xyz')).equal('myaggregate-uniq-stream')
    })

    describe('aggregate = Aggregate(aggregateId, aggregateSnapshot, aggregateEvents)', () => {
      it('is an instance of Aggregate', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate).be.an.instanceOf(Aggregate)
      })
      it('is an instance of AggregateFactory', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate).be.an.instanceOf(AggregateFactory)
      })
      it('aggregate.id === aggregateId', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate.id).equal('xyz')
      })
      it('aggregate.type === Aggregate.type', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate.type === Aggregate.type).be.True()
      })
      it('aggregate.stream === Aggregate.getStreamName(Aggregate.type, aggregate.id)', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate.stream).equal(Aggregate.getStreamName(Aggregate.type, aggregate.id))
      })
      it('aggregate.version is an integer, starting at 0 for aggregates with no events', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(isInteger(aggregate.version)).be.True()
        should(aggregate.version).equal(0)
      })
      it('aggregate.Factory === Aggregate', () => {
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events: []
        })
        let aggregate = Aggregate('xyz')
        should(aggregate.Factory).equal(Aggregate)
      })
      it('aggregate.emit is a map of event creators', () => {
        let events = [
          AggregateEvent({type: 'OneHappened', reducer: () => {}}),
          AggregateEvent({type: 'TwoHappened', reducer: () => {}})
        ]
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors: [],
          events
        })
        let aggregate = Aggregate('xyz')

        events.forEach((event) => {
          should(aggregate.emit[event.type]).be.a.Function()
          should(aggregate.emit[event.type]()).be.an.instanceOf(AggregateEvent)
        })
      })
      it('aggregate.error is a map of Error constructors', () => {
        let errors = [
          Error,
          TypeError
        ]
        let Aggregate = AggregateFactory({
          type: 'myaggregate',
          methods: [],
          errors,
          events: []
        })
        let aggregate = Aggregate('xyz')
        errors.forEach((error) => {
          should(aggregate.error[error.name]).be.a.Function()
          should(new aggregate.error[error.name]()).be.an.Error()
        })
      })
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
