const {Flame,cors,functions,send} = require('../../Utils');

module.exports = [
    functions.https.onRequest(async (req, res) => {
        var startTime = process.hrtime();
        return cors(req, res, async () => {
            if (!req.query.query) {
                return send(req,res,startTime,3,'query')
            }
            return send(req,res,startTime,1,(await Flame.Request('user/find', { text: req.query.query })).data)
        })
    })
];