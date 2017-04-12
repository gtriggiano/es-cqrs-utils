'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._validateEventSettings = exports.EventDataNotValidError = undefined;
exports.default = AggregateEvent;

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _seamlessImmutable = require('seamless-immutable');

var _seamlessImmutable2 = _interopRequireDefault(_seamlessImmutable);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const EventDataNotValidError = exports.EventDataNotValidError = (0, _utils.DefineError)('EventDataNotValid');

function AggregateEvent({
  type,
  description,
  reducer,
  schema,
  serializeData,
  deserializeData
}) {
  _validateEventSettings({ type, description, reducer, schema, serializeData, deserializeData });
  let _serializeData = serializeData || JSON.stringify;
  let _deserializeData = deserializeData || JSON.parse;

  function Event(data = '') {
    let validate = Event.schema ? _utils.schemaValidator.compile(Event.schema) : () => true;
    let isValidData = validate(data);

    if (!isValidData) throw new EventDataNotValidError(_utils.schemaValidator.errorsText(validate.errors));

    let event = {};
    Object.setPrototypeOf(event, Event.prototype);
    return Object.seal(Object.defineProperties(event, {
      type: { value: type, enumerable: true },
      data: { value: (0, _seamlessImmutable2.default)(data), enumerable: true },
      serializedData: { get: () => _serializeData(event.data) }
    }));
  }

  function _eventFromSerializedData(serializedData) {
    return Event(_deserializeData(serializedData));
  }

  Object.setPrototypeOf(Event, AggregateEvent.prototype);
  Object.setPrototypeOf(Event.prototype, AggregateEvent.prototype);
  return Object.defineProperties(Event, {
    name: { value: `${type}Event` },
    type: { value: type },
    description: { value: description || 'No description provided' },
    toString: { value: () => type },
    schema: { value: schema ? (0, _seamlessImmutable2.default)(schema) : null },
    reducer: { value: reducer },
    fromSerializedData: { value: _eventFromSerializedData }
  });
}

const _validateEventSettings = exports._validateEventSettings = ({ type, description, reducer, schema, serializeData, deserializeData }) => {
  if (!(0, _utils.isValidIdentifier)(type)) throw new TypeError(`type MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(type)}`);

  if (description && !(0, _isString2.default)(description)) throw new TypeError(`description MUST be either falsy or a string`);

  if (!(0, _isFunction2.default)(reducer)) throw new TypeError(`reducer MUST be a function`);

  if (schema) {
    _utils.schemaValidator.compile(schema);
  }

  if (serializeData && !(0, _isFunction2.default)(serializeData)) throw new TypeError(`serializeData MUST be either 'falsy' or a function, received: ${JSON.stringify(serializeData)}`);
  if (deserializeData && !(0, _isFunction2.default)(deserializeData)) throw new TypeError(`deserializeData MUST be either 'falsy' or a function, received: ${JSON.stringify(deserializeData)}`);
};