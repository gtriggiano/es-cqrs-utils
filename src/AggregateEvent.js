import isString from 'lodash/isString'
import isEmpty from 'lodash/isEmpty'
import isFunction from 'lodash/isFunction'
import Immutable from 'seamless-immutable'

import { DefineError, schemaValidator, isValidIdentifier } from './utils'

export const EventDataNotValidError = DefineError('EventDataNotValid')

export default function AggregateEvent ({
  type,
  description,
  reducer,
  schema,
  serializeData,
  deserializeData
}) {
  _validateEventSettings({type, description, reducer, schema, serializeData, deserializeData})

  let _serializeData = serializeData || JSON.stringify
  let _deserializeData = deserializeData || JSON.parse

  function Event (data) {
    let validate = schema ? schemaValidator.compile(schema) : () => true
    let isValidData = validate(data)

    if (!isValidData) throw new EventDataNotValidError(schemaValidator.errorsText(validate.errors))

    let event = {}
    Object.setPrototypeOf(event, Event.prototype)
    return Object.seal(Object.defineProperties(event, {
      type: {value: type, enumerable: true},
      data: {value: Immutable(data), enumerable: true},
      serializedData: {get: () => _serializeData(event.data)}
    }))
  }

  function _eventFromSerializedData (serializedData) {
    return Event(_deserializeData(serializedData))
  }

  Object.setPrototypeOf(Event, AggregateEvent.prototype)
  Object.setPrototypeOf(Event.prototype, AggregateEvent.prototype)
  return Object.defineProperties(Event, {
    name: {value: `${type}Event`},
    type: {value: type},
    description: {value: description || 'No description provided'},
    toString: {value: () => type},
    reducer: {value: reducer},
    fromSerializedData: {value: _eventFromSerializedData}
  })
}

export const _validateEventSettings = ({type, description, reducer, schema, serializeData, deserializeData}) => {
  if (!isValidIdentifier(type)) throw new TypeError(`type MUST be a a valid identifier string (see https://mathiasbynens.be/notes/javascript-identifiers-es6), received: ${JSON.stringify(type)}`)

  if (description && !isString(description)) throw new TypeError(`description MUST be either falsy or a string`)

  if (!isFunction(reducer)) throw new TypeError(`reducer MUST be a function`)

  if (schema) {
    schemaValidator.compile(schema)
  }

  if (serializeData && !isFunction(serializeData)) throw new TypeError(`serializeData MUST be either 'falsy' or a function, received: ${JSON.stringify(serializeData)}`)
  if (deserializeData && !isFunction(deserializeData)) throw new TypeError(`deserializeData MUST be either 'falsy' or a function, received: ${JSON.stringify(deserializeData)}`)
}
