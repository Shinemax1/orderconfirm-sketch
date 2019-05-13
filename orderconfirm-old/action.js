/* global: __ */

import _ from 'mobileweb-helper/extend/util';
import api from './api/index';
import pick from './utils/pick';
import $toast from './utils/toast';
import $alert from './utils/alert';
import $confirm from './utils/confirm';
import validate from './utils/validate';
import getWarehouseName from './utils/getWarehouseName';
import uniqueArray from './utils/uniqueArray';
import jsonParse from './utils/jsonParse';
//import { AuthRealName } from './components/index';
import resolveRefreshAPI from './utils/resolveRefreshAPI';
import resolveSubmitAPI from './utils/resolveSubmitAPI';
import resolveFirstPayValidateAPI from './utils/resolveFirstPayValidateAPI';
import formdatafy from './utils/form-data-fy';
import EventTracking from './utils/eventTracking';
//import reporter from '../../app/reporter/trade/confirm';
import Realname4ReceiverModal from '../../components/realnameAuthentication/realname4ReceiverModal/realname4ReceiverModal';
import Realname4PayerModal from '../../components/realnameAuthentication/realname4PayerModal/realname4PayerModal';
import RealnameSectionWithPhoto from '../../components/realnameAuthentication/realnameSectionWithPhoto/realnameSectionWithPhoto';
import BeforePayedModal from '../../components/modal/overlimitModals/beforePayedModal/beforePayedModal';
import DepositPreModal from '../../components/modal/overlimitModals/depositPreModal/depositPreModal';
import DepositFullModal from '../../components/modal/overlimitModals/depositFullModal/depositFullModal';
import getAppBridge from 'mobileweb-helper/widget/util/appbridge';
import Request from 'mobileweb-helper/widget/request';
import CONSTANT from './constant';
import Selector from './components/selector/selector';
import domainConfig from '@kaola/mobileweb-helper/extend/domainConfig';

import { actions as invoiceActions } from './model/invoice';

let MAIN_PAGE_TITLE = '提交订单';
let RECHARGE_TYPE_PHONE = CONSTANT.RECHARGE_TYPE_PHONE; // 话费
let RECHARGE_TYPE_GAME = CONSTANT.RECHARGE_TYPE_GAME; // 游戏
let RECHARGE_TYPE_TRAFFIC = CONSTANT.RECHARGE_TYPE_TRAFFIC; // 流量
let RECHARGE_TYPE_APPSTORE = CONSTANT.RECHARGE_TYPE_APPSTORE; // App Store
let RECHARGE_TYPE_PHONE_GIFT = CONSTANT.RECHARGE_TYPE_PHONE_GIFT;
let RECHARGE_TYPE_VIDEO = CONSTANT.RECHARGE_TYPE_VIDEO; // 视频会员
let RECHARGE_TYPE_ZSY = CONSTANT.RECHARGE_TYPE_ZSY; // 中石油
let RECHARGE_TYPE_ZSH = CONSTANT.RECHARGE_TYPE_ZSH; // 中石化
let appBridge = getAppBridge();

function checkIsRechargeOrder(rechargeType) {
    return [
        RECHARGE_TYPE_PHONE, RECHARGE_TYPE_TRAFFIC, RECHARGE_TYPE_PHONE_GIFT,
    ].indexOf(rechargeType) > -1;
}

function isFromAppStore(order) {
    return order.rechargeType === RECHARGE_TYPE_APPSTORE;
}

/**
 * 从订单表单中得到页面所需的发票信息
 * @param {Object} orderForm 订单表单 
 * @param {Boolean} isDepositFullOrder 是否是补全款（补全款不能点击发票模块，特殊处理需要）
 */
const getInvoiceStateByOrderForm = (orderForm, isDepositFullOrder) => {
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

/**
 * 从发票state中得到表单信息，这个信息用于最终表单和异步刷新
 * @param {Object} state invoice的状态
 */
const getInvoiceParamsByState = (state) => {
    state = state || {};
    const {
        invoiceDisable,
        invoiceTitle,
        taxPayerNo,
        notifyPhoneNo,
        selectedInvoiceTypeId,
        selectedTitleTypeId,
        isRequireInvoice,
    } = state;
    if (invoiceDisable) {
        return null;
    }
    
    const invoiceTypes = state.invoiceTypes.map(({ typeId, typeName }) => ({
        typeId,
        typeName,
        checked: typeId === selectedInvoiceTypeId ? 1 : 0,
    }));
    const titleTypes = state.titleTypes.map(({ typeId: type, typeName: typeDesc }) => ({
        type,
        typeDesc,
        checked: type === selectedTitleTypeId ? 1 : 0,
    }));
    return {
        invoiceTypes,
        titleTypes,
        invoiceTitle,
        taxPayerNo,
        notifyPhoneNo,
        isOpenInvoice: isRequireInvoice ? 1: 0,
    };
};

const actions = {
    rollbackCoupon(ctx) {
        var commit = ctx.commit;
        commit('coupon/rollback');
    },
    toggleDepositAgree(ctx) {
        var commit = ctx.commit;
        var state = ctx.state;
        commit('order/updateDepositAgree', !state.order.isAgreeDeposit);
    },
    // post提交到当前页面的数据会被后端通过ftl透传到全局变量`window.__`上
    // 具体请查看ftl文件，搜索文件名`order_confirm_new.ftl`即可
    // 第一次refresh会用到这些数据，先存到store中
    saveSync(ctx) {
        var commit = ctx.commit;

        var picked = pick(window.__, [
            'isNormalOrder',
            'isDepositPreOrder',
            'isDepositFullOrder',
            'depositId',
            'gorderId',
            'orderForm',
            'from',
            'couponId',
            's',
            'address',
            'extendData',
            'rechargeType',
        ]);
        
        commit('order/saveSync', picked);


    },

    backAndRefresh() {
        location.replace(document.referrer);
    },

    back() {
        history.back();
    },

    // 虚拟商品账号改变
    changeAccount(ctx, value) {
        var commit = ctx.commit;
        commit('account/updateAccount', value);
    },
    changeUsername(ctx, value) {
        var commit = ctx.commit;
        commit('account/updateUsername', value);
    },

    // 更新留言项
    updateRemark(ctx, remark) {
        var commit = ctx.commit;
        commit('order/updateRemark', remark);
    },

    // 隐藏拦截弹窗
    hideIntercept(ctx) {
        var commit = ctx.commit;
        commit('goodsintercept/hide');
    },

    // 合成refresh提交参数
    compose(ctx) {
        try {
            var commit = ctx.commit;
            // 先从同步数据合成基础提交参数
            commit('order/composeFromSync');

            // get
            var params = ctx.state.order.params;
            var currentCoupons = ctx.state.coupon.current;
            params = Object.assign(params, currentCoupons.reduce(function(prev, item) {
                if (item.id) {
                    var temp = {};
                    temp[item.name] = item.id;
                    return Object.assign(prev, temp);
                }
                return prev;
            }, {}));

            // 更新地址信息
            var addressId = ctx.state.address.id;
            if (addressId) {
                params = Object.assign({}, params, {
                    'address.addressId': addressId
                });
            }

            var useRedPacket = Number(!!ctx.state.redPacket.isUseRedPacket);
            var useVip = ctx.state.vip.isUseVip;
            var discountAmount = ctx.state.vip.discountAmount;
            var vipType = ctx.state.vip.vipType;

            if (useVip !== undefined && useVip !== null && (vipType === 3 || discountAmount)) {
                params = Object.assign({}, params, {
                    useVipDiscount: Number(useVip),
                });
            }
            // 关联购卡参数
            var relatedBuyVipVo = ctx.state.vip.relatedBuyVipVo;
            var vipRedCardUpgradeView = ctx.state.vip.vipRedCardUpgradeView;
            var relatedBuyVipParam = null;
            if(relatedBuyVipVo && vipRedCardUpgradeView) {
                relatedBuyVipParam = {
                    relatedBuyVipInt: ctx.state.vip.relatedBuyVipInt,
                    relatedOptType: ctx.state.vip.relatedOptType,
                    relatedBuyVipAmount: relatedBuyVipVo.relatedBuyVipAmount,
                    relatedBuyVipSaveAmount: relatedBuyVipVo.relatedBuyVipSaveAmount
                };
                if(relatedBuyVipVo.lastCouponId) {
                    relatedBuyVipParam.lastCouponId = relatedBuyVipVo.lastCouponId;
                }
                if(relatedBuyVipVo.lastLogisticsCouponId) {
                    relatedBuyVipParam.lastLogisticsCouponId = relatedBuyVipVo.lastLogisticsCouponId;
                }
                if(relatedBuyVipVo.lastTaxCouponId) {
                    relatedBuyVipParam.lastTaxCouponId = relatedBuyVipVo.lastTaxCouponId;
                }
                //关联购卡useVipDiscount为1
                if(vipRedCardUpgradeView) {
                    params.useVipDiscount = 1;
                }
            }

            let useDiscountList = null

            if(ctx.state.vip.vipDiscountWindowViewVo){
              useDiscountList = ctx.state.vip.vipDiscountWindowViewVo.goodsDiscountList
                .filter(v=>v.selectedAble)
                .map(v=>({discountType:v.discountType,discountName:v.discountName,selectedFlag:v.selectedFlag}))
            } 

            Object.assign(params, formdatafy({
              editableExtendData: {
                useRedPacket: useRedPacket,
                selectableTimelinessParam: ctx.state.order.selectableTimelinessParam,
                bookCustomsBookSource: ctx.state.order.bookCustomsBookSource,
                relatedBuyVipParam: relatedBuyVipParam,
                useDiscountList
              }
            }),{
              useVipDiscount: 1,
            });

            // 通知后端更新地址组件
            // TODO: 在地址变化时才设为1
            params.isModifyAddress = 1;

            return Promise.resolve(params);
        } catch (e) {
            return Promise.reject(e);
        }
    },
    // 修改topbar标题及document.title
    modifyTitle(ctx, newTitle) {
        var commit = ctx.commit;
        document.title = newTitle;
        commit('title/update', newTitle);
    },
    // 刷新页面数据，刚进页面时也会dispatch一次refresh
    refresh(ctx, options) {
        var commit = ctx.commit;
        var dispatch = ctx.dispatch;
        var order = ctx.state.order;
        var isNormalOrder = order.isNormalOrder;
        var isDepositPreOrder = order.isDepositPreOrder;
        var isDepositFullOrder = order.isDepositFullOrder;
        var gorderId = order.gorderId;
        var depositId = order.depositId;

        options = options || {};
        var showLoading = options.showLoading;
        var checkGeo = options.checkGeo;
        var selectableTimelinessParam = options.selectableTimelinessParam;

        if (showLoading) {
            commit('app/showDistributeLoading');
        }

        // 合成提交参数
        return dispatch('compose')
            .then(function(params) {
                return Promise.resolve()
                    .then(function() {
                        //运费税费的请求, 需要替换相关参数
                        if (selectableTimelinessParam) {
                            Object.assign(params, formdatafy({
                                editableExtendData: {
                                    selectableTimelinessParam: selectableTimelinessParam
                                }
                            }));
                        }

                        var depositPreOrderParams = Object.assign({
                            depositId: depositId
                        }, params);

                        var depositFullOrderParams = Object.assign({
                            gorderId: gorderId
                        }, params);

                        // 将请求加载的逻辑交给 resolveRefreshAPI
                        return resolveRefreshAPI({
                            isNormalOrder: isNormalOrder,
                            isDepositPreOrder: isDepositPreOrder,
                            isDepositFullOrder: isDepositFullOrder
                        }, {
                            normalOrderParams: params,
                            depositPreOrderParams: depositPreOrderParams,
                            depositFullOrderParams: depositFullOrderParams
                        });
                    })
                    // eslint-disable-next-line
                    .then(function(json) {
                        var orderForm = json.orderForm;

                        if (json.code === 200) {
                            //运费税费的请求只更新运费的税费, 其他的请求更新订单页
                            if (selectableTimelinessParam) {
                                var orderTaxHoverView = orderForm.orderTaxHoverView || {};
                                var logisticsTaxAmount = orderTaxHoverView.logisticsTaxAmount;
                                commit('order/updateLogisticsTaxAmount', logisticsTaxAmount);
                            } else {
                                // 校验showLoading，避免log里面出现多余的commit
                                if (showLoading) {
                                    commit('app/hideDistributeLoading');
                                }
                                commit('app/loaded');

                                try {
                                    // 优惠券ID
                                    var couponId = orderForm.couponId;
                                    // 运费
                                    var logisticsCouponId = orderForm.logisticsCouponId;
                                    // 税费
                                    var taxCouponId = orderForm.taxCouponId;
                                    // 优惠券列表 /datatype/detail/?pid=11310&id=19428
                                    var couponList = orderForm.couponList || [];
                                    // 税费
                                    var suitLogisticsCouponList = orderForm.suitLogisticsCouponList || [];
                                    // 运费
                                    var suitTaxCouponList = orderForm.suitTaxCouponList || [];
                                    // 不可用
                                    var unSuitableCouponList = orderForm.unSuitableCouponList || [];
                                    // 包含超高运费商品
                                    var includeHighPostageGoods = orderForm.includeHighPostageGoods;
                                    var orderFormPostageDetail = orderForm.orderFormPostageDetail;

                                    // 地址 /datatype/detail/?pid=11310&id=19429
                                    var address = orderForm.contact;
                                    // 详情页有`配送至`信息，可能和用户的默认地址不一样，需要提示用户是否新建一个对应的地址
                                    var geograph =
                                        orderForm.newContactGeographyInfo;
                                    // 是否需要在提交前触发验证码弹窗
                                    var needCheckCode = !!orderForm.healthOrderCheckcodeIsShow;
                                    // 包含拦截商品
                                    var checkLimitRegionList = orderForm.checkLimitRegionList;
                                    var orderRedPacket = orderForm.orderRedPacket;

                                    // 发票信息
                                    const invoiceInfo = getInvoiceStateByOrderForm(orderForm, isDepositFullOrder);
                                    // 仅第一次init或允许开发票状态变化时有效，否则页面保留自己的状态，避免被接口数据重置
                                    if(!ctx.state.invoice.init || 
                                        ctx.state.invoice.noInvoiceReasonType !== invoiceInfo.noInvoiceReasonType) { 
                                        commit('invoice/setInvoiceInfo', invoiceInfo);
                                    }

                                    if (orderRedPacket) {
                                        commit('redPacket/update', orderRedPacket);
                                    }

                                    // 是否虚拟商品
                                    var isVirtualOrder = orderForm.isVirtualOrder;
                                    if (isVirtualOrder && !ctx.state.order.game.ready) {
                                        if (/rechargeCenter/g.test(ctx.state.order.syncData.from)) {
                                            dispatch('getGameFieldsFromSyncData', orderForm.allSelectedOrderFormGoods[0].goodsId);
                                        } else {
                                            dispatch('getGameFields', orderForm.allSelectedOrderFormGoods[0].goodsId);

                                        }
                                    }

                                    // 是否存在以配置的地址
                                    var hasAddress = address && address.id;
                                    var addressOptionalList = orderForm.addressOptionalList || [];
                                    var selectedAddress = orderForm.usrSelectAddress || {};
                                    if (addressOptionalList.length > 0 && !isVirtualOrder) {
                                        dispatch('changeSelectedAddress', {
                                            selectedAddress: selectedAddress,
                                            addressOptionalList: addressOptionalList
                                        });
                                    }
                                    if (params.rechargeAccount) {
                                        // 通行证
                                        commit(
                                            'account/updateAccount',
                                            params.rechargeAccount
                                        );
                                    }

                                    if (params.gameAccount) {
                                        // 游戏账号
                                        commit(
                                            'account/updateUsername',
                                            params.gameAccount
                                        );
                                    }

                                    commit('address/update', address);
                                    commit('order/update', orderForm);
                                    commit('coupon/updateCoupons', [[{
                                        type: 'goodsCoupon',
                                        name: '商品券',
                                        list: couponList || []
                                    }, {
                                        type: 'suitLogisticsCoupon',
                                        name: '运费券',
                                        list: suitLogisticsCouponList || []
                                    }, {
                                        type: 'suitTaxCoupon',
                                        name: '税费券',
                                        list: suitTaxCouponList || []
                                    }],unSuitableCouponList || []]);

                                    commit('coupon/updateCouponsAmount', [{
                                        type: 'goodsCoupon',
                                        amount: orderForm.totalGoodsCouponAmount
                                    }, {
                                        type: 'suitLogisticsCoupon',
                                        amount: orderForm.logisticsCouponAmount
                                    }, {
                                        type: 'suitTaxCoupon',
                                        amount: orderForm.totalTaxCouponAmount
                                    }]);

                                    commit('coupon/use', [{
                                        type: 'goodsCoupon',
                                        id: couponId
                                    }, {
                                        type: 'suitLogisticsCoupon',
                                        id: logisticsCouponId
                                    }, {
                                        type: 'suitTaxCoupon',
                                        id: taxCouponId
                                    }]);
                                    commit('coupon/cache');

                                    commit(
                                        'goodsintercept/update',
                                        checkLimitRegionList
                                    );
                                    commit('vip/update', {
                                        vipDiscountAmount: orderForm.vipDiscountAmount || 0,
                                        vip96IconUrl: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vip96IconUrl,
                                        vipDiscountWindowViewVo: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vipDiscountWindowViewVo || null,
                                        isUseVip: orderForm.useVipDiscount || 0,
                                        discountAmount: orderForm.vipDiscountAmount,
                                        superVipPriceDiscountAmount: orderForm.vipPriceDiscountAmount,
                                        vipDiscountRadio: orderForm.vipDiscountRadio,
                                        vipType: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vipType || 0,
                                        vipRedCardBook96View: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vipRedCardBook96View,
                                        vipRedCardUpgradeView: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vipRedCardUpgradeView,
                                        vipSavingDetailView: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.vipSavingDetailView,
                                        relatedBuyVipVo: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.relatedBuyVipVo,
                                        isShowRelatedBuyVip: orderForm.vipWapDiscountBookVo && orderForm.vipWapDiscountBookVo.isShowRelatedBuyVip,
                                        relatedOptType: 0,
                                    });

                                    commit(
                                        'goodsintercept/update',
                                        checkLimitRegionList
                                    );

                                    commit('order/updateIncludeHighPostageGoods', includeHighPostageGoods);
                                    commit('order/updateOrderFormPostageDetail', orderFormPostageDetail);

                                    // |是否触发验证码|
                                    if (needCheckCode) {
                                        commit('order/needCheckCode');
                                    } else {
                                        commit('order/noCheckCode');
                                    }

                                    if (hasAddress && address.extraInfo && Number(address.extraInfo.invalidStatus) === 1) {
                                        $confirm({
                                                content: '由于地址库升级，请重新编辑收货地址的所在地区，即可顺利下单',
                                                confirmText: '去修改',
                                                cancelText: '再想想',
                                            })
                                            .then(function() {
                                                return dispatch('editCurrentInvalidAddress');
                                            });
                                    }

                                    if (geograph) {
                                        // 不匹配
                                        commit('geo/unmatch');

                                        // 保存
                                        var picked = pick(geograph, [
                                            'provinceCode',
                                            'provinceName',
                                            'cityCode',
                                            'cityName',
                                            'districtCode',
                                            'districtName'
                                        ]);
                                        commit('geo/update', picked);

                                        // checkGeo为真值时才去检查geo，这里是为了保证弹窗只出现一次
                                        if (checkGeo) {
                                            dispatch('showAddGeoAddress', geograph);
                                        }
                                    } else {
                                        // 匹配
                                        commit('geo/match');
                                    }

                                    if (!isVirtualOrder && !hasAddress && !isDepositFullOrder) {
                                        commit('address/new');
                                        commit('view/address');
                                    }

                                    if (ctx.state.view.distributionError) {
                                        commit('view/main');
                                    }

                                    //弹窗处理
                                    if (orderForm.popupInfo) {
                                        var popupInfo = orderForm.popupInfo;
                                        var code = popupInfo.code;
                                        var msg = popupInfo.msg;
                                        if (msg) {
                                            if (code === -1708) {
                                                $confirm({
                                                    title: '提示',
                                                    content: msg || '部分商品价格有变更，请以下单价格为准，若确认可继续下单',
                                                    cancelText: '返回查看',
                                                    confirmText: '继续下单'
                                                }).catch(function() {
                                                    dispatch('back');
                                                });
                                            } else {
                                                //关联购卡打点
                                                code === -802 && EventTracking('response', '无优惠弹窗', '', '出现');
                                                $alert({
                                                    content: msg,
                                                    confirmText: '我知道了'
                                                }).then(function() {
                                                    if (code === -250 || code === -252) {
                                                        dispatch('updateTimelinessParam', {
                                                            logisticsTimelinessType: 0,
                                                            logisticsCompanyId: 0,
                                                            logisticsAmount: 0
                                                        });
                                                        dispatch('changeLogisticsInfoModal', false);
                                                        dispatch('refresh');
                                                    }else if(code === -801) {
                                                        dispatch('refresh');
                                                    }
                                                });
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }
                        } else {
                            setTimeout(function() {
                                dispatch('goErrorPage', json.msg);
                            }, 300);
                        }
                    })
                    .catch(function(e) {
                        if (showLoading) {
                            commit('app/hideDistributeLoading');
                        }

                        // 状态码异常等，认为是分配失败，显示distributionError页面，让用户手动重试
                        commit('view/distributionError');
                        console.log('e', e);
                    });
            });
    },

    changeSelectedAddress(ctx, payload) {
        var commit = ctx.commit;

        var addressOptionalList = payload.addressOptionalList;

        if (addressOptionalList.length > 0) {
            commit('address/change', payload);
        }
    },

    changeAddress(ctx, addressId) {
        var commit = ctx.commit;
        var state = ctx.state;
        var dispatch = ctx.dispatch;

        commit('address/hideChange');
        if (state.address.id === addressId) {
            return;
        }

        commit('address/update', {
            id: addressId
        });
        dispatch('refresh');
    },

    cancelChangeAddress(ctx) {
        var commit = ctx.commit;
        commit('address/hideChange');
    },

    // 显示 |是否添加新地址| 弹窗
    showAddGeoAddress(ctx) {
        var commit = ctx.commit;
        commit('geo/show');
    },
    // 隐藏 |是否添加新地址| 弹窗
    hideAddGeoAddress(ctx) {
        var commit = ctx.commit;
        commit('geo/hide');
    },
    // code不等于200，后端返回了具体的errMsg，跳转错误页
    goErrorPage(ctx, message) {
        // var commit = ctx.commit;
        var targetUrl =
            `/failure.html?errorMsg=${encodeURIComponent(message || '')}`;
        location.replace(targetUrl);
    },
    // 提交订单前的检查，这里仅做是否可以进入下一步doSubmit的检查
    preSubmitCheck(ctx, options) { // eslint-disable-line complexity
        var dispatch = ctx.dispatch;
        var commit = ctx.commit;
        var state = ctx.state;
        var orderForm = state.order.syncData.orderForm || {};
        var asyncOrderForm = state.order.orderForm;
        var interceptList = ctx.state.goodsintercept.list;
        var geograph = ctx.state.geo;
        var address = ctx.state.address;
        var isVirtualOrder = asyncOrderForm.isVirtualOrder || orderForm.isVirtualOrder;
        var rechargeType = state.order.rechargeType;

        var isRechargeOrder = checkIsRechargeOrder(rechargeType);
        var isGameOrder = rechargeType === RECHARGE_TYPE_GAME;
        var isAppStore = rechargeType === RECHARGE_TYPE_APPSTORE; // 卡密不用做游戏订单的校验
        var isOilOrder = [RECHARGE_TYPE_ZSY, RECHARGE_TYPE_ZSH].indexOf(rechargeType) > -1;
        var isVideoOrder = rechargeType === RECHARGE_TYPE_VIDEO;

        var isDepositPreOrder = state.order.isDepositPreOrder;
        var isDepositFullOrder = state.order.isDepositFullOrder;
        var isAgreeDeposit = state.order.isAgreeDeposit;
        var needVerifyAddress = !address.id && !isVirtualOrder && !isDepositFullOrder;

        options = options || {};

        // 虚拟商品不需要验证地址
        if (needVerifyAddress) {
            if (!geograph.matched) {
                // 如果和后端地址不匹配，拦截过地址，再次拦截
                dispatch('showAddGeoAddress');
            } else {
                // 否则直接提示地址有误
                $toast('地址有误');
            }
            return Promise.reject();
        }

        ////非预付定金付全款，收货人手机号6万超限下单拦截生效,这个优先级最高，8由前端自行定义，
        if(Number(address.invalidStatus) === 8 && !isDepositFullOrder){
            dispatch(
                'toEditAddress',
                {
                    title: '收货人手机号已超年度限额',
                    msg: '根据海关相关政策，该收货人手机号已超过年度消费限制额度，可能会导致清关失败，请修改收货人手机号',
                    confirmText: '修改收货人信息'
                }
            );
            return Promise.reject();
        }

        if (Number(address.invalidStatus) === 1 && address.notifyInvalid) {
            $confirm({
                content: '由于地址库升级，请重新编辑收货地址的所在地区，即可顺利下单',
                confirmText: '修改地址',
                cancelText: '再想想',
            }).then(function() {
                dispatch('editInvalidAddress', address);
            }).catch(function() {});
            return Promise.reject();
        }

        // 商品拦截 JIRA#KJDS-29848 见交互稿
        if (interceptList && interceptList.length > 0 && options.checkInterceptList !== false) {
            var errType = interceptList[0].errType;
            var tmp = '';
            /**
             * 此处文案替换为固定文案
             */
            if (errType === 4) {
                // 赠品数量不足
                // 取仓库名
/*                 tmp = [];
                interceptList.forEach(function(v1) {
                    v1.checkLimitResultList.forEach(function(v2) {
                        tmp.push(getWarehouseName(v2));
                    });
                });

                tmp = uniqueArray(tmp).join('、'); */

                return $confirm({
                    content: '因仓库赠品不足或赠送名额限制，您无法获得赠品，是否继续提交订单？',
                    cancelText: '再想想',
                    confirmText: '继续支付'
                }).then(function() {
                    // 递归，直到所有检查都通过，如果其中一环reject，不提交
                    // 下次check不检查赠品缺货
                    return dispatch(
                        'preSubmitCheck',
                        Object.assign({}, options, {
                            checkInterceptList: false
                        })
                    );
                });
            } else if (errType === 51) {
                // 奶粉/纸尿裤限购
                // 取限购信息
                tmp = interceptList
                    .map(function(v) {
                        // errMsg:
                        // 奶粉|2|罐
                        // ->
                        // 自营保税仓【纸尿裤/拉拉裤】单次限购6包
                        var errMsg =
                            v.checkLimitResultList[0].errMsg || '';
                        var payload = errMsg.split('|');
                        if (payload[0] && payload[1] && payload[2]) {
                            return (
                                getWarehouseName(
                                    v.checkLimitResultList[0]
                                ) +
                                '【' +
                                payload[0] +
                                '】' +
                                '单次限购' +
                                payload[1] +
                                payload[2]
                            );
                        }
                        return '';
                    })
                    .filter(function(v) {
                        return !!v;
                    })
                    .join('，');

                $alert({
                    content: tmp + '，您已超限，请分开购买哦~'
                });
                return Promise.reject();
            }
            // 其他
            commit('goodsintercept/show');
            // 拒绝提交，等用户前往购物车把对应商品从订单中剔除才允许提交
            return Promise.reject();
        }

        // 提醒赠品缺货
        if (
            options.checkGiftShortage !== false &&
            orderForm.maizengGiftShortage
        ) {
            return dispatch('showGiftShortageDialog').then(function() {
                // 递归，直到所有检查都通过，如果其中一环reject，不提交
                // 下次check不检查赠品缺货
                return dispatch(
                    'preSubmitCheck',
                    Object.assign({}, options, {
                        checkGiftShortage: false
                    })
                );
            });
        }
        var gameState;
        if ((isRechargeOrder || isGameOrder || isVideoOrder || isOilOrder) && !isAppStore) {
            gameState = state.order.game;
            var showView = gameState.showView;
            if (showView.chiefFieldName && !gameState.rechargeAccount) {
                $toast('请输入' + showView.chiefFieldName);
                return Promise.reject();
            }
            if (showView.gameAccountName && !gameState.gameAccount) {
                $toast('请输入' + showView.gameAccountName);
                return Promise.reject();
            }
            // 特殊字符校验
            var charArr = [];
            var account = '';
            if (showView.chiefFieldName && gameState.rechargeAccount) {
                account = gameState.rechargeAccount;
            }
            if (account && showView.forbidStrList && showView.forbidStrList.length > 0) {
                for (var i = 0, len = account.length; i < len; i++) {
                    for (var j = 0, len2 = showView.forbidStrList.length; j < len2; j++) {
                        if (account.charAt(i) === showView.forbidStrList[j]) {
                            if (showView.forbidStrList[j] === ' ') {
                                charArr.push('空格');
                            } else {
                                charArr.push(showView.forbidStrList[j]);
                            }
                        }
                    }
                }

                var unique = function(oldArr) {
                    if (oldArr && oldArr.length > 0) {
                        var newArr = [];
                        for (var i = 0, len = oldArr.length; i < len; i++) {
                            for (var j = 0, len2 = newArr.length; j < len2; j++) {
                                if (oldArr[i] === newArr[j]) {
                                    break;
                                }
                            }
                            if (j === len2) {
                                newArr.push(oldArr[i]);
                            }
                        }
                        return newArr;
                    }
                    return [];
                };

                if (charArr.length > 0) {
                    // 数组去重
                    var newCharArr = unique(charArr);
                    var str = newCharArr.join(' ');
                    $toast('充值账号不能包含' + str + '字符');
                    return Promise.reject();
                }
            }

            if (!options.firstPayChecked) {
                return dispatch('validateFirstPay')
                    .then(function(resp) {
                        console.info(resp);
                        if (resp.errorMsg) {
                            $toast(resp.errorMsg);
                            return Promise.reject();
                        }
                        return dispatch(
                            'preSubmitCheck',
                            Object.assign({}, options, {
                                firstPayChecked: true
                            })
                        );
                    });
            }
        }
        // if (isOilOrder && !validate.oilNumberValid(gameState.rechargeAccount, rechargeType)) {
        //     $toast('请输入正确的' + showView.chiefFieldName);
        //     return Promise.reject();
        // }
        // 虚拟商品二次确认
        if (
            isVirtualOrder &&
            !isRechargeOrder &&
            options.checkVirtualOrder !== false
        ) {
            // 充值中心进入不需要验证弹窗
            // 详情页的卡密也不需要弹窗
            if (!/rechargeCenter/g.test(state.order.syncData.from) &&
                !isFromAppStore(state.order)
            ) {
                return dispatch(
                    'showVirtualOrderConfirm'
                ).then(function() {
                    return dispatch(
                        'preSubmitCheck',
                        Object.assign({}, options, {
                            checkVirtualOrder: false
                        })
                    );
                });
            }
        }

        if (isRechargeOrder && options.checkVirtualOrder !== false) {
            if (state.phone.error) {
                return Promise.reject();
            }
            return dispatch('checkPhoneNumber', gameState.rechargeAccount)
                .then(function(valid) {
                    if (!valid) {
                        return Promise.reject();
                    }
                    return dispatch('showVirtualOrderConfirm')
                        .then(function() {
                            return dispatch(
                                'preSubmitCheck',
                                Object.assign({}, options, {
                                    checkVirtualOrder: false
                                })
                            );
                        });

                });
        }

        // // 触发验证码
        // var needCheckCode = state.order.needCheckCodeVerification;
        // if (needCheckCode) {
        //     // 后端暂时没校验验证码，这里先跳过
        //     // return dispatch( 'showFillCheckCodeDialog' );
        //     return Promise.resolve();
        // }

        if (isDepositPreOrder && !isAgreeDeposit) {
            return $confirm({
                content: '<div align=left><h2 style="color: #333;font-weight: bold; line-height: 20px; margin-bottom: 10px;">温馨提示：请务必按时支付全款，逾期未支付，定金不予退款。 </h2>请放心，开始支付全款时，小考拉会通过短信和APP内通知提醒你</div>',
                cancelText: '再想想',
                confirmText: '同意下单'
            }).then(function() {
                return new Promise(function(resolve) {
                    commit('order/updateDepositAgree', true);
                    setTimeout(resolve, 300);
                });
            });
        }

        return Promise.resolve();
    },
    showVirtualOrderConfirm(ctx) {
        var game = ctx.state.order.game;
        var tpl = [
            '请核对充值账号：',
            '<div style="word-break: break-all;">',
            (game.chiefFieldName ? (game.chiefFieldName + '：') : '') + game.rechargeAccount,
            '</div>'
        ].join('');
        if (game.gameAccount) {
            tpl = [
                '请核对充值账号：',
                '<div style="word-break: break-all;">',
                game.chiefFieldName + '：' + game.rechargeAccount,
                '<br>',
                game.gameAccountName + '：' + game.gameAccount,
                '</div>'
            ].join('');
        }
        return $confirm({
            content: tpl,
            cancelText: '返回',
            confirmText: '确定'
        });
    },
    validateFirstPay(ctx) {
        var game = ctx.state.order.game;
        return new Promise(function(resolve, reject) {
            return resolveFirstPayValidateAPI({
                    rechargeAccount: game.rechargeAccount,
                    goodsId: game.goodsId,
                })
                .then(function(res) {
                    resolve(res);
                })
                .catch(function(e) {
                    console.error(e);
                    reject();
                });
        });
    },
    doSubmit(ctx, extraParams) {
        var dispatch = ctx.dispatch;
        var commit = ctx.commit;
        var state = ctx.state;
        var address = ctx.state.address;
        var order = state.order;
        var vip = state.vip;
        var asyncOrderForm = ctx.state.order.orderForm;
        extraParams = extraParams || {};
        // 是否是话费充值订单
        var isRechargeOrder = checkIsRechargeOrder(state.order.rechargeType);
        var isRealNameAuthPostponed = state.order.postponed;
        var extendData = jsonParse(state.order.syncData && state.order.syncData.extendData);

        var isNormalOrder = order.isNormalOrder;
        var isDepositPreOrder = order.isDepositPreOrder;
        var isDepositFullOrder = order.isDepositFullOrder;
        var depositId = order.depositId;
        var gorderId = order.gorderId;

        if (state.order.submited) {
            return;
        }

        var bookParams, couponId, addressId, isUseVip;

        try {
            // 合成提交参数
            commit('order/composeBookParams');

            // getorderorder
            bookParams = ctx.state.order.bookParams;

            // 设置发票信息
            const orderInvoiceInfo = getInvoiceParamsByState(ctx.state.invoice);
            if(orderInvoiceInfo) {
                Object.assign(bookParams, formdatafy({ 
                    orderInvoiceInfo
                }));
            }

            // 让后端跳过校验赠品不足
            bookParams.bookSourceExt = 1;

            // 如果用户选择"先去支付"，让后端跳过实名认证
            if (isRealNameAuthPostponed) {
                bookParams = Object.assign({}, bookParams, {
                    createOrderWithoutAuth: true
                });
            }

            // 更新优惠券
            var currentCoupons = ctx.state.coupon.current;
            bookParams = Object.assign(bookParams, currentCoupons.reduce(function(prev, item) {
                if (item.id) {
                    var temp = {};
                    temp[item.name] = item.id;
                    return Object.assign(prev, temp);
                }
                return prev;
            }, {}));

            // 更新地址信息
            addressId = ctx.state.address.id;
            if (addressId) {
                bookParams = Object.assign({}, bookParams, {
                    'address.addressId': addressId
                });
            }

            // 额外的参数
            if (extraParams) {
                bookParams = Object.assign({}, bookParams, extraParams);
            }

            // 是否是 团长免单
            if (
                extendData.groupBuyActivityForm &&
                extendData.groupBuyActivityForm.isGroupLeaderFree &&
                Number(extendData.groupBuyActivityForm.groupLeaderFreePrice) === 0
            ) {
                bookParams.bookSource = '1';
            }

            // 预付定金增加代付请求参数
            if (isDepositPreOrder) {
                bookParams.bookCustomsBookSource = ctx.state.order.bookCustomsBookSource;
            }

            isUseVip = ctx.state.vip.isUseVip;
            if (isUseVip !== undefined) {
                bookParams.useVipDiscount = isUseVip;
            }

            // 关联购卡参数
            var relatedBuyVipVo = vip.relatedBuyVipVo;
            var vipRedCardUpgradeView = vip.vipRedCardUpgradeView;
            var relatedBuyVipParam = null;
            if(relatedBuyVipVo && vipRedCardUpgradeView) {
                relatedBuyVipParam = {
                    relatedBuyVipInt: vip.relatedBuyVipInt,
                    relatedBuyVipAmount: relatedBuyVipVo.relatedBuyVipAmount,
                    relatedBuyVipSaveAmount: relatedBuyVipVo.relatedBuyVipSaveAmount
                };
                if(relatedBuyVipVo.lastCouponId) {
                    relatedBuyVipParam.lastCouponId = relatedBuyVipVo.lastCouponId;
                }
                if(relatedBuyVipVo.lastLogisticsCouponId) {
                    relatedBuyVipParam.lastLogisticsCouponId = relatedBuyVipVo.lastLogisticsCouponId;
                }
                if(relatedBuyVipVo.lastTaxCouponId) {
                    relatedBuyVipParam.lastTaxCouponId = relatedBuyVipVo.lastTaxCouponId;
                }
            }

            if (asyncOrderForm.isVirtualOrder) {
                if (isRechargeOrder) {
                    // 话费充值
                    // 在bookParams附加上充值账号rechargeAccount
                    bookParams.rechargeAccount = extendData.rechargeAccount || ctx.state.order.game.rechargeAccount;
                }
            }
            var extendPreviewData = ctx.state.order.extendPreviewData;
            var isUseRedPacket = ctx.state.redPacket.isUseRedPacket;

            let useDiscountList = null

            if(ctx.state.vip.vipDiscountWindowViewVo){
              useDiscountList = ctx.state.vip.vipDiscountWindowViewVo.goodsDiscountList
                .filter(v=>v.selectedAble)
                .map(v=>({discountType:v.discountType,discountName:v.discountName,selectedFlag:v.selectedFlag}))
            } 

            Object.assign(bookParams, formdatafy({
                editableExtendData: {
                    useRedPacket: Number(!!isUseRedPacket),
                    selectableTimelinessParam: ctx.state.order.selectableTimelinessParam,
                    bookCustomsBookSource: ctx.state.order.bookCustomsBookSource,
                    relatedBuyVipParam: relatedBuyVipParam,
                    useDiscountList,
                    extendPreviewData: typeof extendPreviewData === 'undefined' ?
                        void 0 :
                        (typeof extendPreviewData === 'string' ?
                            extendPreviewData :
                            JSON.stringify(extendPreviewData))
                }
            }),{
              useVipDiscount: 1,
            });
        } catch (e) {
            return $toast('提交失败！');
        }

        var depositPreOrderParams = Object.assign({
            depositId: depositId
        }, bookParams);

        var depositFullOrderParams = Object.assign({
            gorderId: gorderId,
        }, bookParams);
        /* eslint-disable */
        // 将请求加载的逻辑交给 resolveRefreshAPI
        var pay = resolveSubmitAPI({
            isNormalOrder: isNormalOrder,
            isDepositPreOrder: isDepositPreOrder,
            isDepositFullOrder: isDepositFullOrder
        }, {
            normalOrderParams: bookParams,
            depositPreOrderParams: depositPreOrderParams,
            depositFullOrderParams: depositFullOrderParams
        });
        var isPhoneRechargeGiftInApp = _.isKaolaApp() && state.order.rechargeType === 5; // 礼包单独在app中开支付浮层
        if (isPhoneRechargeGiftInApp) {
            pay = new Promise(function(resolve, reject) {
                appBridge._$openCashierDesk({
                    gorderId: gorderId,
                }, function(res) {
                    try {
                        if (res.pay_result) { // 支付成功
                            resolve({
                                code: 200,
                                msg: 'success',
                                body: {
                                    gorderId: res.gorderId
                                }
                            })
                        } else {
                            location.href = `/recharge/recharge_owes_page.html?tel=${bookParams.rechargeAccount}`;
                            reject(res);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            })
        }


        pay.then(function(json) {
                /* eslint-enable */
                var code = json.code;
                var msg = json.msg;
                if (code === 200) {
                    commit('order/submit');
                    // 如果0元下单且bookSource='1'，直接跳支付成功
                    if (Number(bookParams.bookSource) === 1) {
                        setTimeout(function() {
                            location.href =
                                '/order/pay_success.html?gorderId=' +
                                json.body.gorderId;
                        }, 500);
                        return;
                    }

                    if (ctx.state.order.bookCustomsBookSource === 1) {
                        location.href = '/order/honeypay.html?gorderId=' + json.body.gorderId;
                        return;
                    }
                    var paywayUrl = json.body.payUrl;

                    // 新闻钱包，需要带特定参数fromNewsappPct，走native支付流程
                    if (
                        sessionStorage.getItem('news_kaola_ActId') ===
                        '7190'
                    ) {
                        paywayUrl = json.body.payUrl + '&fromNewsappPct=1';
                    }
                    location.replace(paywayUrl, '_self');
                } else if (code === -250 || code === -251) {
                    $alert({
                        content: msg,
                        confirmText: '我知道了'
                    }).then(function() {
                        //重置物流参数
                        dispatch('updateTimelinessParam', {
                            logisticsTimelinessType: 0,
                            logisticsCompanyId: 0,
                            logisticsAmount: 0
                        });
                        dispatch('refresh');
                    });
                } else if (code === -123) {
                    var params = [
                        'fromOther=1',
                        'title=绑定手机号',
                        'pageTitle=绑定手机号',
                        'tip=为了保障您的账户安全，请先绑定手机号，绑定成功后即可继续购买。',
                        'btnTxt=确认',
                        'target=' + encodeURIComponent(location.href),
                    ].join('&');
                    var targetUrl = '//m.kaola.com/personal/redirectBind.html?' + params;
                    location.href = targetUrl;
                } else if (code === -177) {
                    $alert({
                        title: '此地址无法享受黑卡权益',
                        content: msg
                    }).then(function() {
                        dispatch('refresh');
                    });
                } else if (code === -178) {
                    $alert({
                        content: '<pre>' + msg + '</pre>'
                    }).then(function() {
                        dispatch('refresh');
                    });
                } else if (code === 461) {
                    location.href =
                        '//m.kaola.com/login.html?target=' +
                        encodeURIComponent(location.href);
                }else if(code === -6311){ //收货人手机号6万超限下单拦截
                    dispatch(
                        'toEditAddress',
                        {
                            title: '收货人手机号已超年度限额',
                            msg: '根据海关相关政策，该收货人手机号已超过年度消费限制额度，可能会导致清关失败，请修改收货人手机号',
                            confirmText: '修改收货人信息'
                        }
                    );
                }else if (code === -600) {
                    if (!json.body) {
                        return
                    }
                    const needVerifyLevel = json.body.needVerifyLevel;
            
                    if (needVerifyLevel === 1) {
                        const hasAuthInfo = json.body.hasAuthInfo || {};
                        const needPhoneNoLevel = json.body.needPhoneNoLevel || 0
                        const { realName = '', idCardNum = '', authId= '' } = hasAuthInfo;
                        new Realname4PayerModal({
                            data: {
                                realName,
                                idCardNum,
                                authId,
                                needPhoneNoLevel,
                                isAfterPay: false,
                                authId: hasAuthInfo.authId || ''
                            },
                        })
                            .$on('success', () => {
                                $toast("认证成功");
                                dispatch('doSubmit');
                            })
                            .$on('payfirst', () => {
                                dispatch(
                                    'doSubmit',
                                    Object.assign({}, extraParams, {
                                        createOrderWithoutAuth: true
                                    })
                                );
                            })
                            .$on('overlimit', (data) => {
                               // new AfterPayedModal({ data });
                            }); 
                    } else if (needVerifyLevel === 4) {
                        const authInfo = json.body.hasAuthInfo || {};
                        const contactId = address.id;
                        // 收获人认证 -> 实名认证
                        new Realname4ReceiverModal({
                            data: {
                                gorderId,
                                contactId,
                                isAfterPay: false,
                                realName: authInfo.realName,
                            }
                        })
                            .$on('payfirst', function() {
                                dispatch(
                                    'doSubmit',
                                    Object.assign({}, extraParams, {
                                        createOrderWithoutAuth: true
                                    })
                                );
                            })
                            .$on('success', function() {
                                $toast('认证成功');
                                dispatch('doSubmit');
                            })
                            .$on('overlimit', function(data) {
                                new BeforePayedModal({
                                    data: {
                                        orderIds: data.orderIds,
                                        allGoodsLimit: data.allGoodsLimit,
                                        customsLimitGoodsList: data.customsLimitGoodsList
                                    }
                                }).$on('honeypay', function() {
                                    dispatch('changeBookCustomsBookSource', 1);
                                    dispatch('doSubmit');
                                }).$on('back', function(honeyPayData) {
                                    dispatch('honeyPayBack', honeyPayData);
                                }).$on('stillBuy', function() {
                                    dispatch('changeBookCustomsBookSource', 2);
                                    dispatch('doSubmit');
                                }).$on('similar', function(honeyPayData) {
                                    dispatch('honeyPaySimilar', honeyPayData);
                                });
                            });
                    } else if (needVerifyLevel === 2) {
                        const contactId = address.id;

                        new RealnameSectionWithPhoto({
                            data:{
                                gorderId,
                                contactId,
                                isAfterPay: false,
                            }
                        })
                            .$on('payfirst', function() {
                                dispatch(
                                    'doSubmit',
                                    Object.assign({}, extraParams, {
                                        createOrderWithoutAuth: true
                                    })
                                );
                            })
                            .$on('success', function() {
                                $toast('认证成功');
                                dispatch('doSubmit');
                            })
                    }
                } else if (code === -130) {
                    // 取“-130”表示个人物品清关超过仓库的限购数量
                    $alert({
                        content: msg + '，您已超限，请分开购买哦~'
                    });
                } else if (code === -666) {
                    //帮砍价 部分商品信息已变更
                    $alert({
                        content: '部分商品信息已变更，订单提交失败'
                    });
                } else if (code === -999) {
                    //帮砍价 本次砍价倒计时已结束
                    $alert({
                        content: '订单提交失败：本次砍价倒计时已结束'
                    });
                } else if (code === -258) {
                    // http://jira.netease.com/browse/KJDS-18527
                    var notAllowedBuylinks = (json.body
                            .orderBookGoodsSeckillIntercept || [])
                        .map(function(v) {
                            return (
                                '<div><a href="' +
                                domainConfig.pages.goods +
                                '/product/' +
                                v.goodsId +
                                '.html" style="color: #007aff;">' +
                                v.title +
                                '</a><div>'
                            );
                        })
                        .join('');

                    $confirm({
                        content: '<div style="text-align: left;"><div style="margin-bottom: 5px;">订单中含有秒杀商品，当前预热期不可购买，请剔除后结算。<br /></div>' +
                            notAllowedBuylinks +
                            '</div>',
                        cancelText: '取消',
                        confirmText: '返回购物车'
                    }).then(function() {
                        location.href = '/cart.html';
                    });
                } else if (
                    code === -170 ||
                    code === -168 ||
                    code === -169
                ) {
                    // http://jira.netease.com/browse/KJDS-24465
                    $alert({
                        content: msg,
                        confirmText: '确 定'
                    }).then(function() {
                        // 编辑地址
                        dispatch('editAddress', address);
                    });
                } else if (code === -259) {
                    // 0元支付，被后端拦截，需要弹窗再次提交订单
                    $confirm({
                        content: '本订单无需付款，确认将直接下单',
                        cancelText: '我再想想',
                        confirmText: '提交订单'
                    }).then(function() {
                        // 提交订单bookSource参数置为1，后端不会拦截
                        dispatch('doSubmit', {
                            bookSource: '1'
                        });
                    });
                } else if (code === -171 || code === -245) {
                    commit(
                        'goodsintercept/update',
                        json.body.checkLimitRegionList
                    );
                    commit('goodsintercept/show');
                } else if (
                    code === -129
                ) {
                    dispatch(
                        'toEditAddress', {
                            msg: '因系统地址信息升级，所选的收货地址已失效，请修改地址后再下单~'
                        }
                    );
                    _.daEvent('确认订单页', '失效地址拦截', '出现');
                } else if (code === -620) {
                    dispatch(
                        'toEditAddress', {
                            msg: '请输入收货人手机号后重新提交订单~'
                        }
                    );
                } else if (code === -623) {
                    dispatch(
                        'toEditAddress', {
                            title: '收货人姓名不符合规范',
                            msg: msg,
                        }
                    );
                } else if (code === -621) {
                    dispatch(
                        'toEditAddress', {
                            msg: '根据海关要求，购买本订单商品：收货人姓名不能含阿拉伯数字，请修改后重新提交订单'
                        },
                        function() {
                            _.daEvent('提交订单页', '姓名格式校验拦截', '立即修改');
                        },
                        function() {
                            _.daEvent('提交订单页', '姓名格式校验拦截', '关闭');
                        }
                    );
                    _.daEvent('提交订单页', '姓名格式校验拦截', '出现');
                } else if (code === -2011) {
                    var data = json.body && json.body.customsLimitVo;
                    var HoneyModal = {};
                    if (isNormalOrder) {
                        HoneyModal = BeforePayedModal;
                    } else if (isDepositPreOrder) {
                        HoneyModal = DepositPreModal;
                    } else if (isDepositFullOrder) {
                        HoneyModal = DepositFullModal;
                    }

                    new HoneyModal({
                        data: {
                            gorderId: gorderId,
                            allGoodsLimit: data.allGoodsLimit,
                            couldHoneyPay: data.showHoneyPay,
                            customsLimitGoodsList: data.customsLimitGoodsList
                        }
                    }).$on('honeypay', function() {
                        dispatch('changeBookCustomsBookSource', 1);
                        dispatch('doSubmit');
                    }).$on('back', function(honeyPayData) {
                        dispatch('honeyPayBack', honeyPayData);
                    }).$on('stillBuy', function() {
                        dispatch('changeBookCustomsBookSource', 2);
                        dispatch('doSubmit');
                    }).$on('similar', function(honeyPayData) {
                        dispatch('honeyPaySimilar', honeyPayData);
                    });
                } else if (code === -690 || code === -803) {
                    $alert({
                        content: json.msg,
                        confirmText: '我知道了'
                    }).then(function() {
                        dispatch('back');
                    });
                    //关联购卡打点
                    code === -803 && EventTracking('response', '会员状态变更弹窗', '', '出现');
                //toast全部改弹窗
                } else {
                    $alert({
                        content: json.msg || '提交失败！',
                        confirmText: '确定'
                    })
                }
            })
    },

    honeyPaySimilar(ctx, data) {
        var limitGoodsList = data && data.customsLimitGoodsList || [];
        var limitGoodsLength = limitGoodsList.length;
        var goodsIds = [];
        if (limitGoodsLength > 0) {
            for (var i = 0; i < limitGoodsLength; i++) {
                goodsIds.push(limitGoodsList[i] && limitGoodsList[i].goodsId);
            }
        }
        location.href = '/customsLimitRecommend/recommendPage.html?goodsIds=' + goodsIds.join(',');
    },

    honeyPayBack(ctx, data) {
        var limitGoodsList = data && data.customsLimitGoodsList || [];
        var limitGoodsLength = limitGoodsList.length;
        if (limitGoodsLength > 0 && window.__.s === '1') {
            limitGoodsList.forEach(function(item) {
                item.cartGoodsType = item.formGoodsType;
                item.selected = 0;
            });
            var url = '/cart/modifySelect.html';
            var option = {
                data: {
                    modifyCartSelectParams: limitGoodsList
                },
                type: 'form',
                method: 'POST'
            };
            Request(url, option);
        }
        history.go(-1);
    },

    toEditAddress(ctx, options, ok, cancel) {
        var dispatch = ctx.dispatch;
        var address = ctx.state.address;
        var msg = options.msg;
        var title = options.title;
        var confirmText = options.confirmText;
        
        return $alert({
            title: title,
            content: msg || '',
            confirmText: confirmText || '修改地址'
        }).then(function() {
            dispatch('editAddress', address);
            ok && ok();
        }).catch(function() {
            cancel && cancel();
        });
    },

    getGameFields(ctx, payload) {
        var dispatch = ctx.dispatch;
        return api.gameShow({
                goodsId: payload
            })
            .then(function(resp) {
                resp.goodsId = payload;
                ctx.commit('order/initGameFields', resp);
                if (resp.rechargeType === RECHARGE_TYPE_PHONE_GIFT) {
                    var order = (window.__ || {
                        orderForm: {}
                    }).orderForm;
                    var phoneNo = (order || {
                        rechargeAccount: ''
                    }).rechargeAccount;
                    dispatch('checkPhoneNumber', phoneNo);
                }
                if (resp.showView && resp.showView.fetchAccountType === 1) {
                    ctx.dispatch('fetchSecondAccounts', {
                        goodsId: payload
                    });
                }
                if (resp.showView && resp.showView.tipTitle && resp.showView.tipDescH5) {
                    ctx.commit('order/changeAntiCheatInfo', {
                        tipTitle: resp.showView.tipTitle,
                        tipDescH5: resp.showView.tipDescH5
                    });
                } else {
                    ctx.commit('order/changeAntiCheatInfo', null);
                }
            })
            .catch(console.error);
    },
    fetchSecondAccounts(ctx, payload) {
        var firstAccount = '';
        var goodsId = '';
        try {
            firstAccount = ctx.state.order.game.rechargeAccount;
        } catch (e) {
            console.error(e);
        }
        if (!firstAccount) {
            ctx.commit('order/setSecondAccounts', []);
            return;
        }
        if (payload && payload.goodsId) {
            goodsId = payload.goodsId;
        } else {
            goodsId = ctx.state.order.orderForm.allSelectedOrderFormGoods[0].goodsId || '';
        }
        ctx.commit('order/setFetchingSecondAccounts', true);
        var query = {
            goodsId: goodsId,
            firstAccount: firstAccount,
        };
        var game = ctx.state.order.game;
        if (game.firstSelected) {
            query.gameExtend1 = game.firstSelected.value;
        }
        if (game.secondSelected) {
            query.gameExtend2 = game.secondSelected.value;
        }
        api.fetchSecondAccounts(query)
            .then(function(secondAccountsResp) {
                ctx.commit('order/setSecondAccounts', secondAccountsResp.secondAccount || []);
                ctx.commit('order/setFetchingSecondAccounts', false);
            })
            .catch(function(e) {
                console.error(e);
            });
    },
    getGameFieldsFromSyncData(ctx, goodsId) {
        window.__.goodsId = goodsId;
        ctx.commit('order/initGameFieldsFromSyncData', window.__);
    },
    // 提交订单，此处会dispatch |preSubmitCheck| 和 |doSubmit|
    submit(ctx, options) {
        var dispatch = ctx.dispatch;
        var state = ctx.state;
        options = options || {};

        // 是否是话费充值订单
        var isRechargeOrder = checkIsRechargeOrder(state.order.rechargeType);
        var orderForm = state.order.orderForm || {};

        dispatch('preSubmitCheck', options)
            .then(function() {
                if (isRechargeOrder) {
                    dispatch('doSubmit', {
                        createOrderWithoutAuth: true,
                        lastConfirmOrderSerialId: orderForm.confirmOrderSerialId
                    });
                } else {
                    dispatch('doSubmit');
                }
            })
            .catch(function(e) {
                //如果e 没有值，表明是业务正常reject，不上报
                if (!e) {
                    return;
                }
                _.throwExp('订单确认页', 'submit action: preSubmitCheck', e.message );
            });
    },
    // 显示优惠券列表
    showCoupons(ctx) {
        var commit = ctx.commit;
        commit('view/coupons', true);
        window.scrollTo(0, 0);
    },
    // 关闭优惠券列表
    closeCoupons(ctx) {
      var commit = ctx.commit;
      commit('view/coupons', false);
      window.scrollTo(0, 0);
    },
    // 显示主页面
    showMain(ctx) {
        var commit = ctx.commit;
        var dispatch = ctx.dispatch;

        commit('view/main');
        dispatch('modifyTitle', MAIN_PAGE_TITLE);
        window.scrollTo(0, 0);
    },
    // 使用某张优惠券
    useCoupon(ctx, couponId) {
        var commit = ctx.commit;
        commit('coupon/use', couponId);
    },
    // 不使用任何优惠券
    unuseCoupon(ctx, couponId) {
        var commit = ctx.commit;
        commit('coupon/unuse', couponId);
    },
    // 即将选择地址
    chooseAddress(ctx) {
        var commit = ctx.commit;
        commit('view/address');
        commit('address/list');
    },

    closeNotifyInvalidAddress(ctx) {
        var commit = ctx.commit;
        commit('address/closeInvalidNotify');
    },
    // 打开会员选择
    openVip(ctx) {
        var commit = ctx.commit;
        commit('view/vip');
    },
    // 是否选择使用会员
    selectVip(ctx, isUseVip) {
        var commit = ctx.commit;
        commit('vip/resolve', Number(isUseVip));
    },
    // 切换关联购卡
    selectRelatedBuyVip(ctx) {
        var commit = ctx.commit;
        commit('vip/selectRelatedBuyVip');
    },

    onShowUpgradeModal(ctx, isShowModal) {
        var commit = ctx.commit;
        commit('vip/changeUpgradeVipModal', isShowModal);
    },
    // 即将添加地址
    addAddress(ctx) {
        var commit = ctx.commit;
        commit('view/address');
        commit('address/new');
    },

    editCurrentInvalidAddress(ctx) {
        var dispatch = ctx.dispatch;
        dispatch('editInvalidAddress', ctx.state.address);
    },

    editCurrentAddress(ctx) {
        var dispatch = ctx.dispatch;
        dispatch('editAddress', ctx.state.address);
    },

    editInvalidAddress(ctx, address) {
        var commit = ctx.commit;
        commit('address/edit', address);
        commit('address/openAddress');
        commit('view/address');
    },

    // 即将编辑地址
    editAddress(ctx, address) {
        var commit = ctx.commit;
        commit('address/edit', address);
        commit('view/address');
    },
    // 更新地址信息
    refreshAddress(ctx, address) {
        var commit = ctx.commit;
        commit('address/update', address);
    },
    // 打开编辑发票模块
    openInvoiceEditor({ commit }) {
        commit('view/invoice');
        window.scrollTo(0, 0);
    },
    // 关闭编辑发票模块
    closeInvoiceEditor({ commit }) {
        commit('view/main');
    },
    // 跳转到购物车页面
    goCart() {
        location.href = '/cart.html';
    },
    // 跳转到购物车，并锚点至无效商品
    goCartInvalidGoods() {
        location.href = '/cart.html?auto-anchor-invalid=1';
    },
    // 赠品缺货
    showGiftShortageDialog() {
        return $confirm({
            content: '赠品数量已不足，您可能无法获得赠品，是否继续提交？',
            cancelText: '返回',
            confirmText: '继续提交'
        });
    },

    /* 验证码相关 Start */
    // 显示填写验证码弹窗
    showFillCheckCodeDialog(ctx) {
        var commit = ctx.commit;
        commit('checkcode/show');
    },

    showExtraSelector(ctx, index) {
        ctx.commit('gameExtraSelector/show', index);
        ctx.commit('order/updateActiveExtraSelectionIndex', index);
    },
    hideExtraSelector(ctx) {
        ctx.commit('gameExtraSelector/hide');
    },
    updateGameExtraSelection(ctx, selection) {
        ctx.commit('order/updateGameFields', selection);
    },
    changeGameFieldValue(ctx, msg) {
        ctx.commit('order/updateGameField', msg);
    },
    checkPhoneNumber(ctx, phoneNumber) {
        try {
            var order = ctx.state.order;
            var goods = order.orderForm.allSelectedOrderFormGoods[0];
            var params = {
                phoneNum: phoneNumber,
                goodsId: goods.goodsId,
                skuId: goods.skuId,
            };
            if (!/^\d{11}$/.test(phoneNumber)) {
                ctx.commit('phone/updatePhoneError', '请输入正确的11位手机号');
                return Promise.reject();
            }
            return api.checkPhoneNumber(params)
                .then(function(resp) {
                    var success = resp.retcode === 200;
                    if (success) {
                        ctx.commit('phone/updatePhoneInfo', resp.districtName);
                    } else {
                        ctx.commit('phone/updatePhoneError', resp.retdesc);
                    }
                    return success;
                })
                .catch(function() {
                    ctx.commit('phone/updatePhoneError', '请稍后重试');
                });
        } catch (e) {
            ctx.commit('phone/updatePhoneError', '请稍后重试');
        }

    },
    openRedPacketPage(ctx) {
        ctx.commit('view/redPacket');
    },
    changeIsUseRedPacket(ctx, value) {
        ctx.commit('redPacket/change', value);
    },
    changeLogisticsInfoModal(ctx, param) {
        ctx.commit('order/changeLogisticsInfoModal', param);
    },
    changeUpgradeVipModal(ctx, param) {
        ctx.commit('vip/changeLogisticsInfoModal', param);
    },
    updateTimelinessParam(ctx, item) {
        ctx.commit('order/updateTimelinessParam', item);
    },
    updateLogisticsTaxAmount(ctx, amount) {
        ctx.commit('order/updateLogisticsTaxAmount', amount);
    },
    updateIncludeHighPostageGoods(ctx, includeHighPostageGoods) {
        ctx.commit('order/updateIncludeHighPostageGoods', includeHighPostageGoods);
    },
    changeFreightModal(ctx, param) {
        ctx.commit('order/changeFreightModal', param);
    },
    firstAccountBlur(ctx) {
        if (ctx.state.order.game.secondAccountSelective) {
            var goodsId = '';
            try {
                goodsId = ctx.state.order.orderForm.allSelectedOrderFormGoods[0].goodsId;
            } catch (e) {
                console.error(e);
            }
            ctx.dispatch('fetchSecondAccounts', {
                goodsId: goodsId,
            });
        }
    },
    selectSecondAccount(ctx) {
        var game = ctx.state.order.game;
        if (!game.rechargeAccount || !game.secondAccounts || !game.secondAccounts.length) {
            return;
        }
        new Selector({
            data: {
                title: game.gameAccountName,
                accounts: game.secondAccounts,
                value: '',
            },
        }).$on('select', function(item) {
            ctx.commit('order/setSecondAccount', item.value);
        });
    },
    changeBookCustomsBookSource(ctx, source) {
        ctx.commit('order/changeBookCustomsBookSource', source);
    },
    openVipPreferential (ctx, source) {
      ctx.commit('vip/openVipPreferential', source)
    },
    changeSelectedFlag(ctx, source) {
        ctx.commit('vip/changeSelectedFlag', source);
    },
    vipPreferentialInit(ctx, source) {
        ctx.commit('vip/vipPreferentialInit', source);
    },
};

export default Object.assign(
    actions,
    invoiceActions,
);
