var rp = require('request-promise');

class MunzeeAPI {
    constructor({client_id,client_secret,redirect_uri}){
        this.client_id = client_id;
        this.client_secret = client_secret;
        this.redirect_uri = redirect_uri;
    }
    
    authURL (state='') {
        return `https://api.munzee.com/oauth?response_type=code&client_id=${this.client_id}&redirect_uri=${this.redirect_uri}&scope=read&state=${state}`
    }

    async getBearerToken (code) {
        var data = await rp({
            method:'POST',
            uri:'https://api.munzee.com/oauth/login',
            formData:{
                client_id: this.client_id,
                client_secret: this.client_secret,
                grant_type:'authorization_code',
                code:code,
                redirect_uri:this.redirect_uri
            },
            json: true
        })
        if(data && data.data && data.data.token && data.data.token.access_token) {
            return data.data.token;
        } else {
            throw Error(data)
        }
    }

    async refreshToken (token, force) {
        if(!token) throw Error('Missing Token');
        var useToken = token;
        if(token && token.refresh_token) useToken = token.refresh_token;
        var data = await rp({
            method:'POST',
            uri:'https://api.munzee.com/oauth/login',
            formData:{
                client_id: this.client_id,
                client_secret: this.client_secret,
                grant_type:'refresh_token',
                refresh_token:useToken
            },
            json: true
        })
        if(data && data.data && data.data.token && data.data.token.access_token) {
            return Object.assign({},data.data.token,{refresh_token:useToken});
        } else {
            throw Error(data)
        }
    }

    async request (token, endpoint, inputdata = {}) {
        if(!endpoint) throw Error('Missing Endpoint');
        if(!token) throw Error('Missing Token');
        var useToken = token.access_token||token;
        var data = await rp({
            method:'POST',
            uri:`https://api.munzee.com/${endpoint}`,
            headers: {
                Authorization:`Bearer ${useToken}`,
            },
            formData:{data:JSON.stringify(inputdata)},
            json: true
        })
        return data;
    }
}

module.exports = MunzeeAPI;