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

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.auth = functions.https.onRequest(async(req,res)=>{
    if(!req.query.code){
        return res.redirect(API1.authURL())
    }
    try {
        var {token,user_id} = await API1.getBearerToken(req.query.code)
        db.collection('authTokens').doc(user_id.toString()).set({token,user_id});
        var {data} = await API1.request(token,'user',{user_id});
        db.collection('users').doc(user_id.toString()).set({
            username:data.username,
            user_id:data.user_id,
            time: Date.now()
        })
        return res.send('Successfully Authenticated... Redirecting...<script>setTimeout(function(){window.location.replace("https://cuppazee.uk/")},2000)</script>');
    } catch (e) {
        return res.send('An Error Occured');
    }
})