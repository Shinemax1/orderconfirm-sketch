function composeDepositOrderSyncParam(syncData) {
    const {
        isDepositPreOrder, isDepositFullOrder, gorderId, depositId,
    } = syncData;

    const param = {
        isDepositPreOrder, isDepositFullOrder, gorderId, depositId,
    }
    return param;
}

export default composeDepositOrderSyncParam;