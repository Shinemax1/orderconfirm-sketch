import syncInput$ from './params/syncInput';
import asyncInput$ from './params/asyncInput';
import { fetchPreviewOrderAPI } from '../../apis';
import subject from './observers/observers';

// just like orderconfirm old ways
// has some issues
const main$ = Observable
    .merge(syncInput$, asyncInput$)
    .ajax(fetchPreviewOrderAPI)
    .multicast(new subject());


export default main$;