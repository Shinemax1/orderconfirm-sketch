function composeFullParam([asyncParam, syncParam]) {
    return Object.assign({}, syncParam, asyncParam);
}

export default composeFullParam;