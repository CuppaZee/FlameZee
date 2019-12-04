const admin = require('firebase-admin');
const functions = require('firebase-functions');
const MunzeeAPI = require('./munzee');
const config = require('./config.json');
const API1 = new MunzeeAPI(config.Auth1);
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
const cors = require('cors')({
    origin: true,
});
const crypto = require("crypto");

exports.generateCryptokens = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        return res.send(crypto.randomBytes(20).toString('hex'))
    })
})

exports.auth = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.code) {
            return res.redirect(API1.authURL(req.query.cryptoken))
        }
        try {
            if (!req.query.state) return res.send('Missing Cryptoken')
            var { token, user_id } = await API1.getBearerToken(req.query.code)
            db.collection('authTokens').doc(user_id.toString()).set({ token, user_id });
            db.collection('authCryptokens').doc(req.query.state).set({ token, user_id });
            var { data } = await API1.request(token, 'user', { user_id });
            db.collection('users').doc(user_id.toString()).set({
                username: data.username,
                user_id: data.user_id,
                time: Date.now(),
                doneCheck: req.query.state.slice(0, 5)
            });
            return res.send('Successfully Authenticated... Redirecting...<script>setTimeout(function(){window.location.replace("https://cuppazee.uk/")},2000)</script>');
        } catch (e) {
            return res.send('An Error Occured');
        }
    })
})

async function request(page, inputdata = {}, user_id = config.default_user_id, cryptoken) {
    try {
        var token;
        if (!cryptoken) {
            token = (await db.collection('authTokens').doc(user_id.toString()).get()).data().token;
        } else {
            token = (await db.collection('authCryptokens').doc(user_id.toString()).get()).data().token;
        }
        return await API1.request(token, page, inputdata);
    } catch (e) {
        return { data: null }
    }
}

exports["user_credits"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.cryptoken) {
            return res.status(502).send('Missing Cryptoken')
        }
        return res.send(await request('user/credits', null, req.query.cryptoken, true))
    })
})

exports["user_inventory"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.cryptoken) {
            return res.status(502).send('Missing Cryptoken')
        }
        var [credits,history,boosters] = (await Promise.all([
            request('user/credits', null, req.query.cryptoken, true),
            request('user/credits/history', null, req.query.cryptoken, true),
            request('user/boosters/credits', null, req.query.cryptoken, true)
        ])).map(i=>i.data);
        var undeployed = [];
        for (var page = 0; page < 10; page++) {
            let und = (await request('user/undeploys', { page }, req.query.cryptoken, true)).data;
            if (!und.has_more) {
                page = 10;
            }
            undeployed = undeployed.concat(und.munzees);
        }
        undeployed = Object.entries(undeployed.map(i => i.pin_icon.match(/\/([^./]+).png/)[1]).reduce(function (obj, item) {
            obj[item] = (obj[item] || 0) + 1;
            return obj;
        }, {})).map(i => ({ type: i[0], amount: i[1] }));
        res.status(200).send({ credits, undeployed, boosters, history });
    })
})