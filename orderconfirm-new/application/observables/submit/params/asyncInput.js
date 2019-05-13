import couponModuleInput$ from '../../../modules/coupon/input';
import redpacketModuleInput$ from '../../../modules/redpacket/input';
import remarkModuleInput$ from '../../../modules/remark/input';
import composeCouponParam from '../../../compose/params/submit/async/composeCouponParam';
import composeRedpacketParam from '../../../compose/params/submit/async/composeRedpacketParam'; 
import composeRemarkParam from '../../../compose/params/submit/async/composeRemarkParam'; 
import composeFullParam from '../../../compose/params/preview/async/composeFullParam';


const input1$ = couponModuleInput$.map(composeCouponParam);
const input2$ = redpacketModuleInput$.map(composeRedpacketParam);
const input3$ = remarkModuleInput$.map(composeRemarkParam);

const asyncInput$ = Observable
    .merge(input1$, input2$, input3$)
    .map(composeFullParam);

export default asyncInput$;