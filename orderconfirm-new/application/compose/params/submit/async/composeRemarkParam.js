function composeRemarkParam(remarkMap) {
    const merchantIdList = Object.keys(remarkMap);

    if (merchantIdList.length > 0) {
        return merchantIdList.reduce(function(prev, item, index) {
            let temp = {};
            temp['orderRemarkForms[' + index + '].merchantId'] = item;
            temp['orderRemarkForms[' + index + '].remark'] = remarkMap[item];
            return Object.assign(prev, temp);
        }, {});
    }
    return null;
}

export default composeRemarkParam;