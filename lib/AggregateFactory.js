'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._validateFactorySettings = exports._validateAggregateInput = exports.defaultStreamNameGetter = exports.ENSURE_VERSION_CONSISTENCY = exports.AGGREGATE_SHOULD_EXIST = undefined;
exports.default = AggregateFactory;

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _isInteger = require('lodash/isInteger');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _every = require('lodash/every');

var _every2 = _interopRequireDefault(_every);

var _uniqBy = require('lodash/uniqBy');

var _uniqBy2 = _interopRequireDefault(_uniqBy);

var _utils = require('./utils');

var _AggregateEvent = require('./AggregateEvent');

var _AggregateEvent2 = _interopRequireDefault(_AggregateEvent);

var _AggregateMethod = require('./AggregateMethod');

var _AggregateMethod2 = _interopRequireDefault(_AggregateMethod);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const AGGREGATE_SHOULD_EXIST = exports.AGGREGATE_SHOULD_EXIST = 'ASE';
const ENSURE_VERSION_CONSISTENCY = exports.ENSURE_VERSION_CONSISTENCY = 'EVC';

function AggregateFactory({
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
  });

  let _serializeState = state => {
    try {
      return (serializeState || JSON.stringify)(state);
    } catch (e) {
      let newError = new Error(`'${type}' aggregate factory: could not serialize state`);
      newError.originalError = e;
      throw newError;
    }
  };
  let _deserializeState = serializedState => {
    try {
      return (deserializeState || JSON.parse)(serializedState);
    } catch (e) {
      let newError = new Error(`'${type}' aggregate factory: could not deserialize state`);
      newError.originalError = e;
      throw newError;
    }
  };
  let _streamNameGetter = getStreamName ? (0, _isFunction2.default)(getStreamName) ? getStreamName : () => getStreamName : defaultStreamNameGetter;

  let _eventsMap = events.reduce((map, event) => {
    map[`${event.type}`] = event;
    return map;
  }, {});
  let _reducer = (state, event) => {
    let EventType = _eventsMap[event.type];
    return EventType ? EventType.reducer(state, event.data) : state;
  };

  function Aggregate(aggregateId, aggregateSnapshot, aggregateEvents) {
    _validateAggregateInput({
      id: aggregateId,
      snapshot: aggregateSnapshot,
      events: aggregateEvents
    });

    let _id = aggregateId || null;
    let _streamName = Aggregate.getStreamName(aggregateId);
    let _version = aggregateSnapshot ? aggregateSnapshot.version : 0;
    let _state = aggregateSnapshot ? _deserializeState(aggregateSnapshot.state) : initialState;
    let _needsSnapshot = snapshotThreshold && aggregateEvents && aggregateEvents.length >= snapshotThreshold;

    if (aggregateEvents) {
      aggregateEvents.forEach(event => {
        let EventType = _eventsMap[event.type];
        _state = EventType ? _reducer(_state, EventType.fromSerializedData(event.data)) : _state;
        _version++;
      });
    }

    let _newEvents = [];
    let _newEventsConsistencyPolicy = null;

    let aggregateEventsEmitters = events.reduce((emitters, Event) => Object.defineProperty(emitters, Event.type, { value: (data, consistencyPolicy) => {
        let event = Event(data);
        _state = _reducer(_state, event);
        _newEvents.push(event);
        if (_newEventsConsistencyPolicy !== ENSURE_VERSION_CONSISTENCY && (consistencyPolicy === AGGREGATE_SHOULD_EXIST || consistencyPolicy === ENSURE_VERSION_CONSISTENCY)) {
          _newEventsConsistencyPolicy = consistencyPolicy;
        }
        return event;
      } }), {});

    let aggregateErrorsConstructors = errors.reduce((ctors, ErrorCtor) => Object.defineProperty(ctors, ErrorCtor.name, { value: ErrorCtor }), {});

    let aggregate = {};
    Object.setPrototypeOf(aggregate, Aggregate.prototype);
    Object.defineProperties(aggregate, {
      id: { value: _id, enumerable: true },
      type: { value: type, enumerable: true },
      stream: { value: _streamName, enumerable: true },
      version: { value: _version, enumerable: true },
      needsSnapshot: { value: _needsSnapshot },
      snapshotKey: { value: snapshotPrefix ? `${snapshotPrefix}::${_streamName}` : _streamName },
      Factory: { value: Aggregate },
      emit: { value: aggregateEventsEmitters },
      error: { value: aggregateErrorsConstructors },
      appendEvents: { value: newEvents => Aggregate(aggregateId, aggregateSnapshot, (aggregateEvents || []).concat(newEvents)) },
      state: { get: () => _state },
      serializedState: { get: () => Aggregate.serializeState(_state) },
      isDirty: { get: () => !!_newEvents.length },
      newEvents: { get: () => _newEvents.slice() },
      persistenceConsistencyPolicy: { get: () => _newEventsConsistencyPolicy }
    });

    methods.reduce((aggregate, Method) => {
      return Object.defineProperty(aggregate, Method.name, { value: input => {
          let _input = Method.parseInput(input);
          return Method.handler.apply(undefined, [aggregate, _input]);
        } });
    }, aggregate);

    return aggregate;
  }

  Object.setPrototypeOf(Aggregate, AggregateFactory.prototype);
  Object.setPrototypeOf(Aggregate.prototype, AggregateFactory.prototype);
  return Object.defineProperties(Aggregate, {
    name: { value: `${type}Aggregate` },
    type: { value: type },
    description: { value: description || 'No description provided' },
    toString: { value: () => type },
    serializeState: { value: _serializeState },
    deserializeState: { value: _deserializeState },
    getStreamName: { value: id => _streamNameGetter(type, id) }
  });
}

const defaultStreamNameGetter = exports.defaultStreamNameGetter = (aggregateType, aggregateId) => `${aggregateType}${aggregateId ? `::${aggregateId}` : ''}`;

const _validateAggregateInput = exports._validateAggregateInput = ({
  id,
  snapshot,
  events
}) => {
  if (id && !(0, _isString2.default)(id)) throw new TypeError('id MUST be either falsy or a string');
  if (snapshot && (!(0, _isInteger2.default)(snapshot.version) || snapshot.version < 1 || !(0, _isString2.default)(snapshot.state))) throw new TypeError('snapshot MUST be either falsy or an object like {version: Integer >= 1, state: String}');
  if (events && (!Array.isArray(events) || !(0, _every2.default)(events, event => event && (0, _isString2.default)(event.type) && !(0, _isEmpty2.default)(event.type) && (0, _isString2.default)(event.data)))) throw new TypeError('events MUST be either falsy or an array of objects like {type: String, data: String}');
};

const _validateFactorySettings = exports._validateFactorySettings = ({
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
  if (!(0, _utils.isValidIdentifier)(type)) throw new TypeError(`type MUST be a valid identifier, received: ${JSON.stringify(type)}`);

  if (description && !(0, _isString2.default)(description)) throw new TypeError(`description MUST be either falsy or a string`);

  if (getStreamName && !(0, _isFunction2.default)(getStreamName) && (!(0, _isString2.default)(getStreamName) || /\s/.test(getStreamName))) throw new TypeError(`getStreamName MUST be either 'falsy' or a function or a string without spaces, received: ${JSON.stringify(getStreamName)}`);

  if (!Array.isArray(methods)) throw new TypeError(`methods MUST be an array of AggregateMethod(s), received: ${JSON.stringify(methods)}`);
  methods.forEach((method, i) => {
    if (method instanceof _AggregateMethod2.default === false) throw new TypeError(`methods[${i}] is not an AggregateMethod`);
  });
  if ((0, _uniqBy2.default)(methods, 'name').length !== methods.length) throw new TypeError('methods are not unique by method.name');

  if (!Array.isArray(errors)) throw new TypeError(`errors MUST be an array of Error constructors, received: ${JSON.stringify(errors)}`);
  errors.forEach((ErrorCtor, i) => {
    if (!(0, _isFunction2.default)(ErrorCtor) || new ErrorCtor() instanceof Error === false) throw new TypeError(`errors[${i}] is not an error constructor`);
  });
  if ((0, _uniqBy2.default)(errors, 'name').length !== errors.length) throw new TypeError('errors are not unique by error.name');

  if (!Array.isArray(events)) throw new TypeError(`events MUST be an array of AggregateEvent(s), received: ${JSON.stringify(events)}`);
  events.forEach((event, i) => {
    if (event instanceof _AggregateEvent2.default === false) throw new TypeError(`events[${i}] is not an AggregateEvent`);
  });
  if ((0, _uniqBy2.default)(events, 'type').length !== events.length) throw new TypeError('events are not unique by event.type');

  if (serializeState && !(0, _isFunction2.default)(serializeState)) throw new TypeError(`serializeState MUST be either 'falsy' or a function, received: ${JSON.stringify(serializeState)}`);

  if (deserializeState && !(0, _isFunction2.default)(deserializeState)) throw new TypeError(`deserializeState MUST be either 'falsy' or a function, received: ${JSON.stringify(deserializeState)}`);

  if (snapshotThreshold && (!(0, _isInteger2.default)(snapshotThreshold) || snapshotThreshold < 1)) throw new TypeError('snapshotThreshold MUST be either falsy or an integer >= 1');

  if (snapshotPrefix && (!(0, _isString2.default)(snapshotPrefix) || /\s/.test(snapshotPrefix))) throw new TypeError('snapshotPrefix MUST be either falsy or a string without spaces');
};