import Immutable from 'seamless-immutable'
import {
  isString,
  isFunction
} from 'lodash'

import { DefineError, schemaValidator, isValidIdentifier } from './utils'

export const MethodInputNotValidError = DefineError('MethodInputNotValidError')

export default function AggregateMethod ({
  name,
  description,
  inputSchema,
  inputParser,
  handler
}) {
  _validateMethodSettings({name, description, inputSchema, inputParser, handler})

  let method = {}
  Object.setPrototypeOf(method, AggregateMethod.prototype)
  return Object.defineProperties(method, {
    name: {value: name},
    handler: {value: handler},
    description: {value: description || 'No description provided'},
    inputSchema: {value: inputSchema ? Immutable(inputSchema) : null},
    parseInput: {value: (input) => {
      let validate = inputSchema ? schemaValidator.compile(inputSchema) : () => true
      let isValidInputAccordingToSchema = validate(input)

      if (!isValidInputAccordingToSchema) throw new MethodInputNotValidError(schemaValidator.errorsText(validate.errors))

      let parsedInput
      if (inputParser) {
        try {
          parsedInput = Immutable(inputParser(input))
        } catch (e) {
          let libError = new MethodInputNotValidError(e.message)
          libError.originalError = e
          throw libError
        }
      } else {
        parsedInput = Immutable(input)
      }

      return parsedInput
    }}
  })
}

export const _validateMethodSettings = ({name, description, inputSchema, inputParser, handler}) => {
  if (!isValidIdentifier(name)) throw new TypeError(`name MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(name)}`)

  if (description && !isString(description)) throw new TypeError(`description MUST be either falsy or a string`)

  if (inputSchema) {
    schemaValidator.compile(inputSchema)
  }

  if (inputParser && !isFunction(inputParser)) throw new TypeError(`inputParser MUST be either falsy or a function`)
  if (!isFunction(handler)) throw new TypeError(`handler MUST be a function`)
}
