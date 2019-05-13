import mainPreview$ from './observables/preview/main';
import { initialInvoiceAjax$, triggerInvoice$ } from './observables/preview/invoice';
import submit$ from './observables/submit/main';

class App{
    constructor() {
        this.connect();
    }

    connect() {
        mainPreview$.connect();
        initialInvoiceAjax$.connect();
        triggerInvoice$.connect();
        submit$.connect();
    }
}

new App();