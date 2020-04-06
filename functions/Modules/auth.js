const {crypto,Flame,db,cors,functions,config,firebase} = require('../Utils');
const needle = require('needle');

module.exports = [
    functions.https.onRequest(async (req, res) => {
        return cors(req, res, async () => {
            if (!req.query.code) {
                if (req.query.x !== undefined) {
                    return res.send(Flame.API.authURL(req.query.cryptoken || crypto.randomBytes(20).toString('hex')))
                }
                return res.redirect(Flame.API.authURL(req.query.cryptoken || crypto.randomBytes(20).toString('hex')))
            }
            try {
                if (!req.query.state) return res.send('Missing Cryptoken')
                var { token, user_id } = await Flame.API.getBearerToken(req.query.code)
                var cryptolist = [];
                var oldData = await db.collection('authToken').doc(user_id.toString()).get();
                if (oldData && oldData.data() && oldData.data().cryptokens) {
                    cryptolist = oldData.data().cryptokens;
                }
                cryptolist.push(req.query.state)
                db.collection('authToken').doc(user_id.toString()).set({
                    token,
                    user_id,
                    cryptokens: cryptolist
                });
                var { data } = await Flame.API.request(token, 'user', { user_id });
                db.collection('users').doc(user_id.toString()).set({
                    username: data.username,
                    user_id: data.user_id,
                    time: Date.now(),
                    doneCheck: req.query.state.slice(0, 5)
                });
                var discordmessage = '????';
                var count = (await db.collection('data').doc('counter').get()).data();
                if(cryptolist.length!==1){
                    discordmessage = `🔥 :repeat: ${data.username} | ${count.count} Users`
                } else {
                    discordmessage = `🔥 :new: ${data.username} | User #${count.count+1}`;
                    db.collection('data').doc('counter').update({
                        count: firebase.firestore.FieldValue.increment(1)
                    })
                }
                needle(
                    'post',
                    'https://discordapp.com/api/webhooks/695974439040581643/tH-e4vdXk04gCItHieXoxNBdtjoyXfOkEuW67JAJXYK-bmfNTDI01XSQTdi8-AhtmbCt',
                    {
                        content:discordmessage
                    }
                )
                return res.send(`Successfully Authenticated... Redirecting...<button onclick="window.location.replace('http://localhost:19006/authsuccess/${req.query.state}/${user_id}/${data.username}')">I'm running a local web build</button><script>setTimeout(function(){window.location.replace("https://paper.cuppazee.uk/authsuccess/${req.query.state}/${user_id}/${data.username}")},2000)</script>`);
            } catch (e) {
                console.error(e)
                return res.send('An Error Occured');
            }
        })
    })
];