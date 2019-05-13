function composeFullParam(...args) {
    let fullSubmitParam = {};
    args.forEach((param) => {
        Object.assign(fullSubmitParam, param);
    })
    return fullSubmitParam;
}

export default composeFullParam;