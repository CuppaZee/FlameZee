const functions = require('firebase-functions');
const MunzeeAPI = require('./munzee');
const config = require('./config.json');
const API1 = new MunzeeAPI(config.Auth1);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.auth = functions.https.onRequest((req,res)=>{
    if(!req.query.code){
        return res.redirect(API1.authURL())
    }
    res.send('Working on this');
})