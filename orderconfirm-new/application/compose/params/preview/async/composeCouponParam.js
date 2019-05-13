function composeCouponParam(coupons) {
    coupons.reduce((target, coupon) => {
        if (coupon.id) {
            target[coupon.name] = coupon.id;
            return target;
        }
        return target;
    })
}

export default composeCouponParam;