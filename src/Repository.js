import every from 'lodash/every'
import uniqBy from 'lodash/uniqBy'
import isObject from 'lodash/isObject'
import isFunction from 'lodash/isFunction'

import { DefineError } from './utils'
import AggregateFactory, { AGGREGATE_SHOULD_EXIST, ENSURE_VERSION_CONSISTENCY } from './AggregateFactory'

export const AggregateLoadingError = DefineError('AggregateLoadingError')
export const AggregateSavingError = DefineError('AggregateSavingError')

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
          let loadSnapshot = !aggregate.version && snapshotService
            ? snapshotService.loadSnapshot(aggregate.snapshotKey).catch(() => null)
            : Promise.resolve(null)

          return loadSnapshot
          .then(snapshot => Promise.all([
            snapshot,
            eventstoreService.getEventsOfStream({
              stream: aggregate.stream,
              fromVersionNumber: snapshot ? snapshot.version : aggregate.version
            })
          ]))
          .catch(loadingError => {
            let e = new AggregateLoadingError()
            e.originalError = loadingError
            throw e
          })
          .then(([snapshot, events]) => {
            let loadedAggregate = aggregate.version
              ? aggregate.appendEvents(events)
              : aggregate.Factory(aggregate.id, snapshot, events)

            if (snapshotService && !aggregate.version && loadedAggregate.needsSnapshot) {
              snapshotService.saveSnapshot(loadedAggregate.snapshotKey, {
                version: loadedAggregate.version,
                state: loadedAggregate.serializedState
              }).catch((e) => {})
            }

            return loadedAggregate
          })
        })
      )
    }},
    save: {value: (aggregates) => {
      if (
        !Array.isArray(aggregates) ||
        !every(aggregates, (aggregate) => aggregate instanceof AggregateFactory) ||
        uniqBy(aggregates, 'stream').length < aggregates.length
      ) throw new TypeError('aggregates MUST be an array of 0 or more aggregate instances unique by stream')

      let aggregatesToSave = aggregates.filter(({isDirty}) => isDirty)

      let appendEvents = aggregatesToSave.length
        ? eventstoreService.appendEventsToMultipleStreams(
            aggregatesToSave.map(
              aggregate => ({
                stream: aggregate.stream,
                events: aggregate.newEvents.map(({type, serializedData}) => ({type, data: serializedData})),
                expectedVersionNumber:
                  aggregate.persistenceConsistencyPolicy === ENSURE_VERSION_CONSISTENCY
                    ? aggregate.version
                    : aggregate.persistenceConsistencyPolicy === AGGREGATE_SHOULD_EXIST
                      ? -1
                      : -2
              })
            )
          )
        : Promise.resolve()

      return appendEvents
        .catch(savingError => {
          let e = new AggregateSavingError()
          e.originalError = savingError
          throw e
        })
        .then(() => repository.load(aggregates))
    }}
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
  if (!isObject(eventstoreService)) throw new TypeError('eventstoreService MUST be an object like {getEventsOfStream(), appendEventsToMultipleStreams()}')
  if (!isFunction(eventstoreService.getEventsOfStream)) throw new TypeError('eventstoreService.getEventsOfStream({stream, fromVersion}) MUST be a function')
  if (!isFunction(eventstoreService.appendEventsToMultipleStreams)) throw new TypeError('eventstoreService.appendEventsToMultipleStreams([{stream, events, consistencyPolicy}, ...]) MUST be a function')
}

export const _validateSnapshotServiceInterface = (snapshotService) => {
  if (snapshotService) {
    if (!isObject(snapshotService)) throw new TypeError('snapshotService MUST be an object like {loadSnapshot(), saveSnapshot()}')
    if (!isFunction(snapshotService.loadSnapshot)) throw new TypeError('snapshotService.loadSnapshot(snapshotKey) MUST be a function')
    if (!isFunction(snapshotService.saveSnapshot)) throw new TypeError('snapshotService.saveSnapshot(snapshotKey, {version, state}) MUST be a function')
  }
}
