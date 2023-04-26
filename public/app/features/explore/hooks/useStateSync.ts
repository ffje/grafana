import { isEqual } from 'lodash';
import { useEffect, useRef } from 'react';

import { CoreApp, serializeStateToUrlParam } from '@grafana/data';
import { DataQuery, DataSourceRef } from '@grafana/schema';
import { useGrafana } from 'app/core/context/GrafanaContext';
import { getLastUsedDatasourceUID, parseUrlState } from 'app/core/utils/explore';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { MIXED_DATASOURCE_NAME } from 'app/plugins/datasource/mixed/MixedDataSource';
import { addListener, ExploreId, ExploreQueryParams, useDispatch, useSelector } from 'app/types';

import { changeDatasource } from '../state/datasource';
import { initializeExplore, urlDiff } from '../state/explorePane';
import { clearPanes, splitClose, splitOpen, syncTimesAction } from '../state/main';
import { runQueries, setQueriesAction } from '../state/query';
import { selectPanes } from '../state/selectors';
import { changeRangeAction, updateTime } from '../state/time';
import { withUniqueRefIds } from '../utils/queries';

import { getUrlStateFromPaneState } from './utils';

/**
 * Bi-directionally syncs URL changes with Explore's state.
 */
export function useStateSync(params: ExploreQueryParams) {
  const {
    location,
    config: {
      featureToggles: { exploreMixedDatasource },
    },
  } = useGrafana();
  const dispatch = useDispatch();
  const statePanes = useSelector(selectPanes);
  const orgId = useSelector((state) => state.user.orgId);
  const prevParams = useRef<ExploreQueryParams>(params);
  const initState = useRef<'notstarted' | 'pending' | 'done'>('notstarted');

  useEffect(() => {
    // This happens when the user navigates to an explore "empty page" while within Explore.
    // ie. by clicking on the explore when explore is active.
    if (!params.left && !params.right) {
      initState.current = 'notstarted';
      prevParams.current = {};
    }
  }, [params]);

  useEffect(() => {
    const unsubscribe = dispatch(
      addListener({
        predicate: (action) =>
          // We want to update the URL when:
          // - a pane is opened or closed
          // - a query is run
          // - range is changed
          [splitClose.type, splitOpen.fulfilled.type, runQueries.pending.type, changeRangeAction.type].includes(
            action.type
          ),
        effect: async (_, { cancelActiveListeners, delay, getState }) => {
          // The following 2 lines will throttle updates to avoid  creating history entries when rapid changes
          // are committed to the store.
          cancelActiveListeners();
          await delay(200);

          const panesQueryParams = Object.entries(getState().explore.panes).reduce<Record<string, string>>(
            (acc, [id, paneState]) => ({ ...acc, [id]: serializeStateToUrlParam(getUrlStateFromPaneState(paneState)) }),
            {}
          );

          if (!isEqual(prevParams.current, panesQueryParams)) {
            // If there's no previous state it means we are mounting explore for the first time,
            // in this case we want to replace the URL instead of pushing a new entry to the history.
            const replace = Object.values(prevParams.current).filter(Boolean).length === 0;

            prevParams.current = panesQueryParams;

            location.partial({ ...panesQueryParams, orgId: getState().user.orgId }, replace);
          }
        },
      })
    );

    // @ts-expect-error the return type of addListener is actually callable, but dispatch is not middleware-aware
    return () => unsubscribe();
  }, [dispatch, location]);

  useEffect(() => {
    const isURLOutOfSync = prevParams.current?.left !== params.left || prevParams.current?.right !== params.right;

    const urlPanes = {
      left: parseUrlState(params.left),
      ...(params.right && { right: parseUrlState(params.right) }),
    };

    async function sync() {
      // if navigating the history causes one of the time range to not being equal to all the other ones,
      // we set syncedTimes to false to avoid inconsistent UI state.
      // Ideally `syncedTimes` should be saved in the URL.
      if (Object.values(urlPanes).some(({ range }, _, [{ range: firstRange }]) => !isEqual(range, firstRange))) {
        dispatch(syncTimesAction({ syncedTimes: false }));
      }

      for (const [id, urlPane] of Object.entries(urlPanes)) {
        const exploreId = id as ExploreId;
        const { datasource, queries, range, panelsState } = urlPane;

        if (statePanes[exploreId] === undefined) {
          // This happens when browser history is used to navigate.
          // In this case we want to initialize the pane with the data from the URL
          // if it's not present in the store. This may happen if the user has navigated
          // from split view to non-split view and then back to split view.
          dispatch(
            initializeExplore({
              exploreId,
              datasource,
              queries: withUniqueRefIds(queries),
              range,
              panelsState,
            })
          );
        } else {
          // TODO: urlDiff should also handle panelsState changes
          const update = urlDiff(urlPane, getUrlStateFromPaneState(statePanes[exploreId]!));

          if (update.datasource) {
            // FIXME: yikes! a wild await inside a loop!
            await dispatch(changeDatasource(exploreId, datasource));
          }

          if (update.range) {
            dispatch(updateTime({ exploreId, rawRange: range }));
          }

          if (update.queries) {
            dispatch(setQueriesAction({ exploreId, queries: withUniqueRefIds(queries) }));
          }

          if (update.queries || update.range) {
            dispatch(runQueries({ exploreId }));
          }
        }
      }

      // Close all the panes that are not in the URL but are still in the store
      // ie. because the user has navigated back after opening the split view.
      Object.keys(statePanes)
        .filter((keyInStore) => !Object.keys(urlPanes).includes(keyInStore))
        .forEach((paneId) => dispatch(splitClose(paneId as ExploreId)));
    }

    // This happens when the user first navigates to explore.
    // Here we want to initialize each pane initial data, wether it comes
    // from the url or as a result of migrations.
    if (!isURLOutOfSync && initState.current === 'notstarted') {
      initState.current = 'pending';

      // Clear all the panes in the store first to avoid stale data.
      dispatch(clearPanes());

      Promise.all(
        Object.entries(urlPanes).map(([id, { datasource, queries, range, panelsState }]) => {
          return getPaneDatasource(datasource, queries, orgId, !!exploreMixedDatasource).then((paneDatasource) => {
            return (
              Promise.resolve(
                queries.length
                  ? withUniqueRefIds(queries)
                  : // if there are no queries, we get a default query from the root datasource.
                  // if the datasource is mixed, we get the last used datasource from the store.
                  paneDatasource
                  ? getDatasourceSrv()
                      // TODO: instead of undefined, we should use the last used top-level datasource,
                      // if that happens to be mixed, its query should be the last selected datasource from the query rows:
                      // 1. keep saving the last used top level ds
                      // 2. start saving rows datasources when they change.
                      // 3. if top-level is mixed, use the last used row datasource
                      // 4. if not, use the top-level one.
                      .get(paneDatasource === MIXED_DATASOURCE_NAME ? undefined : paneDatasource)
                      // if for some reason the aboive fails (ie. datasource removed or whatnot), we fallback to the default one.
                      .catch(() => getDatasourceSrv().get())
                      .then((ds) => [{ refId: 'A', datasource: ds.getRef(), ...ds.getDefaultQuery?.(CoreApp.Explore) }])
                  : []
              )
                .then(getQueryFilter(paneDatasource))
                .then(removeQueriesWithInvalidDatasource)
                // TODO: at this point we may have no query left, we should add a default query in that case.
                .then((queries) => {
                  return dispatch(
                    initializeExplore({
                      exploreId: id as ExploreId,
                      datasource: paneDatasource,
                      queries,
                      range,
                      panelsState,
                    })
                  ).unwrap();
                })
            );
          });
        })
      ).then((panes) => {
        const urlState = panes.reduce<ExploreQueryParams>((acc, { exploreId, state }) => {
          return { ...acc, [exploreId]: serializeStateToUrlParam(getUrlStateFromPaneState(state)) };
        }, {});

        location.partial({ ...urlState, orgId }, true);

        initState.current = 'done';
      });
    }

    prevParams.current = {
      left: params.left,
    };
    if (params.right) {
      prevParams.current.right = params.right;
    }

    isURLOutOfSync && initState.current === 'done' && sync();
  }, [params.left, params.right, dispatch, statePanes, exploreMixedDatasource, orgId, location]);
}

function getQueryFilter(datasource?: string) {
  // if the root datasource is mixed, filter out queries that don't have a datasource.
  if (datasource === MIXED_DATASOURCE_NAME) {
    return (queries: DataQuery[]) => queries.filter((q) => !!q.datasource);
  } else {
    // else filter out queries that have a datasource different from the root one.
    // Queries may not have a datasource, if so, it's assumed they are using the root datasource
    return (queries: DataQuery[]) =>
      queries.filter((q) => {
        if (!q.datasource) {
          return true;
        }
        // Due to legacy URLs, `datasource` in queries may be a string. This logic should probably be in the migration
        if (typeof q.datasource === 'string') {
          return q.datasource === datasource;
        }

        return q.datasource.uid === datasource;
      });
  }
}

async function removeQueriesWithInvalidDatasource(queries: DataQuery[]) {
  const results = await Promise.allSettled(
    queries.map((query) => {
      return getDatasourceSrv()
        .get(query.datasource)
        .then((ds) => ({
          query,
          ds,
        }));
    })
  );

  return results.filter(isFulfilled).map(({ value }) => value.query);
}

/**
 * Returns the datasource UID that an explore pane should be using.
 * If the URL specifies a datasource and that datasource exists, it will be used unless said datasource is mixed and `allowMixed` is false.
 * Otherwise the datasource will be extracetd from the the first query specifying a valid datasource.
 *
 * If there's no datasource in the queries, the last used datasource will be used.
 * if there's no last used datasource, the default datasource will be used.
 *
 * @param rootDatasource the top-level datasource specified in the URL
 * @param queries the queries in the pane
 * @param orgId the orgId of the user
 * @param allowMixed whether mixed datasources are allowed
 *
 * @returns the datasource UID that the pane should use, undefined if no suitable datasource is found
 */
async function getPaneDatasource(
  rootDatasource: DataSourceRef | string | null | undefined,
  queries: DataQuery[],
  orgId: number,
  allowMixed: boolean
) {
  // If there's a root datasource, use it unless it's mixed and we don't allow mixed.
  if (rootDatasource) {
    try {
      const ds = await getDatasourceSrv().get(rootDatasource);

      if ((ds.meta.mixed && allowMixed) || !ds.meta.mixed) {
        return ds.uid;
      }
    } catch (_) {}
  }

  // Else we try to find a datasource in the queries, returning the first one that exists
  const queriesWithDS = queries.filter((q) => q.datasource);
  for (const query of queriesWithDS) {
    try {
      const ds = await getDatasourceSrv().get(query.datasource);

      if ((ds.meta.mixed && allowMixed) || !ds.meta.mixed) {
        return ds.uid;
      }
    } catch (_) {}
  }

  // If none of the queries specify a avalid datasource, we use the last used one
  const lastUsedDSUID = getLastUsedDatasourceUID(orgId);

  return (
    getDatasourceSrv()
      .get(lastUsedDSUID)
      // Or the default one
      .catch(() => getDatasourceSrv().get())
      .then((ds) => ds.uid)
      .catch(() => undefined)
  );
}

const isFulfilled = <T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> =>
  promise.status === 'fulfilled';
