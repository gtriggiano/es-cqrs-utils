import isString from 'lodash/isString'
import isEmpty from 'lodash/isEmpty'
import isFunction from 'lodash/isFunction'
import isInteger from 'lodash/isInteger'
import every from 'lodash/every'
import uniqBy from 'lodash/uniqBy'

import { isValidIdentifier } from './utils'
import AggregateEvent from './AggregateEvent'
import AggregateMethod from './AggregateMethod'

export const AGGREGATE_SHOULD_EXIST = 'ASE'
export const ENSURE_VERSION_CONSISTENCY = 'EVC'

export default function AggregateFactory ({
  type,
  description,
  getStreamName,
  initialState,
  methods,
  errors,
  events,
  serializeState,
  deserializeState,
  snapshotThreshold,
  snapshotPrefix
}) {
  _validateFactorySettings({
    type,
    description,
    getStreamName,
    initialState,
    methods,
    errors,
    events,
    serializeState,
    deserializeState,
    snapshotThreshold,
    snapshotPrefix
  })

  let _serializeState = (state) => {
    try {
      return (serializeState || JSON.stringify)(state)
    } catch (e) {
      let newError = new Error(`'${type}' aggregate factory: could not serialize state`)
      newError.originalError = e
      throw newError
    }
  }
  let _deserializeState = (serializedState) => {
    try {
      return (deserializeState || JSON.parse)(serializedState)
    } catch (e) {
      let newError = new Error(`'${type}' aggregate factory: could not deserialize state`)
      newError.originalError = e
      throw newError
    }
  }
  let _streamNameGetter = getStreamName
                            ? isFunction(getStreamName)
                              ? getStreamName
                              : () => getStreamName
                            : defaultStreamNameGetter

  let _eventsMap = events.reduce((map, event) => {
    map[`${event.type}`] = event
    return map
  }, {})
  let _reducer = (state, event) => {
    let EventType = _eventsMap[event.type]
    return EventType ? EventType.reducer(state, event.data) : state
  }

  function Aggregate (
    aggregateId,
    aggregateSnapshot,
    aggregateEvents
  ) {
    _validateAggregateInput({
      id: aggregateId,
      snapshot: aggregateSnapshot,
      events: aggregateEvents
    })

    let _id = aggregateId || null
    let _streamName = Aggregate.getStreamName(aggregateId)
    let _version = aggregateSnapshot
                    ? aggregateSnapshot.version
                    : 0
    let _state = aggregateSnapshot
      ? _deserializeState(aggregateSnapshot.state)
      : initialState
    let _needsSnapshot = snapshotThreshold &&
      aggregateEvents &&
      aggregateEvents.length >= snapshotThreshold

    if (aggregateEvents) {
      aggregateEvents.forEach((event) => {
        let EventType = _eventsMap[event.type]
        if (EventType) {
          try {
            _state = _reducer(_state, EventType.fromSerializedData(event.data))
          } catch (e) {
            let aggregateString = `${Aggregate.type}${_id ? `(${_id})` : ''}`
            console.warn(`[es-cqrs-utils]: an error was thrown by the ${aggregateString} ${EventType.type} event reducer. ${aggregateString} state was not affected by the replayed event altough its version increased by 1`)
            console.warn(e)
          }
        }
        _version++
      })
    }

    let _newEvents = []
    let _newEventsConsistencyPolicy = null

    let aggregateEventsEmitters = events.reduce((emitters, Event) =>
      Object.defineProperty(emitters, Event.type, {value: (data, consistencyPolicy) => {
        let event = Event(data)
        try {
          _state = _reducer(_state, event)
        } catch (e) {
          let aggregateString = `${Aggregate.type}${_id ? `(${_id})` : ''}`
          console.warn(`[es-cqrs-utils]: throwing error by the ${aggregateString} ${Event.type} event reducer`)
          throw e
        }
        _newEvents.push(event)
        if (
          _newEventsConsistencyPolicy !== ENSURE_VERSION_CONSISTENCY &&
          (
            consistencyPolicy === AGGREGATE_SHOULD_EXIST ||
            consistencyPolicy === ENSURE_VERSION_CONSISTENCY
          )
        ) {
          _newEventsConsistencyPolicy = consistencyPolicy
        }
        return event
      }}), {})

    let aggregateErrorsConstructors = errors.reduce((ctors, ErrorCtor) =>
      Object.defineProperty(ctors, ErrorCtor.name, {value: ErrorCtor}), {})

    let aggregate = {}
    Object.setPrototypeOf(aggregate, Aggregate.prototype)
    Object.defineProperties(aggregate, {
      id: {value: _id, enumerable: true},
      type: {value: type, enumerable: true},
      stream: {value: _streamName, enumerable: true},
      version: {value: _version, enumerable: true},
      needsSnapshot: {value: _needsSnapshot},
      snapshotKey: {value: snapshotPrefix ? `${snapshotPrefix}::${_streamName}` : _streamName},
      Factory: {value: Aggregate},
      emit: {value: aggregateEventsEmitters},
      error: {value: aggregateErrorsConstructors},
      appendEvents: {value: (newEvents) => Aggregate(aggregateId, aggregateSnapshot, (aggregateEvents || []).concat(newEvents))},
      state: {get: () => _state},
      serializedState: {get: () => Aggregate.serializeState(_state)},
      isDirty: {get: () => !!_newEvents.length},
      newEvents: {get: () => _newEvents.slice()},
      persistenceConsistencyPolicy: {get: () => _newEventsConsistencyPolicy}
    })

    methods.reduce((aggregate, Method) => {
      return Object.defineProperty(aggregate, Method.name, {value: (input) => {
        let _input = Method.parseInput(input)
        return Method.handler.apply(undefined, [aggregate, _input])
      }})
    }, aggregate)

    return aggregate
  }

  Object.setPrototypeOf(Aggregate, AggregateFactory.prototype)
  Object.setPrototypeOf(Aggregate.prototype, AggregateFactory.prototype)
  return Object.defineProperties(Aggregate, {
    name: {value: `${type}Aggregate`},
    type: {value: type},
    description: {value: description || 'No description provided'},
    toString: {value: () => type},
    serializeState: {value: _serializeState},
    deserializeState: {value: _deserializeState},
    getStreamName: {value: (id) => _streamNameGetter(type, id)}
  })
}

export const defaultStreamNameGetter = (aggregateType, aggregateId) => `${aggregateType}${aggregateId ? `::${aggregateId}` : ''}`

export const _validateAggregateInput = ({
  id,
  snapshot,
  events
}) => {
  if (id && !isString(id)) throw new TypeError('id MUST be either falsy or a string')
  if (snapshot && (
    !isInteger(snapshot.version) ||
    snapshot.version < 1 ||
    !isString(snapshot.state)
  )) throw new TypeError('snapshot MUST be either falsy or an object like {version: Integer >= 1, state: String}')
  if (events && (
    !Array.isArray(events) ||
    !every(events, (event) => event && isString(event.type) && !isEmpty(event.type) && isString(event.data))
  )) throw new TypeError('events MUST be either falsy or an array of objects like {type: String, data: String}')
}

export const _validateFactorySettings = ({
  type,
  description,
  getStreamName,
  methods,
  errors,
  events,
  serializeState,
  deserializeState,
  snapshotThreshold,
  snapshotPrefix
}) => {
  if (!isValidIdentifier(type)) throw new TypeError(`type MUST be a valid identifier, received: ${JSON.stringify(type)}`)

  if (description && !isString(description)) throw new TypeError(`description MUST be either falsy or a string`)

  if (
    getStreamName &&
    (!isFunction(getStreamName) && (!isString(getStreamName) || /\s/.test(getStreamName)))
  ) throw new TypeError(`getStreamName MUST be either 'falsy' or a function or a string without spaces, received: ${JSON.stringify(getStreamName)}`)

  if (!Array.isArray(methods)) throw new TypeError(`methods MUST be an array of AggregateMethod(s), received: ${JSON.stringify(methods)}`)
  methods.forEach((method, i) => {
    if (method instanceof AggregateMethod === false) throw new TypeError(`methods[${i}] is not an AggregateMethod`)
  })
  if (uniqBy(methods, 'name').length !== methods.length) throw new TypeError('methods are not unique by method.name')

  if (!Array.isArray(errors)) throw new TypeError(`errors MUST be an array of Error constructors, received: ${JSON.stringify(errors)}`)
  errors.forEach((ErrorCtor, i) => {
    if (
      !isFunction(ErrorCtor) ||
      (new ErrorCtor()) instanceof Error === false) throw new TypeError(`errors[${i}] is not an error constructor`)
  })
  if (uniqBy(errors, 'name').length !== errors.length) throw new TypeError('errors are not unique by error.name')

  if (!Array.isArray(events)) throw new TypeError(`events MUST be an array of AggregateEvent(s), received: ${JSON.stringify(events)}`)
  events.forEach((event, i) => {
    if (event instanceof AggregateEvent === false) throw new TypeError(`events[${i}] is not an AggregateEvent`)
  })
  if (uniqBy(events, 'type').length !== events.length) throw new TypeError('events are not unique by event.type')

  if (
    serializeState &&
    !isFunction(serializeState)
  ) throw new TypeError(`serializeState MUST be either 'falsy' or a function, received: ${JSON.stringify(serializeState)}`)

  if (
    deserializeState &&
    !isFunction(deserializeState)
  ) throw new TypeError(`deserializeState MUST be either 'falsy' or a function, received: ${JSON.stringify(deserializeState)}`)

  if (snapshotThreshold &&
    (!isInteger(snapshotThreshold) || snapshotThreshold < 1)
  ) throw new TypeError('snapshotThreshold MUST be either falsy or an integer >= 1')

  if (snapshotPrefix &&
    (!isString(snapshotPrefix) || /\s/.test(snapshotPrefix))
  ) throw new TypeError('snapshotPrefix MUST be either falsy or a string without spaces')
}
