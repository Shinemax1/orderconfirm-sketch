import syncInput$ from './params/syncInput';
import asyncInput$ from './params/asyncInput';
import { fetchBookOrderAPI } from '../../apis';
import subject from './observers/observers';

// just like orderconfirm old ways
// has some issues
const main$ = Observable
    .zip(syncInput$, asyncInput$)
    .ajax(fetchBookOrderAPI)
    .multicast(new subject());


export default main$;