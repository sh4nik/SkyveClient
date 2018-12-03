/*
 * Javascript client to interact with Skyve services
 * (for more info on Skyve visit https://skyve.org)
 * 
 */

let _axios;

let SkyveClient = {

    init: (axiosInstance) => {
        _axios = axiosInstance;
    },

    login: (customer, username, password) => {
        return _axios.post('/logout').then(() => { // reset session

            return _axios.post('/login', { username: customer + '/' + username, password }, {
                transformRequest: [transformRequestParams]
            }).then(checkLoginSuccess);

        });
    },

    logout: () => {
        return _axios.post('/logout');
    },

    create: (module, doc, bean) => {
        return pre(module, doc).then(res => smartEdit(module, doc, 'add', bean, res));
    },

    read: (module, docOrQuery, params) => {
        const _params = {
            _operationType: 'fetch',
            _dataSource: module + '_' + docOrQuery,
            ...params
        };
        return _axios.get('/smartlist', {
            params: _params
        }).then(processResponse);
    },

    update: (module, doc, bean) => {
        return pre(module, doc, bean.bizId).then(res => smartEdit(module, doc, 'update', bean, res));
    },

    delete: (module, doc, bizId) => {
        const _params = {
            _operationType: 'remove',
            _dataSource: module + '_' + doc,
            bizId: bizId
        };
        return _axios.get('/smartlist', {
            params: _params
        }).then(processResponse);
    }

}

function transformRequestParams(data) {
    const serializedData = []
    for (const k in data) {
        if (data[k]) {
            serializedData.push(`${k}=${encodeURIComponent(data[k])}`)
        }
    }
    return serializedData.join('&')
}

function checkLoginSuccess(res) {
    if (!res.headers['set-cookie']) {
        throw { authenticated: false };
    }
    return { authenticated: true, cookie: res.headers['set-cookie'][0] };
}

function processResponse(res) {
    // Skyve's smart service servlet filter returns login page if unauthorized
    if (res.headers['content-type'] === 'text/html;charset=UTF-8') {
        res.status = 401;
        throw { ...res };
    }

    // This hack is not required in the latest version of Skyve since quotes have now been added
    eval('res.data = new Object(' + res.data.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9]+)(['"])?:/g, '$1"$3":') + ')');

    return res.data.response;
}

function pre(module, doc, bizId) {
    const _params = {
        _operationType: 'fetch',
        _mod: module,
        _doc: doc,
        _ecnt: 0,
        _ccnt: 0
    };
    if (bizId) {
        _params.bizId = bizId;
    }
    return _axios.get('/smartedit', {
        params: _params
    }).then(processResponse);
}

function smartEdit(module, doc, operationType, bean, preResponse) {
    const _params = {
        bizId: preResponse.data[0].bizId,
        _operationType: operationType,
        _mod: module,
        _doc: doc,
        bean: { ...bean, bizId: preResponse.data[0].bizId },
        _ecnt: 0,
        _ccnt: 0,
        _c: preResponse.data[0]._c,
        _a: 'OK'
    };
    return _axios.get('/smartedit', {
        params: _params
    }).then(processResponse);
}

export default SkyveClient;
