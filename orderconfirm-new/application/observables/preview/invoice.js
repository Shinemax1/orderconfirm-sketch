import syncInput$ from './params/syncInput';
import asyncInput$ from './params/asyncInput';
import { invoiceModuleInput$ } from '../../../modules/invoice/input'
import { fetchPreviewOrderAPI } from '../../apis';
import { composeInvoiceModel, changeInvoiceAddress } from '../../compose/models/invoice';

const initialInvoiceAjax$ = syncInput$
    .ajax(fetchPreviewOrderAPI)
    .map(composeInvoiceModel)
    .take(1);

const triggerInvoice$ = asyncInput$
    .ajax(fetchPreviewOrderAPI)
    .map(changeInvoiceAddress)
    .takeUtil(invoiceModuleInput$);

export { initialInvoiceAjax$, triggerInvoice$ };
