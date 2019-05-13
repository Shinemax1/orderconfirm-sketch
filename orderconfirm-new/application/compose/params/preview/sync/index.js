import composeBaseSyncParam from './composeBaseSyncParam';
import composeDepositOrderSyncParam from './composeDepositOrderSyncParam';
import composeGroupbuyOrderSyncParam from './composeGroupbuyOrderSyncParam';
import composeTryActivityOrderSyncParam from './composeTryActivityOrderSyncParam';

function composePreviewParam(syncData) {
    return Object.assign(
        {},
        composeBaseSyncParam(syncData),
        composeDepositOrderSyncParam(syncData),
        composeGroupbuyOrderSyncParam(syncData),
        composeTryActivityOrderSyncParam(syncData),
    )
}

export default composePreviewParam;