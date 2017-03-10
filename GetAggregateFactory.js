const AGGREGATE_SHOULD_EXIST = 'ASE'
const ENSURE_VERSION_CONSISTENCY = 'EVC'

function GetAggregateFactory ({type, getStreamName, initialState, reducer, commandsHandlers, serializeState, deserializeState}) {
  let _type = `${type}`

  const Aggregate = function (aggregateId, aggregateSnapshot, aggregateEvents) {
    let _serializeState = serializeState && typeof serializeState === 'function' ? serializeState : (state) => JSON.stringify(state)
    let _deserializeState = deserializeState && typeof deserializeState === 'function' ? deserializeState : (state) => JSON.parse(state)

    let _id = aggregateId || null
    let _streamName = getStreamName && typeof getStreamName === 'function'
      ? getStreamName(_type, _id)
      : `${_type}${_id ? `::${_id}` : ''}`

    let _snapshotVersion = aggregateSnapshot ? aggregateSnapshot.version : null
    let _snapshotState = aggregateSnapshot ? aggregateSnapshot.state : null
    let _version = _snapshotVersion || 0
    let _state = _snapshotState ? _deserializeState(_snapshotState) : initialState
    if (Array.isArray(aggregateEvents)) {
      aggregateEvents.forEach((event) => {
        _state = reducer(_state, event)
        _version++
      })
    }
    let _commandsHandlers = commandsHandlers || {}
    let _eventsToPersist = []
    let _persistenceConsistencyPolicy = null

    let aggregateTarget = Object.defineProperties({}, {
      id: {value: _id, enumerable: true},
      type: {value: _type, enumerable: true},
      streamName: {value: _streamName, enumerable: true},
      version: {value: _version, enumerable: true},
      state: {get: () => _state},
      getSnapshot: {value: () => {
        if (this.isDirty) throw new Error('You cannot take a snaphot of a dirty aggregate')
        return {
          version: _version,
          state: _serializeState(_state)
        }
      }},
      appendEvents: {value: (newEvents) =>
        Aggregate(
          _id,
          aggregateSnapshot && ({version: _snapshotVersion, state: _snapshotState}),
          aggregateEvents.concat(newEvents)
        )},
      isDirty: {get: () => !!_eventsToPersist.length},
      eventsToPersist: {get: () => JSON.parse(JSON.stringify(_eventsToPersist))},
      persistenceConsistencyPolicy: {get: () => _persistenceConsistencyPolicy},
      emit: {value: (event, consistencyPolicy) => {
        _state = reducer(_state, event)
        _eventsToPersist.push(event)
        if (
          _persistenceConsistencyPolicy !== ENSURE_VERSION_CONSISTENCY &&
          (
            consistencyPolicy === AGGREGATE_SHOULD_EXIST ||
            consistencyPolicy === ENSURE_VERSION_CONSISTENCY
          )
        ) {
          _persistenceConsistencyPolicy = consistencyPolicy
        }
      }}
    })

    let aggregateProxy = new Proxy(aggregateTarget, {
      isExtensible: () => false,
      getPrototypeOf: () => Aggregate,
      ownKeys: () => ['id', 'type', 'streamName', 'version', 'isDirty'],
      get: (target, prop) => {
        if (target.hasOwnProperty(prop)) return target[prop]

        let commandHandler = _commandsHandlers[prop]
        if (commandHandler && typeof commandHandler === 'function') {
          return function () {
            var args = [].slice.call(arguments)
            args.unshift(_state)
            return commandHandler.apply(undefined, args)
          }
        }
      }
    })

    return aggregateProxy
  }

  Object.defineProperties(Aggregate, {
    name: {value: _type},
    toString: {value: () => _type}
  })

  return Aggregate
}

module.exports = GetAggregateFactory
module.exports.AGGREGATE_SHOULD_EXIST = AGGREGATE_SHOULD_EXIST
module.exports.ENSURE_VERSION_CONSISTENCY = ENSURE_VERSION_CONSISTENCY
