/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
// 首次进页面经过的流程触发一级action 2个 级联触发action 总计48
// dispatch action总计代码行数: 1041  (2001)
// lines: 21
dispatch('saveSync');
    // lines: 19
    commit('order/saveSync', picked);

// lines: 324
dispatch('refresh');

    // lines: 90
    // 获取用户交互后的currentCoupons,addressId,useRedPacket,useVipDiscount,selectableTimelinessParam
    // bookCustomsBookSource,relatedBuyVipParam,useDiscountList
    dispatch('compose');
        // lines: 94
        // 从同步数据取from,couponId,s,extendData,addressId,基础商品,促销赠品,保险等商品
        // type,isGroupBuy,groupBuyId,jobNo,exchangeCode,rechargeAccount,gameAccount,orderType,
        // tryType,tryGoodsId,tryActivityApplyId,
        // groupBuyId,buyCount,groupBuyPrice,isGroupLeaderFree,
        commit('order/composeFromSync');
    dispatch('compose')
        .then(uselessResolveParamFunc)
        .then(resolveRefreshAPI)
        .then(formatAjaxJson);
        // 设置selectableTimelinessParam,depositId,gorderId
        function uselessResolveParamFunc(){
            // so many logics
        }
        // 发送预览下单请求
        function resolveRefreshAPI() {
            // send preview api ajax
        }
        // 总计包含36个action
        // callback逻辑主要处理三件事情: 设置模块（组件）数据, 拦截弹窗, 路由变化
        function formatAjaxJson() {
            commit('order/updateLogisticsTaxAmount', logisticsTaxAmount);
            commit('app/hideDistributeLoading');
            commit('app/loaded');

            commit('invoice/setInvoiceInfo', invoiceInfo);
            commit('redPacket/update', orderRedPacket);

            dispatch('getGameFieldsFromSyncData', orderForm.allSelectedOrderFormGoods[0].goodsId);
            dispatch('getGameFields', orderForm.allSelectedOrderFormGoods[0].goodsId);
            dispatch('changeSelectedAddress', { selectedAddress, addressOptionalList });
            commit('account/updateAccount', params.rechargeAccount);
            commit('account/updateUsername',params.gameAccount);
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

            // 设置拦截数据
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

            // 两次出现
            commit(
                'goodsintercept/update',
                checkLimitRegionList
            );

            commit('order/updateIncludeHighPostageGoods', includeHighPostageGoods);
            commit('order/updateOrderFormPostageDetail', orderFormPostageDetail);

            // 代码里搜索不到用在哪里
            commit('order/needCheckCode');
            // 代码里搜索不到用在哪里
            commit('order/noCheckCode');

            dispatch('editCurrentInvalidAddress');
            commit('geo/unmatch');
            commit('geo/update', picked);
            // 两年前的代码 geograph参数根本没有用到
            dispatch('showAddGeoAddress', geograph);
            commit('geo/match');
            commit('address/new');
            commit('view/address');
            commit('view/main');
            dispatch('back');
            dispatch('updateTimelinessParam', {
                logisticsTimelinessType: 0,
                logisticsCompanyId: 0,
                logisticsAmount: 0
            });
            dispatch('changeLogisticsInfoModal', false);
            // 乱套了 code 200的逻辑里包含这些代码
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
            dispatch('refresh');
        }


        // 更新留言项 action/updateRemark
        function updateRemark(ctx, remark) {
            var commit = ctx.commit;
            commit('order/updateRemark', remark);
        }

// http://axure.yixin.im/view?id=2673&pid=96#wap%E6%8F%90%E4%BA%A4%E8%AE%A2%E5%8D%95%E9%A1%B5 逻辑缺失