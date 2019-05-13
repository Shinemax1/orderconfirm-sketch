
import { mapToCouponModel, mapToInvoiceModel, mapToRedPacketModel } from '../../../compose/models';

const subject = new Subject();

subject.subscribe(mapToCouponModel);
subject.subscribe(mapToRedPacketModel);

export default subject;