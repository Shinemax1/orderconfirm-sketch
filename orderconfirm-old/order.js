import pick from '../utils/pick';
import pickAs from '../utils/pickAs';
import extractAsync from '../utils/extractParamsFromAsyncGoods';
import extractSync from '../utils/extractParamsFromSyncGoods';
import CONSTANT from '../constant';
import formatDate from '../utils/formatDate';
import _p from 'nej/base/util.js';

var RECHARGE_TYPE_ZSY = CONSTANT.RECHARGE_TYPE_ZSY; // 中石油
var RECHARGE_TYPE_ZSH = CONSTANT.RECHARGE_TYPE_ZSH; // 中石化

export default {
    name: 'order',
    state: {
        vipRightAllowed: '',
        vipHintDocument: '',
        extendPreviewData: '',

        isAgreeDeposit: false,
        isNormalOrder: true,
        isDepositPreOrder: false,
        isDepositFullOrder: false,
        gorderId: 0,
        depositId: 0,
        depositAmount: 0,
        depositDeductedAmount: 0,
        // 后端传过来的同步数据
        syncData: {},

        // 从异步接口取到的orderForm
        orderForm: {},

        // 游戏信息
        game: {
            showView: {},
            activeSelectionIndex: 0
        },

        //物流请求的参数
        selectableTimelinessParam: {
            logisticsTimelinessType: 0,
            logisticsCompanyId: 0,
            logisticsAmount: 0
        },
        bookCustomsBookSource: 0,
        //是否显示物流弹窗
        isShowLogisticsInfoModal: false,

        //物流弹层数据
        logisticsList: [],
        //订单确认页信息模块数据
        logisticsItemSelected: null,
        //运费税费
        logisticsTaxAmount: undefined,
        //运费过高
        includeHighPostageGoods: 0,
        showFreightModal: false,
        orderFormPostageDetail: [],
        //`/order_confirm_data`接口请求参数
        // dispatch |compose| 后可使用
        params: {},

        // `/order/book.html`接口请求参数
        // dispatch |composeSubmitParams| 后可使用
        bookParams: {},

        // 是否需要在提交前触发验证码
        needCheckCodeVerification: false,

        // 订单包含的仓库，内部也包含了商品
        warehouses: [],

        // 留言信息
        remarkMap: {},

        // 是否推迟实名认证，提交订单时需要传对应的参数阻止后端校验
        postponed: false,
        // 在提交时提示的拦截商品
        limitList: [],
        // 防骗提醒
        antiCheatInfo: null,
        /* ↓ ----- ↓ */
        /* 总计那块的数据，底部结算栏 |实付款| 也会用到 |totalPayMoney| */
        // 商品总额
        goodsTotalMoney: '',
        // 商品应付总计
        goodsTotalPayMoney: '',
        // 服务保障
        servicePayAmount: '',
        // 运费
        shipmentMoney: '',
        // 应付总额
        totalPayMoney: '',
        // 税费
        taxMoney: '',
        // 重量，|税费| 那栏左侧会用到
        weight: '',
        // 订单 sku 集合
        orderSkuDesc: '',
        // 是否已经提交过了
        submited: false,
        // 充值订单类型
        rechargeType: void 0
        /* ↑ ----- ↑ */
    },
    reducers: {
        updateDepositAgree: function(state, isAgreeDeposit) {
            state.isAgreeDeposit = isAgreeDeposit;
        },
        submit: function(state) {
            state.submited = true;
        },
        // 需要在提交时触发验证码
        needCheckCode: function(state) {
            state.needCheckCodeVerification = true;
        },
        // 不需要在提交时触发验证码
        noCheckCode: function(state) {
            state.needCheckCodeVerification = false;
        },

        noNeedRealNameAuth: function(state) {
            state.orderForm && (state.orderForm.needVerifyLevel = 0);
        },

        update: function(state, order) {
            // 各种总计价格
            var picked = pickAs(
                order, [
                    'orderAmount',
                    'orderGoodsPayAmount',
                    'logisticsAmount',
                    'orderPayAmount',
                    'totalTaxAmount',
                    'weight',
                    'depositAmount',
                    'depositDeductedAmount',
                    'servicePayAmount',
                    'orderTagInfo',
                    'enterpriseTagInfo',
                    'vipRightAllowed',
                    'vipHintDocument',
                    'extendPreviewData'
                ], [
                    'goodsTotalMoney',
                    'goodsTotalPayMoney',
                    'shipmentMoney',
                    'totalPayMoney',
                    'taxMoney',
                    'weight',
                    'depositAmount',
                    'depositDeductedAmount',
                    'servicePayAmount',
                    'orderTagInfo',
                    'enterpriseTagInfo',
                    'vipRightAllowed',
                    'vipHintDocument',
                    'extendPreviewData'
                ]
            );

            picked.extendPreviewData = picked.extendPreviewData;

            Object.assign(state, picked);

            state.orderForm = order || {};
            state.warehouses = order.orderFormRegionList || [];
            state.limitList = order.checkLimitRegionList || [];
            state.limitGroupList = order.limitGroupList || [];

            //处理物流
            var selectableTimelinessInfo = state.orderForm.selectableTimelinessInfo || {};
            var optionList = selectableTimelinessInfo.optionList || [];
            state.logisticTip = selectableTimelinessInfo.logisticTip;
            state.logisticAgreementsLink = selectableTimelinessInfo.logisticTip;

            if (_p._$isArray(optionList) && optionList.length > 0) {
                state.logisticsList = optionList.map(function(value) {
                    value.deliveryTime = formatDate(value.expectedArrivalTime, value.logisticsTimelinessType);
                    if (value.selected === 1) {
                        state.logisticsItemSelected = value;
                        state.selectableTimelinessParam = {
                            logisticsTimelinessType: value.logisticsTimelinessType,
                            logisticsCompanyId: value.logisticsCompanyId,
                            logisticsAmount: value.logisticsAmount
                        };
                    }
                    return value;
                });
            } else {
                state.logisticsItemSelected = null;
                state.logisticsList = [];
                state.selectableTimelinessParam = {
                    logisticsTimelinessType: 0,
                    logisticsCompanyId: 0,
                    logisticsAmount: 0
                };
            }

            //运费税费
            if (state.orderForm.orderTaxHoverView) {
                state.logisticsTaxAmount = state.orderForm.orderTaxHoverView.logisticsTaxAmount;
            }

            var goods = {};
            try {
                var warehouses = state.warehouses;
                var package1 = [];
                var goodsList = [];

                if (warehouses && warehouses.length) {
                    var packageList = warehouses[0].packageList;
                    var groupList = warehouses[0].groupList;

                    if (packageList && packageList.length) {
                        package1 = packageList;
                    } else if (groupList && groupList.length) {
                        package1 = groupList;
                    }

                    if (package1 && package1.length) {
                        goodsList = (package1[0] || {}).goodsList || [];
                    }
                }

                goods = goodsList[0] || {};
            } catch (e) {
                console.error(e);
            }
            state.orderSkuDesc = goods.skuPropertyStr || '';
        },

        //更新税费
        updateLogisticsTaxAmount: function(state, amount) {
            state.logisticsTaxAmount = amount;
        },

        //包含超高运费
        updateIncludeHighPostageGoods: function(state, includeHighPostageGoods) {
            state.includeHighPostageGoods = includeHighPostageGoods;
        },

        updateOrderFormPostageDetail: function(state, orderFormPostageDetail) {
            state.orderFormPostageDetail = orderFormPostageDetail;
        },

        //显示弹层
        changeFreightModal: function(state, param) {
            state.showFreightModal = param;
        },
        //更新时效参数
        updateTimelinessParam: function(state, item) {
            state.selectableTimelinessParam = {
                logisticsTimelinessType: item.logisticsTimelinessType,
                logisticsCompanyId: item.logisticsCompanyId,
                logisticsAmount: item.logisticsAmount
            };
        },

        //显示物流信息弹层
        changeLogisticsInfoModal: function(state, param) {
            state.isShowLogisticsInfoModal = param && !!state.logisticsList.length;
        },

        updateRemark: function(state, remark) {
            var temp = {};
            temp[remark.merchantId] = remark.remark;
            Object.assign(state.remarkMap, temp);
        },

        // 推迟实名认证
        postponeRealNameAuth: function(state) {
            state.postponed = true;
        },
        // 保存同步数据
        saveSync: function(state, syncData) {
            state.syncData = syncData || {};

            if (typeof syncData.rechargeType !== 'undefined' && syncData.rechargeType !== null) {
                state.rechargeType = syncData.rechargeType;
            }

            var picked = pick(syncData, [
                'isNormalOrder',
                'isDepositPreOrder',
                'isDepositFullOrder',
                'gorderId',
            ]);

            Object.assign(state, picked);

            Object.assign(state, {
                depositId: syncData.orderForm.depositId
            });
        },
        // TODO: composeFromSync可以挪到外面去，并没有真正地修改数据
        // 从syncData合成基础提交参数
        composeFromSync: function(state) {
            var syncData = state.syncData || {};
            var params = {};

            var syncOrderForm = syncData.orderForm;
            // var asyncOrderForm = state.orderForm || {};
            var address = syncData.address;
            var from = syncData.from || '';
            var couponId = syncData.couponId || '';
            var s = syncData.s || '';
            var extendData = syncData.extendData || {};

            Object.assign(params, {
                from: from,
                couponId: couponId,
                s: s,
                extendData: extendData
            });

            // 地址id
            if (address && address.id) {
                params['address.addressId'] = address.id;
            }

            // 商品信息
            if (syncOrderForm.allSelectedOrderFormGoods) {
                Object.assign(
                    params,
                    extractSync(syncOrderForm.allSelectedOrderFormGoods)
                );
            }

            if (syncOrderForm) {
                var picked = pick(syncOrderForm, [
                    'type',
                    'isGroupBuy',
                    'groupBuyId',
                    'jobNo',
                    'exchangeCode',
                    'rechargeAccount',
                    'gameAccount',
                    'orderType',
                ]);

                Object.assign(params, picked);

                // 试用下单参数
                if (syncOrderForm.tryActivityOrderForm) {
                    Object.assign(
                        params,
                        pickAs(
                            syncOrderForm.tryActivityOrderForm, [
                                'tryType',
                                'tryGoodsId',
                                'tryActivityApplyId'
                            ], [
                                'tryActivityOrderForm.tryType',
                                'tryActivityOrderForm.tryGoodsId',
                                'tryActivityOrderForm.tryActivityApplyId'
                            ]
                        )
                    );
                }

                //拼多多拼团下单参数
                if (syncOrderForm.groupBuyActivityForm) {
                    Object.assign(
                        params,
                        pickAs(
                            syncOrderForm.groupBuyActivityForm, [
                                'groupBuyId',
                                'buyCount',
                                'groupBuyPrice',
                                'isGroupLeaderFree'
                            ], [
                                'groupBuyActivityForm.groupBuyId',
                                'groupBuyActivityForm.buyCount',
                                'groupBuyActivityForm.groupBuyPrice',
                                'groupBuyActivityForm.isGroupLeaderFree'
                            ]
                        )
                    );

                    if (
                        params['groupBuyActivityForm.isGroupLeaderFree']
                    ) {
                        params.bookSource = '1';
                    }
                }
            }

            state.params = params;
        },
        composeBookParams: function(state) {
            var syncData = state.syncData;
            // var syncOrderForm = syncData.orderForm || {};
            var orderForm = state.orderForm;
            var address = syncData.address;
            var from = syncData.from || '';
            var s = syncData.s || '';
            var extendData = syncData.extendData || {};

            var params = {
                from: from,
                s: s,
                extendData: extendData,
                bookSource: 0,
                orderType: orderForm.orderType
            };

            // 地址id
            if (address && address.id) {
                params['address.addressId'] = address.id;
            }

            // 商品信息
            if (orderForm.allSelectedOrderFormGoods) {
                Object.assign(
                    params,
                    extractAsync(orderForm.allSelectedOrderFormGoods)
                );
            }

            if (orderForm) {
                Object.assign(
                    params,
                    pickAs(
                        orderForm, [
                            'isGroupBuy',
                            'groupBuyId',
                            'confirmOrderSerialId',
                        ], [
                            'isGroupBuy',
                            'groupBuyId',
                            'lastConfirmOrderSerialId',
                        ]
                    )
                );

                // 试用下单参数
                if (orderForm.tryActivityOrderForm) {
                    Object.assign(
                        params,
                        pickAs(
                            orderForm.tryActivityOrderForm, [
                                'tryType',
                                'tryGoodsId',
                                'tryActivityApplyId'
                            ], [
                                'tryActivityOrderForm.tryType',
                                'tryActivityOrderForm.tryGoodsId',
                                'tryActivityOrderForm.tryActivityApplyId'
                            ]
                        )
                    );
                }

                //拼多多拼团商品新增加参数
                if (orderForm.groupBuyActivityForm) {
                    Object.assign(
                        params,
                        pickAs(
                            orderForm.groupBuyActivityForm, [
                                'groupBuyId',
                                'buyCount',
                                'groupBuyPrice',
                                'isGroupLeaderFree'
                            ], [
                                'groupBuyActivityForm.groupBuyId',
                                'groupBuyActivityForm.buyCount',
                                'groupBuyActivityForm.groupBuyPrice',
                                'groupBuyActivityForm.isGroupLeaderFree'
                            ]
                        )
                    );

                    // 如果是拼团订单中的团长免单情况，增加参数bookSource = 1
                    if (params['groupBuyActivityForm.isGroupLeaderFree']) {
                        // TODO: 这里该做什么？
                        params.bookSource = '1';
                    }
                }
            }
            var rechargeType = orderForm.rechargeType || state.rechargeType;
            var isGameOrder = rechargeType === CONSTANT.RECHARGE_TYPE_GAME;
            var isVideoOrder = rechargeType === CONSTANT.RECHARGE_TYPE_VIDEO;
            var isOilOrder = [RECHARGE_TYPE_ZSY, RECHARGE_TYPE_ZSH].indexOf(rechargeType) > -1;
            if (isGameOrder || isVideoOrder || isOilOrder) {
                Object.assign(params, {
                    rechargeAccount: state.game.rechargeAccount,
                    gameAccount: state.game.gameAccount
                });
                if (state.game.firstSelected) {
                    params.gameExtend1 = state.game.firstSelected.value;
                }
                if (state.game.secondSelected) {
                    params.gameExtend2 = state.game.secondSelected.value;
                }
            }
            [
                'rechargeAccount', 'gameAccount'
            ].forEach(function(prop) {
                if (!params[prop]) {
                    delete params[prop];
                }
            });

            var remarkMap = state.remarkMap;
            var merchantIdList = Object.keys(remarkMap);

            if (merchantIdList.length > 0) {
                var orderRemarkFormsParams = merchantIdList.reduce(function(prev, item, index) {
                    var temp = {};
                    temp['orderRemarkForms[' + index + '].merchantId'] = item;
                    temp['orderRemarkForms[' + index + '].remark'] = remarkMap[item];
                    return Object.assign(prev, temp);
                }, {});
                params = Object.assign({}, params, orderRemarkFormsParams);
            }

            state.bookParams = params;
        },
        initGameFields: function(state, payload) {

            var picked = pickAs(
                payload, ['psInfo', 'showView'], ['psInfo', 'showView']
            );
            var showView = payload.showView;
            var game = state.game;
            Object.assign(game, picked);
            game.isGame = isGameOrder(state);
            state.rechargeType = payload.rechargeType;
            if (payload.rechargeType === CONSTANT.RECHARGE_TYPE_APPSTORE) { // 卡密没有主账号字段
                return;
            }
            game.goodsId = payload.goodsId;
            game.chiefFieldName = showView.chiefFieldName;
            game.gameAccountName = showView.gameAccountName;
            game.firstSelections = showView.selectionList;
            var firstSelections = game.firstSelections;
            if (showView.secondSelectionName) {
                game.hasSecondSelection = true;
                var secondSelections = showView.selectionList[0].childSectionVOList;
                updateGameFields(state, firstSelections[0], secondSelections[0]);
            } else if (showView.firstSelectionName) {
                game.hasSecondSelection = false;
                updateGameFields(state, firstSelections[0]);
            }
            if (payload.rechargeType === CONSTANT.RECHARGE_TYPE_PHONE_GIFT) { // 感恩礼包
                var order = (window.__ || {
                    orderForm: {}
                }).orderForm;
                var phoneNo = (order || {
                    rechargeAccount: ''
                }).rechargeAccount;
                game.rechargeAccount = phoneNo;
            } else if (game.psInfo) {
                if (game.psInfo.chiefField) {
                    game.rechargeAccount = game.psInfo.chiefField;
                }
                if (game.psInfo.gameAccount) {
                    game.gameAccount = game.psInfo.gameAccount;
                }
            }
            game.ready = true;
        },
        initGameFieldsFromSyncData: function(state, data) {
            var game = state.game;
            game.isGame = isGameOrder(window.__);
            data.orderForm = data.orderForm || {};
            game.chiefAccountName = data.orderForm.rechargeAccount;
            game.gameAccountName = data.orderForm.gameAccount;
            var showList = window.__.showList || [];
            var syncOrderForm = window.__.orderForm;
            game.rechargeAccount = syncOrderForm.rechargeAccount;
            game.gameAccount = syncOrderForm.gameAccount;
            game.firstSelected = {
                value: window.__.gameExtend1
            };
            game.secondSelected = {
                value: window.__.gameExtend2
            };
            game.showList = showList;

            game.ready = true;
            game.goodsId = data.goodsId;
        },
        updateGameFields: function(state, selection) {
            var index = state.game.activeExtraSelectionIndex;
            var firstSelected, secondSelected;
            if (index === 0) {
                firstSelected = selection;
                if (state.game.hasSecondSelection) {
                    secondSelected = selection.childSectionVOList[0];
                }
            }
            if (index === 1) {
                firstSelected = state.game.firstSelected;
                secondSelected = selection;
            }

            updateGameFields(state, firstSelected, secondSelected);
        },
        updateActiveExtraSelectionIndex: function(state, value) {
            state.game.activeExtraSelectionIndex = value;
        },
        updateGameField: function(state, msg) {
            state.game[msg.fieldName] = msg.value;
            if (msg.fieldName === 'rechargeAccount') {
                state.game.firstAccountEditing = true;
            }
            if (!state.game.rechargeAccount) {
                state.game.secondAccounts = [];
                if (state.game.secondAccountSelective) {
                    state.game.gameAccount = '';
                }
            }
        },
        setSecondAccounts: function(state, secondAccounts) {
            state.game.secondAccounts = secondAccounts.map(function(account) {
                return {
                    value: account
                };
            });
            state.game.secondAccountSelective = true;
            if (secondAccounts.length) {
                state.game.gameAccount = secondAccounts[0];
                state.game.secondAccounts[0].active = true;
            } else {
                state.game.gameAccount = null;
            }
        },
        setSecondAccount: function(state, secondAccount) {
            state.game.gameAccount = secondAccount;
            state.game.fetchingSecondAccounts = false;
        },
        setFetchingSecondAccounts: function(state, value) {
            state.game.fetchingSecondAccounts = value;
            if (value) {
                state.game.firstAccountEditing = false;
            }
        },
        changeAntiCheatInfo: function(state, antiCheatInfo) {
            state.antiCheatInfo = antiCheatInfo;
        },
        changeBookCustomsBookSource: function(state, source) {
            state.bookCustomsBookSource = source;
        }
    }
};

function updateGameFields(state, firstSelected, secondSelected) {
    state.game.firstSelected = firstSelected;
    state.game.firstSelections.forEach(function(selection) {
        if (selection.value === state.game.firstSelected.value) {
            selection.active = true;
        } else {
            selection.active = false;
        }
    });
    if (!state.game.hasSecondSelection) {
        return;
    }
    var secondSelections = firstSelected.childSectionVOList;
    state.game.secondSelected = secondSelected;
    state.game.secondSelections = secondSelections;
    secondSelections.forEach(function(selection) {
        if (selection.value === state.game.secondSelected.value) {
            selection.active = true;
        } else {
            selection.active = false;
        }
    });
}

function isGameOrder(state) {
    return state.rechargeType === 2;
}