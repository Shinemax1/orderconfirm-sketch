import syncInput$ from './syncInput';
import couponModuleInput$ from '../../../modules/coupon/input';
import redpacketModuleInput$ from '../../../modules/redpacket/input';
import composeCouponParam from '../../../compose/params/preview/async/composeCouponParam';
import composeRedpacketParam from '../../../compose/params/preview/async/composeRedpacketParam'; 
import composeFullParam from '../../../compose/params/preview/async/composeFullParam'; 


const input1$ = couponModuleInput$.map(composeCouponParam);
const input2$ = redpacketModuleInput$.map(composeRedpacketParam);

const asyncInput$ = Observable
    .merge(input1$, input2$)
    .withLatestFrom(syncInput$)
    .map(composeFullParam);

export default asyncInput$;