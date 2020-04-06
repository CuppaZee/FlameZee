const {Flame,cors,functions,send} = require('../Utils');

module.exports = [
    functions.https.onRequest(async (req, res) => {
        var startTime = process.hrtime();
        return cors(req, res, async () => {
            var endpoints = [];
            var y = ['news','app','schedule','whatsnew',null];
            for(var a in y) {
                for(var b in y) {
                    for(var c in y) {
                        endpoints.push(Flame.Request([a,b,c].filter(i=>i).join('/')));
                    }
                }
            }
            return send(req,res,startTime,1,(await Promise.all(endpoints)).map(i=>i.status_code))
        })
    })
];