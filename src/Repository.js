import every from 'lodash/every'
import uniqBy from 'lodash/uniqBy'
import isObject from 'lodash/isObject'
import isFunction from 'lodash/isFunction'

import { DefineError } from './utils'
import AggregateFactory from './AggregateFactory'

export const AggregateLoadingError = DefineError('AggregateLoadingError')

export default function Repository ({
  eventstoreService,
  snapshotService
}) {
  _validateRepositoryConfig({eventstoreService, snapshotService})

  let repository = {}
  Object.setPrototypeOf(repository, Repository.prototype)
  return Object.defineProperties(repository, {
    load: {value: (aggregates) => {
      if (
        !Array.isArray(aggregates) ||
        !every(aggregates, (aggregate) => aggregate instanceof AggregateFactory)
      ) throw new TypeError('aggregates MUST be an array of 0 or more aggregate instances')

      return Promise.all(
        aggregates.map(aggregate => {
          let loadSnapshot = snapshotService
            ? snapshotService.loadSnapshot(aggregate.snapshotKey).catch(() => null)
            : Promise.resolve(null)

          return loadSnapshot
          .then(snapshot => Promise.all([
            snapshot,
            eventstoreService.getEventsOfStream({
              stream: aggregate.stream,
              fromVersion: snapshot ? snapshot.version : 0
            })
          ]))
          .then(([snapshot, events]) => {
            let loadedAggregate = aggregate.Factory(aggregate.id, snapshot, events)

            if (snapshotService && loadedAggregate.needsSnapshot) {
              snapshotService.makeSnapshot(aggregate.snapshotKey, {
                version: aggregate.version,
                state: aggregate.serializedState
              }).catch((e) => {})
            }

            return loadedAggregate
          })
          .catch((eventStoreError) => {
            let e = new AggregateLoadingError()
            e.originalError = eventStoreError
            throw e
          })
        })
      )
    }},
    save: {value: (aggregates) => new Promise((resolve) => {
      if (
        !Array.isArray(aggregates) ||
        !every(aggregates, (aggregate) => aggregate instanceof AggregateFactory) ||
        uniqBy(aggregates, 'stream').length < aggregates.length
      ) throw new TypeError('aggregates MUST be an array of 0 or more aggregate instances unique by stream')

      let aggregatesToSave = aggregates.filter(({isDirty}) => isDirty)

      resolve(
        eventstoreService.saveEventsToMultipleStreams(aggregatesToSave.map(
          aggregate => ({
            stream: aggregate.stream,
            events: aggregate.newEvents,
            consistencyPolicy: aggregate.persistenceConsistencyPolicy
          })
        ))
        .then(() => repository.load(aggregates))
      )
    })}
  })
}

export const _validateRepositoryConfig = ({
  eventstoreService,
  snapshotService
}) => {
  _validateEventstoreServiceInterface(eventstoreService)
  _validateSnapshotServiceInterface(snapshotService)
}

export const _validateEventstoreServiceInterface = (eventstoreService) => {
  if (!isObject(eventstoreService)) throw new TypeError('eventstoreService MUST be an object like {getEventsOfStream(), saveEventsToMultipleStreams()}')
  if (!isFunction(eventstoreService.getEventsOfStream)) throw new TypeError('eventstoreService.getEventsOfStream({stream, fromVersion}) MUST be a function')
  if (!isFunction(eventstoreService.saveEventsToMultipleStreams)) throw new TypeError('eventstoreService.saveEventsToMultipleStreams([{stream, events, consistencyPolicy}, ...]) MUST be a function')
}

export const _validateSnapshotServiceInterface = (snapshotService) => {
  if (snapshotService) {
    if (!isObject(snapshotService)) throw new TypeError('snapshotService MUST be an object like {loadSnapshot(), makeSnapshot()}')
    if (!isFunction(snapshotService.loadSnapshot)) throw new TypeError('snapshotService.loadSnapshot(snapshotKey) MUST be a function')
    if (!isFunction(snapshotService.makeSnapshot)) throw new TypeError('snapshotService.makeSnapshot(snapshotKey, {version, state}) MUST be a function')
  }
}
