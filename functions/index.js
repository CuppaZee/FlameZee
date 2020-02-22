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
            if(req.query.x!==undefined) {
                return res.send(API1.authURL(req.query.cryptoken||crypto.randomBytes(20).toString('hex')))
            }
            return res.redirect(API1.authURL(req.query.cryptoken||crypto.randomBytes(20).toString('hex')))
        }
        try {
            if (!req.query.state) return res.send('Missing Cryptoken')
            var { token, user_id } = await API1.getBearerToken(req.query.code)
            var cryptolist = [];
            var oldData = await db.collection('authToken').doc(user_id.toString()).get();
            if(oldData && oldData.data() && oldData.data().cryptokens) {
                cryptolist = oldData.data().cryptokens;
            }
            cryptolist.push(req.query.state)
            db.collection('authToken').doc(user_id.toString()).set({
                token,
                user_id,
                cryptokens: cryptolist
            });
            var { data } = await API1.request(token, 'user', { user_id });
            db.collection('users').doc(user_id.toString()).set({
                username: data.username,
                user_id: data.user_id,
                time: Date.now(),
                doneCheck: req.query.state.slice(0, 5)
            });
            return res.send(`Successfully Authenticated... Redirecting...<script>setTimeout(function(){window.location.replace("https://cuppazee.uk/authsuccess/${req.query.state}/${user_id}/${data.username}")},2000)</script>`);
        } catch (e) {
            return res.send('An Error Occured');
        }
    })
})

async function request(page, inputdata = {}, user_id = config.default_user_id, cryptoken) {
    try {
        var token, document;
        if (!cryptoken) {
            document = await db.collection('authToken').doc(user_id.toString()).get()
            token = document.data().token;
        } else {
            document = (await db.collection('authToken').where('cryptokens','array-contains',user_id.toString()).limit(1).get()).docs[0]
            token = document.data().token;
        }
        if(token.expires >= Date.now()-60000){
            token = await API1.refreshToken(token);
            await document.update({token:token});
        }
        return await API1.request(token, page, inputdata);
    } catch (e) {
        console.log(e)
        return { data: null }
    }
}

exports["user_details"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.user_id) {
            return res.status(502).send('Missing User ID')
        }
        return res.send(await request('user', {user_id:req.query.user_id}))
    })
})

exports["user_search"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.query) {
            return res.status(502).send('Missing Query')
        }
        return res.send(await request('user/find', {text:req.query.query}))
    })
})

exports["user_activity"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.user_id) {
            return res.status(502).send('Missing User ID')
        }
        return res.send(await request('statzee/player/day', {day:req.query.day||'2019-12-04'}, req.query.user_id))
    })
})

exports["user_badges"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.user_id) {
            return res.status(502).send('Missing User ID')
        }
        return res.send(await request('user/badges', {user_id:req.query.user_id}))
    })
})

exports["user_specials"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.user_id) {
            return res.status(502).send('Missing User ID')
        }
        return res.send(await request('user/specials', {user_id:req.query.user_id}))
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

exports["munzee_specials_overview"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        var data = await request('munzee/specials', {})
        let output = data.data.reduce((a,b)=>{
            a[b.logo] = (a[b.logo]||0)+1;
            return a;
        },{});
        if(req.query.v===undefined) {
            return res.send({types:output,type:req.query.type,list:data.data.filter(i=>i.logo===req.query.t)})
        } else {
            return res.send(`<div style="text-align:center;">${Object.keys(output).map(i=>`<a href="${req.originalUrl.includes('munzee/specials')?'/munzee/specials/overview':'/munzee_specials_overview'}?v&t=${encodeURIComponent(i)}"><div style="display:inline-block;padding:8px;font-size:20px;font-weight:bold;"><img style="height:50px;width:50px;" src="${i}"/><br>${output[i]}</div>`).join('')}</div>${data.data.filter(i=>i.logo===req.query.t).map(i=>`<div><a href="${i.full_url}">${i.friendly_name}</a></div>`).join('')}`)
        }
    })
})

exports["munzee_bouncers_overview"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        var body = await Promise.all([
            request('munzee/specials', {}),
            request('munzee/specials/mythological', {}),
            request('munzee/specials/pouchcreatures', {}),
            request('munzee/specials/retired', {}),
            request('munzee/specials/flat', {}),
            request('munzee/specials/bouncers', {})
        ])
        var data = {
            data: [].concat(...body.map(i=>i.data))
        }
        let output = data.data.reduce((a,b)=>{
            a[(b.mythological_munzee?b.mythological_munzee.munzee_logo:b.logo)] = (a[(b.mythological_munzee?b.mythological_munzee.munzee_logo:b.logo)]||0)+1;
            return a;
        },{});
        if(req.query.v===undefined) {
            return res.send({types:output,type:req.query.type,list:data.data.filter(i=>(i.mythological_munzee?i.mythological_munzee.munzee_logo:i.logo)===req.query.t)})
        } else {
            return res.send(`<div style="text-align:center;">${Object.keys(output).map(i=>`<a href="${req.originalUrl.includes('munzee/specials')?'/munzee/bouncers/overview':'/munzee_bouncers_overview'}?v&t=${encodeURIComponent(i)}"><div style="display:inline-block;padding:8px;font-size:20px;font-weight:bold;"><img style="height:50px;width:50px;" src="${i}"/><br>${output[i]}</div>`).join('')}</div>${data.data.filter(i=>(i.mythological_munzee?i.mythological_munzee.munzee_logo:i.logo)===req.query.t).map(i=>`<div>${i.mythological_munzee?`<a href="${i.mythological_munzee.code}">${i.mythological_munzee.friendly_name}</a> by <a href="https://www.munzee.com/m/${i.mythological_munzee.creator_username}">${i.mythological_munzee.creator_username}</a> at `:''}<a href="${i.full_url}">${i.friendly_name}</a></div>`).join('')}`)
        }
    })
})

exports["munzee_treehouse_bouncers"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        if (!req.query.user) {
            return res.status(502).send('Missing Username')
        }
        if (!req.query.munzee) {
            return res.status(502).send('Missing Munzee')
        }
        var data = await request('munzee', {url:`/m/${req.query.user}/${req.query.munzee}`});
        if(data.data.pin_icon.includes('treehouse')) {
            return res.send(data.data.bouncers||[]);
        } else {
            return res.send([]);
        }
    })
})

exports["clan_requirements"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        return res.send({
            requirements: await request('clan/v2/requirements', {game_id:82,clan_id:1349}),
            rewards: await request('clan/v2/challenges/82')
        })
    })
})

exports["clan_details"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        return res.send({
            requirements: await request('clan/v2/requirements', {game_id:82,clan_id:req.query.clan_id}),
            details: await request('clan/v2', {clan_id:req.query.clan_id})
        })
    })
})

exports["cuppazee_credits"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        return res.send({})
    })
})

// Hack to Find Event Endpoint (Failed)
exports["find_calendar"] = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async function () {
        var arr = [];
        var x = ["calendar","event","events","nearby","v4",""];

        for(var a of x) {
            for(var b of x) {
                for(var c of x) {
                    arr.push([a,b,c].filter(i=>i).join('/'));
                }  
            } 
        }
        console.log(arr.join('\n'))
        var q = Array.from(new Set(arr)).map(i=>request(i));
        var data = await Promise.all(q);
        return res.send(data)
    })
})