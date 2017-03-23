import isInteger from 'lodash/isInteger'
import should from 'should/as-function'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateFactory = require(`${libFolder}/AggregateFactory`).default
const AGGREGATE_SHOULD_EXIST = require(`${libFolder}/AggregateFactory`).AGGREGATE_SHOULD_EXIST
const ENSURE_VERSION_CONSISTENCY = require(`${libFolder}/AggregateFactory`).ENSURE_VERSION_CONSISTENCY
const AggregateMethod = require(`${libFolder}/AggregateMethod`).default
const MethodInputNotValidError = require(`${libFolder}/AggregateMethod`).MethodInputNotValidError
const AggregateEvent = require(`${libFolder}/AggregateEvent`).default
const EventDataNotValidError = require(`${libFolder}/AggregateEvent`).EventDataNotValidError

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
    })).throw(/methods\[1] is not an AggregateMethod/)
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
    })).throw(/methods are not unique by method.name/)
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
    })).throw(/errors\[1] is not an error constructor/)
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
    })).throw(/errors are not unique by error.name/)
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
    })).throw(/events\[1] is not an AggregateEvent/)
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
    })).throw(/events are not unique by event.type/)
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
})

describe('Aggregate(id, snapshot, events) = AggregateFactory(config)', () => {
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
  it('Aggregate.getStreamName defaults to (aggregateId) => Aggregate.type + (aggregateId ? \'::\' + aggregateId : \'\')`', () => {
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
  it('is an instance of AggregateFactory\n', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate).be.an.instanceOf(AggregateFactory)
  })

  it('props [id, type, stream, version, Factory, emit, error, appendEvents] are read only', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    let readOnlyProps = ['id', 'type', 'stream', 'version', 'Factory', 'emit', 'error', 'appendEvents']
    readOnlyProps.forEach((prop) => should(() => {
      aggregate[prop] = 'x'
    }).throw(new RegExp(`^Cannot assign to read only property '${prop}'`)))
  })
  it('props [state, serializedState, isDirty, newEvents, persistenceConsistencyPolicy] are getters\n', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    let getterProps = ['state', 'serializedState', 'isDirty', 'newEvents', 'persistenceConsistencyPolicy']
    getterProps.forEach((prop) => should(() => {
      aggregate[prop] = 'x'
    }).throw(new RegExp(`^Cannot set property ${prop}`)))
  })
  it(`aggregate exposes as props the set of methods passed to AggregateFactory

      Example:
        let MyAggregate = AggregateFactory({
          type: 'MyAggregate',
          events: [...],
          errors: [...],
          methods: [
            AggregateMethod({
              name: 'MyMethod',
              handler: () => {}
            })
          ]
        })

        let aggregate = MyAggregate('yxz')
        // typeof aggregate.MyMethod === 'function'
  `, () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'MyMethod',
          handler: () => {}
        }),
        AggregateMethod({
          name: 'AnotherMethod',
          handler: () => {}
        })
      ],
      events: [],
      errors: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.MyMethod).be.a.Function()
    should(aggregate.AnotherMethod).be.a.Function()
  })
  it(`when aggregate.MyMethod(input) is invoked the method handler receives [aggregate, Method.parseInput(input)] as arguments`, () => {
    let inputMyMethod = {x: 1}
    let inputAnotherMethod = {a: 1, b: 2}

    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'MyMethod',
          handler: (a, i) => {
            should(a).equal(aggregate)
            should(i).eql(inputMyMethod)
          }
        }),
        AggregateMethod({
          name: 'AnotherMethod',
          inputSchema: {
            additionalProperties: false,
            properties: {
              a: {type: 'number'}
            }
          },
          handler: (a, i) => {
            should(a).equal(aggregate)
            should(i).eql({a: 1})
          }
        })
      ],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    aggregate.MyMethod(inputMyMethod)
    aggregate.AnotherMethod(inputAnotherMethod)
  })
  it('aggregate.MyMethod(input) throws `MethodInputNotValidError` if input is not valid according to config.inputSchema passed to AggregateMethod(config)\n', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [
        AggregateMethod({
          name: 'MyMethod',
          handler: () => {},
          inputSchema: {
            properties: {
              a: {type: 'number'}
            },
            required: ['a']
          }
        })
      ],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(() => {
      aggregate.MyMethod({})
    }).throw(MethodInputNotValidError)
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
  it('aggregate.stream === Aggregate.getStreamName(aggregate.id)', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.stream).equal(Aggregate.getStreamName(aggregate.id))
  })
  it('aggregate.Factory === Aggregate\n', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.Factory).equal(Aggregate)
  })
  it(`aggregate.emit exposes as props the set of events creators passed to AggregateFactory

      Example:
        let MyAggregate = AggregateFactory({
          type: 'MyAggregate',
          methods: [...]
          errors: [...]
          events: [
            AggregateEvent({
              type: 'SomethingHappened',
              reducer: (state, eventData) => newState
            })
          ]
        })
        let aggregate = MyAggregate('xyz')
        // typeof aggregate.emit.SomethingHappened === 'function'
  `, () => {
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
  it('aggregate.emit.SomethingHappened(data) throws `EventDataNotValidError` if data is not valid according to config.schema passed to AggregateEvent(config)', () => {
    let Aggregate = AggregateFactory({
      type: 'myaggregate',
      methods: [],
      errors: [],
      events: [
        AggregateEvent({
          type: 'SomethingHappened',
          reducer: () => {},
          schema: {
            properties: {
              a: {type: 'string'}
            },
            required: ['a']
          }
        })
      ]
    })
    let aggregate = Aggregate('xyz')
    should(() => {
      aggregate.emit.SomethingHappened({})
    }).throw(EventDataNotValidError)
    should(() => {
      aggregate.emit.SomethingHappened({a: ''})
    }).not.throw()
  })
  it(`aggregate.error exposes as props the set of Error constructors passed to AggregateFactory

      Example:
      let MyAggregate = AggregateFactory({
        type: 'MyAggregate',
        methods: [...]
        events: [...]
        errors: [
          Error,
          TypeError
        ]
      })
      let aggregate = MyAggregate('xyz')
      // typeof aggregate.error.Error === 'function'
  `, () => {
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
  it('aggregate.state is a getter of the state of the aggregate', () => {
    let initialState = {x: Math.random()}
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      initialState,
      methods: [
        AggregateMethod({
          name: 'MultiplyX',
          handler: (aggregate, factor) => aggregate.emit.XMultiplied({factor})
        })
      ],
      errors: [],
      events: [
        AggregateEvent({
          type: 'XMultiplied',
          reducer: (state, {factor}) => ({
            x: state.x * factor
          })
        })
      ]
    })
    let aggregate = Aggregate('xyz')

    // Prop is not mutable
    should(() => {
      aggregate.state = 'mutated'
    }).throw(/^Cannot set property state/)

    should(aggregate.state).eql(initialState)
    let factor = Math.random()
    aggregate.MultiplyX(factor)
    should(aggregate.state).eql({x: initialState.x * factor})
  })
  it('aggregate.serializedState is a getter of the serialized version of the aggregate', () => {
    let initialState = {x: 'prop'}
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      initialState,
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    should(() => {
      aggregate.serializedState = 'mutate'
    }).throw(/^Cannot set property serializedState/)
    should(aggregate.serializedState).equal(JSON.stringify(initialState))
  })
  it('aggregate.appendEvents(events) throws if events is not an array of 0 or more valid events: {type: String, data: String}', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(() => {
      aggregate.appendEvents([{type: 'x', data: false}])
    }).throw(new RegExp('^aggregateEvents MUST be either falsy or an array of objects like {type: String, data: String}$'))
  })
  it('aggregate.appendEvents(events) returns a different aggregate instance width version = aggregate.version + events.length', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')

    let newEvents = [{type: 'x', data: 'somedata'}, {type: 'y', data: 'otherdata'}]
    let newAggregate = aggregate.appendEvents(newEvents)
    should(aggregate !== newAggregate).be.True()
    should(newAggregate.version).equal(aggregate.version + newEvents.length)
  })
  it('aggregate.isDirty is a boolean, defaulting to false for a just created instance', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.isDirty).be.False()
  })
  it('aggregate.newEvents is an array, empty by default for just created instances', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.newEvents).be.an.Array()
    should(aggregate.newEvents.length).equal(0)
  })
  it('aggregate.persistenceConsistencyPolicy defaults to null for just created instances', () => {
    let Aggregate = AggregateFactory({
      type: 'MyAggregate',
      methods: [],
      errors: [],
      events: []
    })
    let aggregate = Aggregate('xyz')
    should(aggregate.persistenceConsistencyPolicy).be.Null()
  })
})

describe('evt = aggregate.emit.SomethingHappened(data, consistencyPolicy) an side effects', () => {
  it('throws if data is not valid according to the schema passed to the AggregateEvent factory')
  it('evt is an instance of AggregateEvent')
  it('evt is an instance of SomethingHappened')
  it(`evt.type === 'SomethingHappened'`)
  it('evt.data is immutable')
  it('aggregate.version does not change')
  it('aggregate.isDirty resolves to true from here on')
  it('aggregate computes a new internal state passing the event to the aggregate\'s internal reducer')
  it('evt is added to aggregate.newEvents collection')
  it('if consistencyPolicy === ENSURE_VERSION_CONSISTENCY aggregate.persistenceConsistencyPolicy is ensured to be that from here on')
  it('if consistencyPolicy === AGGREGATE_SHOULD_EXIST aggregate.persistenceConsistencyPolicy is ensured to be that from here on, unless it is already set to ENSURE_VERSION_CONSISTENCY and until an event is emitted with a ENSURE_VERSION_CONSISTENCY consistencyPolicy')
  it('a value of consistencyPolicy different from ENSURE_VERSION_CONSISTENCY or AGGREGATE_SHOULD_EXIST is ignored')
})
