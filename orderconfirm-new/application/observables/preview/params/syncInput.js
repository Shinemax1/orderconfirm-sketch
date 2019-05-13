
import composePreviewSyncParam from '../../../compose/params/preview/sync';

// 首次下单页数据请求
const syncInput$ = Observable
    .of(window.syncData) // 数据来源（模板同步数据）
    .map(composePreviewSyncParam); // 映射成请求参数
    
export default syncInput$;



