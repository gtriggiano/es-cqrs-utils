import util from 'util'
import Ajv from 'ajv'

export function DefineError (name) {
  function CustomError (message, extra) {
    Error.captureStackTrace(this, this.constructor)
    this.name = name
    this.message = message
    this.extra = extra
  }

  util.inherits(CustomError, Error)
  Object.defineProperty(CustomError, 'name', {value: `${name}`})
  return CustomError
}

export const schemaValidator = Ajv({allErrors: true, removeAdditional: true})
