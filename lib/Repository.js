'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._validateSnapshotServiceInterface = exports._validateEventstoreServiceInterface = exports._validateRepositoryConfig = exports.AggregateSavingError = exports.AggregateLoadingError = undefined;
exports.default = Repository;

var _every = require('lodash/every');

var _every2 = _interopRequireDefault(_every);

var _uniqBy = require('lodash/uniqBy');

var _uniqBy2 = _interopRequireDefault(_uniqBy);

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

var _utils = require('./utils');

var _AggregateFactory = require('./AggregateFactory');

var _AggregateFactory2 = _interopRequireDefault(_AggregateFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const AggregateLoadingError = exports.AggregateLoadingError = (0, _utils.DefineError)('AggregateLoadingError');
const AggregateSavingError = exports.AggregateSavingError = (0, _utils.DefineError)('AggregateSavingError');

function Repository({
  eventstoreService,
  snapshotService
}) {
  _validateRepositoryConfig({ eventstoreService, snapshotService });

  let repository = {};
  Object.setPrototypeOf(repository, Repository.prototype);
  return Object.defineProperties(repository, {
    load: { value: aggregates => {
        if (!Array.isArray(aggregates) || !(0, _every2.default)(aggregates, aggregate => aggregate instanceof _AggregateFactory2.default)) throw new TypeError('aggregates MUST be an array of 0 or more aggregate instances');

        return Promise.all(aggregates.map(aggregate => {
          let loadSnapshot = !aggregate.version && snapshotService ? snapshotService.loadSnapshot(aggregate.snapshotKey).catch(() => null) : Promise.resolve(null);

          return loadSnapshot.then(snapshot => Promise.all([snapshot, eventstoreService.getEventsOfStream({
            stream: aggregate.stream,
            fromVersionNumber: snapshot ? snapshot.version : aggregate.version
          })])).then(([snapshot, events]) => {
            let loadedAggregate = aggregate.Factory(aggregate.id, snapshot, events);

            if (snapshotService && loadedAggregate.needsSnapshot) {
              snapshotService.saveSnapshot(loadedAggregate.snapshotKey, {
                version: loadedAggregate.version,
                state: loadedAggregate.serializedState
              }).catch(e => {});
            }

            return loadedAggregate;
          }).catch(eventStoreError => {
            let e = new AggregateLoadingError();
            e.originalError = eventStoreError;
            throw e;
          });
        }));
      } },
    save: { value: aggregates => {
        if (!Array.isArray(aggregates) || !(0, _every2.default)(aggregates, aggregate => aggregate instanceof _AggregateFactory2.default) || (0, _uniqBy2.default)(aggregates, 'stream').length < aggregates.length) throw new TypeError('aggregates MUST be an array of 0 or more aggregate instances unique by stream');

        let aggregatesToSave = aggregates.filter(({ isDirty }) => isDirty);

        let appendEvents = aggregatesToSave.length ? eventstoreService.appendEventsToMultipleStreams(aggregatesToSave.map(aggregate => ({
          stream: aggregate.stream,
          events: aggregate.newEvents.map(({ type, serializedData }) => ({ type, data: serializedData })),
          expectedVersionNumber: aggregate.persistenceConsistencyPolicy === _AggregateFactory.ENSURE_VERSION_CONSISTENCY ? aggregate.version : aggregate.persistenceConsistencyPolicy === _AggregateFactory.AGGREGATE_SHOULD_EXIST ? -1 : -2
        }))) : Promise.resolve();

        return appendEvents.then(() => repository.load(aggregates)).catch(eventStoreError => {
          let e = new AggregateSavingError();
          e.originalError = eventStoreError;
          throw e;
        });
      } }
  });
}

const _validateRepositoryConfig = exports._validateRepositoryConfig = ({
  eventstoreService,
  snapshotService
}) => {
  _validateEventstoreServiceInterface(eventstoreService);
  _validateSnapshotServiceInterface(snapshotService);
};

const _validateEventstoreServiceInterface = exports._validateEventstoreServiceInterface = eventstoreService => {
  if (!(0, _isObject2.default)(eventstoreService)) throw new TypeError('eventstoreService MUST be an object like {getEventsOfStream(), appendEventsToMultipleStreams()}');
  if (!(0, _isFunction2.default)(eventstoreService.getEventsOfStream)) throw new TypeError('eventstoreService.getEventsOfStream({stream, fromVersion}) MUST be a function');
  if (!(0, _isFunction2.default)(eventstoreService.appendEventsToMultipleStreams)) throw new TypeError('eventstoreService.appendEventsToMultipleStreams([{stream, events, consistencyPolicy}, ...]) MUST be a function');
};

const _validateSnapshotServiceInterface = exports._validateSnapshotServiceInterface = snapshotService => {
  if (snapshotService) {
    if (!(0, _isObject2.default)(snapshotService)) throw new TypeError('snapshotService MUST be an object like {loadSnapshot(), saveSnapshot()}');
    if (!(0, _isFunction2.default)(snapshotService.loadSnapshot)) throw new TypeError('snapshotService.loadSnapshot(snapshotKey) MUST be a function');
    if (!(0, _isFunction2.default)(snapshotService.saveSnapshot)) throw new TypeError('snapshotService.saveSnapshot(snapshotKey, {version, state}) MUST be a function');
  }
};