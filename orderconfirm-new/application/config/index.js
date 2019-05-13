import { composeInvoiceModel } from '../compose/models/invoice';
import invoiceModule from '../../modules/invoice';

export default {
    modules: [
        {
            name: 'address',
            modelMapper: composeInvoiceModel,
            component: invoiceModule,
        }
    ],

    middlewares: {
        pre: [],
        post: [],
    }
}