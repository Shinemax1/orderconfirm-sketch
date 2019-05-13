function composeTryActivityOrderSyncParam(syncData) {
    const param = {}
    
    const { tryActivityOrderForm }  = syncData.orderForm;
    if (tryActivityOrderForm) {
        param.tryActivityOrderForm = tryActivityOrderForm;
    }

    return param;
}

export default composeTryActivityOrderSyncParam;