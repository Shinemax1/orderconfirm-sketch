
function bookOrderSuccessCallback(json) {
    if (json.bookSource === 1) {
        setTimeout(function() {
            location.href = `/order/pay_success.html?gorderId=${json.body.gorderId}`;
        }, 500);
    } else if (json.bookCustomsBookSource === 1) {
        location.href = `/order/honeypay.html?gorderId=${json.body.gorderId}`;
    } else {
        location.replace(json.body.payUrl, '_self');
    }
}
const subject = new Subject();
subject.subscribe(bookOrderSuccessCallback);

export default subject;