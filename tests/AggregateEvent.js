import should from 'should/as-function'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateEvent = require(`${libFolder}/AggregateEvent`).default
const EventDataNotValidError = require(`${libFolder}/AggregateEvent`).EventDataNotValidError

describe('EventDataNotValidError', () => {
  it('is a function', () => should(EventDataNotValidError).be.a.Function())
  it('is an Error constructor', () => {
    let e = new EventDataNotValidError()
    should(e).be.an.instanceOf(Error)
  })
})

describe('AggregateEvent(config)', function () {
  it('is a function', () => { should(AggregateEvent).be.a.Function() })
  it('throws if config.type is not a valid identifier', () => {
    should(() => AggregateEvent({
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: '',
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: 'a not valid identifier',
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: '0bad',
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: ':bad',
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: '.bad',
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: 'good',
      reducer: () => {}
    })).not.throw()
  })
  it('throws if config.description is set and is not a string', () => {
    should(() => AggregateEvent({
      type: 'myevent',
      description: true,
      reducer: () => {}
    })).throw()
    should(() => AggregateEvent({
      type: 'myevent',
      description: '',
      reducer: () => {}
    })).not.throw()
  })
  it('throws if config.reducer is not a function', () => {
    should(() => AggregateEvent({
      type: 'myevent'
    })).throw()
    should(() => AggregateEvent({
      type: 'myevent',
      reducer: 'bad'
    })).throw()
  })
  it('throws if config.schema is truthy and is not a valid JSON schema v4', () => {
    should(() => AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      schema: false
    })).not.throw()

    should(() => AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      schema: true
    })).throw()

    should(() => AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      schema: {
        properties: {
          first: {type: 'string'},
          second: {type: 'string'}
        },
        required: ['second']
      }
    })).not.throw()
  })
  it('throws if config.serializeData is truthy and is not a function', () => {
    should(() => AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      serializeData: 'bad'
    })).throw()
  })
  it('throws if config.deserializeData is truthy and is not a function', () => {
    should(() => AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      deserializeData: 'bad'
    })).throw()
  })
})

describe('Event(data) = AggregateEvent(config)', function () {
  it('is a function', () => should(AggregateEvent({
    type: 'myevent',
    reducer: () => {}
  })).be.a.Function())
  it('is an instance of AggregateEvent', () => {
    let Event = AggregateEvent({type: 'Created', reducer: () => {}})
    should(Event).be.an.instanceOf(AggregateEvent)
  })
  it('throws `EventDataNotValidError` if data is not valid according to config.schema', (done) => {
    let Event = AggregateEvent({
      type: 'myevent',
      reducer: () => {},
      schema: {
        properties: {
          first: {type: 'string'},
          second: {type: 'string', minLength: 3}
        },
        required: ['second']
      }
    })

    should(() => Event({second: 'test'})).not.throw()
    should(() => Event({second: 'te'})).throw()

    try {
      Event({})
    } catch (e) {
      should(e).be.an.instanceOf(EventDataNotValidError)
      done()
    }
  })
  it('Event.name === (config.type + \'Event\')', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    should(Event.name).equal(`CreatedEvent`)
  })
  it('Event.type === config.type', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    should(Event.type).equal(`Created`)
  })
  it('Event.description is a string, defaulting to `No description provided`', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    should(Event.description).equal(`No description provided`)
  })
  it('Event.description === config.description, if provided', () => {
    let Event = AggregateEvent({
      type: 'Created',
      description: 'My event description',
      reducer: () => {}
    })
    should(Event.description).equal(`My event description`)
  })
  it('Event.toString() === config.type', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    should(Event.toString()).equal(`Created`)
  })
  it('Event.reducer === config.reducer', () => {
    let reducer = () => {}
    let Event = AggregateEvent({
      type: 'Created',
      reducer
    })
    should(Event.reducer === reducer).be.True()
  })
  it('Event.fromSerializedData(serializedData) is a function', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    should(Event.fromSerializedData).be.a.Function()
  })
  it('Event.fromSerializedData(serializedData) returns an instance of Event', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let serializedData = JSON.stringify({second: 'test'})
    let e = Event.fromSerializedData(serializedData)
    should(e).be.an.instanceOf(Event)
    should(e.type).equal('Created')
    should(e.data.second).equal('test')
  })
  it('Event.fromSerializedData(serializedData) uses JSON.parse as deserializer bt default', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let serializedData = JSON.stringify({second: 'test'})
    let e = Event.fromSerializedData(serializedData)
    should(e).be.an.instanceOf(Event)
    should(e.type).equal('Created')
    should(e.data.second).equal('test')

    serializedData = JSON.stringify('a simple string')
    e = Event.fromSerializedData(serializedData)
    should(e.data).equal('a simple string')

    serializedData = JSON.stringify(true)
    e = Event.fromSerializedData(serializedData)
    should(e.data).equal(true)
  })
  it('Event.fromSerializedData(serializedData) uses config.deserializeData() if passed to AggregateEvent(config)', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {},
      deserializeData: (serializedData) => JSON.parse(serializedData).data
    })
    let serializedData = JSON.stringify({
      someProp: 'test',
      data: {second: 'test'}
    })
    let e = Event.fromSerializedData(serializedData)
    should(e).be.an.instanceOf(Event)
    should(e.type).equal('Created')
    should(e.data.second).equal('test')
  })
})

describe('event = Event(data)', () => {
  it('is an instance of Event', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let e = Event({prop: 'test'})
    should(e).be.an.instanceOf(Event)
  })
  it('is an instance of AggregateEvent', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let e = Event({prop: 'test'})
    should(e).be.an.instanceOf(AggregateEvent)
  })
  it('is immutable', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let evt = Event({prop: 'test'})
    should(() => {
      evt.type = 'mutated'
    }).throw(new RegExp('^Cannot assign to read only property \'type\''))
    should(() => {
      evt.data = 'mutated'
    }).throw(new RegExp('^Cannot assign to read only property \'data\''))
    should(() => {
      evt.a = 'new prop'
    }).throw(new RegExp('^Can\'t add property a, object is not extensible$'))
  })
  it('event.type === Event.type', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let e = Event({prop: 'test'})
    should(e.type).equal(Event.type)
  })
  it('if not passed, data defaults to an empty string', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let evt = Event()
    should(evt.data).equal('')
  })
  it('by default event.data has the same shape of data if no config.schema is passed to AggregateEvent(config)', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let data = {prop: 'test', list: ['one', 2], map: {k: 1, v: 2}}
    let e = Event(data)
    should(e.data).eql(data)
  })
  it('json schema flag `additionalProperties: false` strips out unkown props of data from event.data', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {},
      schema: {
        additionalProperties: false,
        properties: {
          preserved: {type: 'string'},
          map: {
            properties: {
              preserved: {type: 'number'},
              preservedToo: {type: 'string'}
            }
          }
        }
      }
    })
    let data = {
      preserved: 'ok',
      additional: 'removed',
      map: {
        preserved: 1,
        preservedToo: 'ok'
      }
    }
    let e = Event(data)

    should(e.data.preserved).equal('ok')
    should(e.data.additional).be.undefined()
    should(e.data.map.preserved).equal(1)
    should(e.data.map.preservedToo).equal('ok')
  })
  it('event.data is deeply immutable', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let data = {prop: 'test', list: ['one', 2], map: {k: 1, v: 2}}
    let e = Event(data)
    should(() => {
      e.data.prop = 'mutated'
    }).throw(/^Cannot assign to read only property/)
    should(() => {
      e.data.list[0] = 'mutated'
    }).throw(/^Cannot assign to read only property/)
    should(() => {
      e.data.map.k = 'mutated'
    }).throw(/^Cannot assign to read only property/)
  })
  it('event.serializedData is a getter of the serialized event data', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {}
    })
    let data = {prop: 'test', list: ['one', 2], map: {k: 1, v: 2}}
    let e = Event(data)
    let serializedDataDescriptor = Object.getOwnPropertyDescriptor(e, 'serializedData')
    should(serializedDataDescriptor.get).be.a.Function()
    should(e.serializedData).equal(JSON.stringify(data))
  })
  it('event.serializedData uses config.serializeData() if passed to AggregateEvent(config)', () => {
    let Event = AggregateEvent({
      type: 'Created',
      reducer: () => {},
      serializeData: (data) => JSON.stringify({
        someProp: 'test',
        data
      })
    })
    let data = {prop: 'test', list: ['one', 2], map: {k: 1, v: 2}}
    let e = Event(data)
    should(e.serializedData).equal(JSON.stringify({
      someProp: 'test',
      data
    }))
  })
})
