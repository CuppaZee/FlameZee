const {Flame,cors,functions,send} = require('../../Utils');

module.exports = [
    functions.https.onRequest(async (req, res) => {
        var startTime = process.hrtime();
        return cors(req, res, async () => {
            if (!req.query.user_id) {
                return send(req,res,startTime,3,'user_id')
            }
            return send(req,res,startTime,1,(await Flame.Request('user/specials', { user_id: req.query.user_id })).data)
        })
    })
];