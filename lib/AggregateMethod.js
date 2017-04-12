'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._validateMethodSettings = exports.MethodInputNotValidError = undefined;
exports.default = AggregateMethod;

var _isString = require('lodash/isString');

var _isString2 = _interopRequireDefault(_isString);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _seamlessImmutable = require('seamless-immutable');

var _seamlessImmutable2 = _interopRequireDefault(_seamlessImmutable);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const MethodInputNotValidError = exports.MethodInputNotValidError = (0, _utils.DefineError)('MethodInputNotValidError');

function AggregateMethod({
  name,
  description,
  inputSchema,
  handler
}) {
  _validateMethodSettings({ name, description, inputSchema, handler });

  let method = {};
  Object.setPrototypeOf(method, AggregateMethod.prototype);
  return Object.defineProperties(method, {
    name: { value: name },
    handler: { value: handler },
    description: { value: description || 'No description provided' },
    parseInput: { value: input => {
        let validate = inputSchema ? _utils.schemaValidator.compile(inputSchema) : () => true;
        let isValidInput = validate(input);

        if (!isValidInput) throw new MethodInputNotValidError(_utils.schemaValidator.errorsText(validate.errors));

        return (0, _seamlessImmutable2.default)(input);
      } }
  });
}

const _validateMethodSettings = exports._validateMethodSettings = ({ name, description, inputSchema, handler }) => {
  if (!(0, _utils.isValidIdentifier)(name)) throw new TypeError(`name MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(name)}`);

  if (description && !(0, _isString2.default)(description)) throw new TypeError(`description MUST be either falsy or a string`);

  if (inputSchema) {
    _utils.schemaValidator.compile(inputSchema);
  }

  if (!(0, _isFunction2.default)(handler)) throw new TypeError(`handler MUST be a function`);
};