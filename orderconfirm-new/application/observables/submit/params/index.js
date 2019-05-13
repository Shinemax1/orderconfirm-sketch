import submitBtnClick$ from '../../../../modules/submit/input/submitBtnClick';
import composeSubmitParamSyncParam from '../../../compose/params/submit/sync';
import couponModuleInput$ from '../../../../modules/coupon/input';
import redpacketModuleInput$ from '../../../../modules/redpacket/input';
import remarkModuleInput$ from '../../../../modules/remark/input';
import composeCouponParam from '../../../compose/params/submit/async/composeCouponParam';
import composeRedpacketParam from '../../../compose/params/submit/async/composeRedpacketParam'; 
import composeRemarkParam from '../../../compose/params/submit/async/composeRemarkParam'; 
import composeFullParam from '../../../compose/params/submit/async/composeFullParam';

// 同步数据 -> 下单请求参数
const syncInput$ = Observable
    .from(submitBtnClick$)
    .map(() => window.syncData)
    .map(composeSubmitParamSyncParam); // 映射成请求参数
const input1$ = couponModuleInput$.map(composeCouponParam);
const input2$ = redpacketModuleInput$.map(composeRedpacketParam);
const input3$ = remarkModuleInput$.map(composeRemarkParam);

const fullSubmitParam$ = Observable.zip(syncInput$, input1$, input2$, input3$, composeFullParam);

export default fullSubmitParam$;