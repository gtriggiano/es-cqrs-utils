'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._validateMethodSettings = exports.MethodInputNotValidError = undefined;
exports.default = AggregateMethod;

var _seamlessImmutable = require('seamless-immutable');

var _seamlessImmutable2 = _interopRequireDefault(_seamlessImmutable);

var _lodash = require('lodash');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const MethodInputNotValidError = exports.MethodInputNotValidError = (0, _utils.DefineError)('MethodInputNotValidError');

function AggregateMethod({
  name,
  description,
  inputSchema,
  inputParser,
  handler
}) {
  _validateMethodSettings({ name, description, inputSchema, inputParser, handler });

  let method = {};
  Object.setPrototypeOf(method, AggregateMethod.prototype);
  return Object.defineProperties(method, {
    name: { value: name },
    handler: { value: handler },
    description: { value: description || 'No description provided' },
    parseInput: { value: input => {
        let validate = inputSchema ? _utils.schemaValidator.compile(inputSchema) : () => true;
        let isValidInputAccordingToSchema = validate(input);

        if (!isValidInputAccordingToSchema) throw new MethodInputNotValidError(_utils.schemaValidator.errorsText(validate.errors));

        let parsedInput;
        if (inputParser) {
          try {
            parsedInput = (0, _seamlessImmutable2.default)(inputParser(input));
          } catch (e) {
            let libError = new MethodInputNotValidError(e.message);
            libError.originalError = e;
            throw libError;
          }
        } else {
          parsedInput = (0, _seamlessImmutable2.default)(input);
        }

        return parsedInput;
      } }
  });
}

const _validateMethodSettings = exports._validateMethodSettings = ({ name, description, inputSchema, inputParser, handler }) => {
  if (!(0, _utils.isValidIdentifier)(name)) throw new TypeError(`name MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(name)}`);

  if (description && !(0, _lodash.isString)(description)) throw new TypeError(`description MUST be either falsy or a string`);

  if (inputSchema) {
    _utils.schemaValidator.compile(inputSchema);
  }

  if (inputParser && !(0, _lodash.isFunction)(inputParser)) throw new TypeError(`inputParser MUST be either falsy or a function`);
  if (!(0, _lodash.isFunction)(handler)) throw new TypeError(`handler MUST be a function`);
};