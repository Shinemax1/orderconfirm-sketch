/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
// 执行下单动作 dispatch action 1个 级联触发action 总计40+
// dispatch action总计代码行数（仅计算action中代码）: 1000+
// lines: 27
dispatch('submit');

    // lines: 300 
    // 预付定金协议拦截 isAgreeDeposit 字段从OrderSummery组件中获取
    dispatch('preSubmitCheck');
        // 验证地址 此action需要细细品味
        dispatch('showAddGeoAddress');
        // 非预付定金付全款，收货人手机号6万超限下单拦截生效,这个优先级最高，8由前端自行定义
        dispatch('toEditAddress', { title: '收货人手机号已超年度限额', msg: '根据海关相关政策，该收货人手机号已超过年度消费限制额度，可能会导致清关失败，请修改收货人手机号', confirmText: '修改收货人信息' });
        // 地址库升级
        dispatch('editInvalidAddress', address);
        // 商品拦截 JIRA#KJDS-29848 见交互稿
        dispatch('/**商品拦截 JIRA#KJDS-29848 见交互稿*/');
            // if errType 4 赠品不足拦截 可能触发 dispatch('preSubmitCheck')
            // todo
            // if errType 51 奶粉/纸尿裤限购
            // todo
            // else
            commit('goodsintercept/show');
        // 提醒赠品缺货 可能触发 dispatch('preSubmitCheck')
        dispatch('showGiftShortageDialog')
        // 预付定金协议拦截
        commit('order/updateDepositAgree', true);

        // 大量虚拟商品拦截 本次重构不涉及
    // lines: 532
    dispatch('doSubmit', extraParams);
        // lines: 28
        // 从同步数据取from,couponId,s,extendData,addressId,基础商品,促销赠品,保险等商品
        // type,isGroupBuy,groupBuyId,jobNo,exchangeCode,rechargeAccount,gameAccount,orderType,
        // tryType,tryGoodsId,tryActivityApplyId,
        // groupBuyId,buyCount,groupBuyPrice,isGroupLeaderFree,
        // 获取remarkMap 评论数据 从组件中获取（用户交互带来的）
        commit('order/composeBookParams');

        // 获取发票数据
        getInvoiceParamsByState(ctx.state.invoice);

        // 如果用户选择"先去支付"，让后端跳过实名认证
        // 线上从来没出现过 和地址组件关联 难以查清啥情况
        if (isRealNameAuthPostponed) {
            bookParams = Object.assign({}, bookParams, {
                createOrderWithoutAuth: true
            });
        }
        
        // 更新优惠券
        // ctx.state.coupon.current

        // 更新地址信息
        // addressId = ctx.state.address.id;

        // 额外的参数
        // bookParams = Object.assign({}, bookParams, extraParams);

        // 是否是 团长免单
        
        // 预付定金增加代付请求参数
        // ctx.state.order.bookCustomsBookSource

        // 会员折扣
        // ctx.state.vip.isUseVip
        
        // 关联购卡参数
        // ctx.state.vip

        // 一次参数设置
        Object.assign(params, formdatafy({
            editableExtendData: {
                // ctx.state.redPacket.isUseRedPacket 红包数据
                useRedPacket: useRedPacket,
                // 自选物流数据
                selectableTimelinessParam: ctx.state.order.selectableTimelinessParam,
                // 是否亲友代购数据
                bookCustomsBookSource: ctx.state.order.bookCustomsBookSource,
                // 关联购卡参数设置
                relatedBuyVipParam: relatedBuyVipParam,
                useDiscountList,
                // 太复杂 稍后再研究
                extendPreviewData: typeof extendPreviewData === 'undefined' ?
                        void 0 :
                        (typeof extendPreviewData === 'string' ?
                            extendPreviewData :
                            JSON.stringify(extendPreviewData))
            }
          }),{
            useVipDiscount: 1,
          }
        );

        // 付定金订单参数
        var depositPreOrderParams = Object.assign({
            depositId: depositId
        }, bookParams);

        // 付全款订单参数
        var depositFullOrderParams = Object.assign({
            gorderId: gorderId,
        }, bookParams);

        // 发送下单ajax请求（若是话费礼包订单打开app收银台）
        var pay = resolveSubmitAPI();
        
        // 下单回调
        pay.then(bookOrderCallback);
            function bookOrderCallback(json) {
                const { code, msg } = json
                if (code === 200) {
                    commit('order/submit');

                    // 如果0元下单且bookSource='1'，直接跳支付成功
                    if (bookParams.bookSource === 1) {
                        location.href = '/order/pay_success.html?gorderId=' + json.body.gorderId;
                        return;
                    }

                    // 如果是代付下单
                    if (ctx.state.order.bookCustomsBookSource === 1) {
                        location.href = '/order/honeypay.html?gorderId=' + json.body.gorderId;
                        return;
                    }

                    // 其他情况走后端返回url
                    location.replace(json.body.payUrl, '_self');
                } else {
                    // code -250 -251 带自定义行动点弹窗（自选物流拦截弹窗） 触发dispatch('updateTimelinessParam')
                    
                    // code -123 路由跳转（未绑定手机号跳转//m.kaola.com/personal/redirectBind.html）
                    
                    // code  -177 简单弹窗（此地址无法享受黑卡权益）

                    // code 461 路由跳转（登录拦截）

                    // code -6311 前端路由跳转 收货人手机号6万超限下单拦截
                    /**
                     * dispatch(
                        'toEditAddress',
                        {
                            title: '收货人手机号已超年度限额',
                            msg: '根据海关相关政策，该收货人手机号已超过年度消费限制额度，可能会导致清关失败，请修改收货人手机号',
                            confirmText: '修改收货人信息'
                        }
                    );
                     */

                    // code -600 复杂逻辑 实名认证 -> 超限弹窗 -> 后续触发

                    // code -130 简单弹窗（个人物品清关超过仓库的限购数量）

                    // code -666 简单弹窗（帮砍价 部分商品信息已变更）

                    // code -999 简单弹窗（帮砍价 本次砍价倒计时已结束）

                    // code -258 自定义内容/行动点弹窗（二次秒杀拦截）

                    // code -168 -169 -170 自定义行动点弹窗（地址拦截）

                    // code -259 自定义行动点弹窗（0元支付，被后端拦截，需要弹窗再次提交订单）

                    // code -171 -245 自定义内容/行动点弹窗（商品拦截）

                    // code -129 前端路由 （因系统地址信息升级，所选的收货地址已失效，请修改地址后再下单）
                    // code -620 前端路由 （请输入收货人手机号后重新提交订单）
                    // code -623 前端路由 （收货人姓名不符合规范）
                    // code -621 前端路由 （根据海关要求，购买本订单商品：收货人姓名不能含阿拉伯数字，请修改后重新提交订单）

                    // code -2011 复杂逻辑 2w超限拦截

                    // code -690 -803 自定义行动点弹窗（会员状态变更弹窗）

                    // code else 简单弹窗

                }
            }