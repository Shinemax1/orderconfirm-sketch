/**
 * 从订单表单中得到页面所需的发票信息
 * @param {Object} orderForm 订单表单 
 * @param {Boolean} isDepositFullOrder 是否是补全款（补全款不能点击发票模块，特殊处理需要）
 */
function composeInvoiceModel(orderForm, isDepositFullOrder) {
    orderForm = orderForm || {};
    const invoicePreviewStr = orderForm.invoice || ''; // 简要发票信息
    const invoiceDisable = isDepositFullOrder; // 补全款不能点击发票模块
    const isSupportInvoice = !!orderForm.needInvoiceFlag; // needInvoiceFlag: 0 - 不能开发票; 1 - 商家开票; 2 - 考拉开票
    let noInvoiceReasonType = isSupportInvoice ? -1 : 0;
    if(orderForm.isPureDomesticNo === 2) { // isPureDomesticNo: 1 - 纯国内贸易; 2 - 纯跨境; 3 - 两种都有; 4 - 两种都没有;
        noInvoiceReasonType = 1; // 纯跨境不支持开发票
    };
    const orderInvoiceDTO = orderForm.orderInvoiceDTO || {};
    const notifyPhoneNo = orderInvoiceDTO.notifyPhoneNo || '';
    const taxPayerNo = orderInvoiceDTO.taxPayerNo || '';
    const isRequireInvoice = !!orderInvoiceDTO.isOpenInvoice; // isOpenInvoice: 0 - 不需要发票; 1 - 需要发票

    let selectedInvoiceTypeId = -1,
        selectedTitleTypeId = -1,
        invoiceTitle = orderInvoiceDTO.invoiceTitle;

    const invoiceTypes = (orderInvoiceDTO.invoiceTypes || []).map((invoiceType) => {
        const {
            checked,
            typeId,
            typeName,
        } = invoiceType;
        // 获取选中的id
        if (checked) {
            selectedInvoiceTypeId = typeId;
        }
        // 过滤字段
        return {
            typeId,
            typeName,
        };
    });

    const titleTypes = (orderInvoiceDTO.titleTypes || []).map((titleType) => {
        const {
            checked,
            type: typeId,
            typeDesc: typeName,
        } = titleType;
        // 获取选中的id
        if (checked) {
            selectedTitleTypeId = typeId;
        }

        // 获取对应类型的默认值
        const defaultVal = {};

        if (typeId === 1) {
            // 个人, 如果后端没有传（之前用户没有开过个人发票）需要默认为'个人'
            defaultVal.invoiceTitle = orderInvoiceDTO.personalInvoiceTitle || '个人';
        } else if (typeId === 2) {
            // 公司
            defaultVal.invoiceTitle = orderInvoiceDTO.companyInvoiceTitle || '';
            defaultVal.taxPayerNo = orderInvoiceDTO.taxPayerNo || '';
        }

        if (selectedTitleTypeId === 1) {
            invoiceTitle = invoiceTitle || orderInvoiceDTO.personalInvoiceTitle || '个人';
        } else if (selectedTitleTypeId === 2) {
            invoiceTitle = invoiceTitle || orderInvoiceDTO.companyInvoiceTitle || '';
        }

        // 过滤字段
        return {
            typeId,
            typeName,
            defaultVal,
        };
    });

    return {
        invoiceTypes,
        titleTypes,
        invoicePreviewStr,
        invoiceDisable,
        isRequireInvoice,
        noInvoiceReasonType,
        selectedInvoiceTypeId,
        selectedTitleTypeId,
        invoiceTitle,
        taxPayerNo,
        notifyPhoneNo,
    };
};

function changeInvoiceAddress() {

}

export {
    composeInvoiceModel,
    changeInvoiceAddress,
}