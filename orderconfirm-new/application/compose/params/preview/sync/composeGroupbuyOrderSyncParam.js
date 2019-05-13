function composeGroupbuyOrderSyncParam(syncData) {

    const {
        isGroupBuy,
        groupBuyId,
    } = syncData.orderForm;

    const param = {
        isGroupBuy,
        groupBuyId,
    }

    const groupBuyActivityForm = syncData.orderForm.groupBuyActivityForm;
    if (groupBuyActivityForm) {
        param.groupBuyActivityForm = groupBuyActivityForm;
        if (groupBuyActivityForm.isGroupLeaderFree) {
            params.bookSource = '1';
        }
    }
    return param; 
}

export default composeGroupbuyOrderSyncParam;