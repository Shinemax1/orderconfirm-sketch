function extractGoodsParam(goodsList) {
    // todo
}

function composeBaseSyncParam(syncData) {
    const {
        isNormalOrder,
        from, s,
        couponId, address,
        extendData,
    } = syncData;

    const {
        type,
        // isGroupBuy,
        // groupBuyId,
        jobNo,
        // exchangeCode,
        // rechargeAccount,
        // gameAccount,
        // orderType,
    } = syncData.orderForm;

    const param = {
        isNormalOrder,
        from, s,
        couponId, address,
        extendData,
        type,
        // isGroupBuy,
        // groupBuyId,
        jobNo,
        // exchangeCode,
        // rechargeAccount,
        // gameAccount,
        // orderType,
    }

    param.goods = extractGoodsParam(syncData.allSelectedOrderFormGoods);
    return param;
}

export default composeBaseSyncParam;