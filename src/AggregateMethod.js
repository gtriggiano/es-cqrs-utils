import isString from 'lodash/isString'
import isFunction from 'lodash/isFunction'
import Immutable from 'seamless-immutable'

import { DefineError, schemaValidator, isValidIdentifier } from './utils'

export const MethodInputNotValidError = DefineError('MethodInputNotValidError')

export default function AggregateMethod ({
  name,
  description,
  inputSchema,
  handler
}) {
  _validateCommandSettings({name, description, inputSchema, handler})

  let method = {}
  Object.setPrototypeOf(method, AggregateMethod.prototype)
  return Object.defineProperties(method, {
    name: {value: name},
    handler: {value: handler},
    description: {value: description || 'No description provided'},
    parseInput: {value: (input) => {
      let validate = inputSchema ? schemaValidator.compile(inputSchema) : () => true
      let isValidInput = validate(input)

      if (!isValidInput) throw new MethodInputNotValidError(schemaValidator.errorsText(validate.errors))

      return Immutable(input)
    }}
  })
}

export const _validateCommandSettings = ({name, description, inputSchema, handler}) => {
  if (!isValidIdentifier(name)) throw new TypeError(`name MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(name)}`)

  if (description && !isString(description)) throw new TypeError(`description MUST be either falsy or a string`)

  if (inputSchema) {
    schemaValidator.compile(inputSchema)
  }

  if (!isFunction(handler)) throw new TypeError(`handler MUST be a function`)
}
