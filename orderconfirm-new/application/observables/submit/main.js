import submitParam$ from './params';
import { addressMiddlewareUIEffect } from './middlewares/pre';
import { addressMiddlewareUIEffect } from './middlewares/post';
import { fetchBookOrderAPI } from '../../apis';
import subject from './observers/observers';

const main$ = submitParam$
    .applyMiddlewares(addressMiddlewareUIEffect)
    .ajax(fetchBookOrderAPI)
    .applyMiddlewares(addressMiddlewareUIEffect)
    .multicast(new subject());


export default main$;