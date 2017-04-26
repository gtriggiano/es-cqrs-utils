import should from 'should/as-function'

const libFolder = `../${process.env.LIB_FOLDER}`

const AggregateMethod = require(`${libFolder}/AggregateMethod`).default
const MethodInputNotValidError = require(`${libFolder}/AggregateMethod`).MethodInputNotValidError

const { DefineError } = require(`${libFolder}/utils`)

describe('MethodInputNotValidError', () => {
  it('is a function', () => should(MethodInputNotValidError).be.a.Function())
  it('is an Error constructor', () => {
    let e = new MethodInputNotValidError()
    should(e).be.an.instanceOf(Error)
  })
})

describe('AggregateMethod(config)', () => {
  it('is a function', () => should(AggregateMethod).be.a.Function())
  it('throws if config.name is not a valid identifier', () => {
    should(() => AggregateMethod({
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: '',
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: 'a not valid identifier',
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: '0bad',
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: ':bad',
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: '.bad',
      handler: () => {}
    })).throw()
    should(() => AggregateMethod({
      name: 'good',
      handler: () => {}
    })).not.throw()
  })
  it('throws if config.description is truthy and is not a string', () => {
    should(() => {
      AggregateMethod({
        name: 'mymethod',
        handler: () => {},
        description: 2
      })
    }).throw()
    should(() => {
      AggregateMethod({
        name: 'mymethod',
        handler: () => {},
        description: ''
      })
    }).not.throw()
  })
  it('throws if config.inputSchema is truthy and is not a valid JSON schema v4', () => {
    should(() => AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputSchema: false
    })).not.throw()

    should(() => AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputSchema: true
    })).throw()

    should(() => AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputSchema: {
        properties: {
          first: {type: 'string'},
          second: {type: 'string'}
        },
        required: ['second']
      }
    })).not.throw()
  })
  it('throws if config.inputParser is truthy and is not a function', () => {
    should(() => AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputParser: []
    })).throw('inputParser MUST be either falsy or a function')
    should(() => AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputParser: () => {}
    })).not.throw()
  })
  it('throws if config.handler is not a function', () => {
    should(() => AggregateMethod({
      name: 'mymethod'
    })).throw()
  })
})

describe('method = AggregateMethod(config)', () => {
  it('is an object', () => should(AggregateMethod({
    name: 'mymethod',
    handler: () => {}
  })).be.an.Object())
  it('is an instance of AggregateMethod', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {}
    })
    should(method).be.an.instanceOf(AggregateMethod)
  })
  it('method.name === config.name', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {}
    })
    should(method.name).equal(`mymethod`)
  })
  it('method.handler === config.handler', () => {
    let handler = () => {}
    let method = AggregateMethod({
      name: 'mymethod',
      handler
    })
    should(method.handler === handler).be.True()
  })
  it('method.description is a string, defaulting to `No description provided`', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {}
    })
    should(method.description).equal(`No description provided`)
  })
  it('method.description === config.description, if provided', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      description: 'My method description',
      handler: () => {}
    })
    should(method.description).equal(`My method description`)
  })
  it('method.inputSchema is either null or an immutable version of config.inputSchema', () => {
    let MethodNoSchema = AggregateMethod({
      name: 'mymethod',
      handler: () => {}
    })
    let aSchema = {
      properties: {
        one: {type: 'string'}
      }
    }
    let MethodWithSchema = AggregateMethod({
      name: 'mymethod',
      inputSchema: aSchema,
      handler: () => {}
    })
    should(MethodNoSchema.inputSchema).be.Null()
    should(MethodWithSchema.inputSchema).eql(aSchema)
    should(() => {
      MethodWithSchema.inputSchema.properties.two = 'added'
    }).throw(new RegExp('^Can\'t add property two, object is not extensible'))
  })
  it('method.parseInput() is a function', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      description: 'My method description',
      handler: () => {}
    })
    should(method.parseInput).be.a.Function()
  })
  it('method.parseInput(input) throws `MethodInputNotValidError` if input is not valid according to config.inputSchema', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputSchema: {
        properties: {
          first: {type: 'string'}
        },
        required: ['first']
      }
    })

    should(() => method.parseInput({})).throw(MethodInputNotValidError)
    should(() => method.parseInput({first: 1})).throw(MethodInputNotValidError)
    should(() => method.parseInput({first: 'one'})).not.throw()
  })
  it('method.parseInput(input) throws `MethodInputNotValidError` if config.inputParser(schemaValidatedInput) throws. `e.originalError` is the error thrown by config.inputParser(). Error message is propagated.', () => {
    let ParserError = DefineError('ParserError')
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputParser: () => { throw new ParserError('an error message') }
    })

    should(() => method.parseInput()).throw(MethodInputNotValidError)
    try {
      method.parseInput()
      throw new Error()
    } catch (e) {
      should(e.originalError).be.an.instanceOf(ParserError)
      should(e.message).equal(e.originalError.message)
    }
  })
  it('method.parseInput(input) returns an immutable deep clone of schemaValidatedInput if no config.parseInput() is present', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {}
    })

    let input = {first: 'one', map: {first: 1, list: [1, 2, 3]}}
    let parsedInput = method.parseInput(input)

    should(parsedInput).not.equal(input)
    should(parsedInput).eql(input)
    should(() => {
      parsedInput.first = 1
    }).throw(/Cannot assign to read only property 'first'/)
    should(() => {
      parsedInput.map.first = 'one'
    }).throw(/Cannot assign to read only property 'first'/)
    should(() => {
      parsedInput.map.list[0] = 'one'
    }).throw(/Cannot assign to read only property '0'/)
  })
  it('method.parseInput(input) returns an immutable deep clone of `parsedInput = config.inputParser(schemaValidatedInput)` if config.inputParser() is provided', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      inputSchema: {
        additionalProperties: false,
        properties: {
          first: {type: 'string'}
        },
        required: ['first']
      },
      handler: () => {},
      inputParser: (input) => {
        should(input.second).be.undefined()

        return {
          ...input,
          third: 'three'
        }
      }
    })

    let parsedInput = method.parseInput({
      first: 'one',
      second: 'two'
    })

    should(parsedInput.second).be.undefined()
    should(parsedInput.third).equal('three')
    should(() => {
      parsedInput.first = 1
    }).throw(/Cannot assign to read only property 'first'/)
    should(() => {
      parsedInput.fourth = 'four'
    }).throw(/Can't add property fourth, object is not extensible/)
  })
  it('json schema flag `additionalProperties: false` strips out unknown props from `schemaValidatedInput`', () => {
    let method = AggregateMethod({
      name: 'mymethod',
      handler: () => {},
      inputSchema: {
        additionalProperties: false,
        properties: {
          first: {type: 'string'},
          second: {
            properties: {
              first: {type: 'string'}
            }
          }
        }
      }
    })

    let input = {
      first: 'one',
      second: {
        first: 'one',
        second: 'two'
      },
      third: 'three'
    }
    let parsedInput = method.parseInput(input)

    should(parsedInput.third).be.undefined()
    should(parsedInput.second.second).equal('two')
  })
})
