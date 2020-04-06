const {Flame,cors,functions,send} = require('../../Utils');

module.exports = [
    functions.https.onRequest(async (req, res) => {
        var startTime = process.hrtime();
        return cors(req, res, async () => {
            if (!req.query.username) {
                return send(req,res,startTime,3,'username')
            }
            if (!req.query.munzee) {
                return send(req,res,startTime,3,'munzee')
            }
            var data = await Flame.Request('munzee', { url: `/m/${req.query.username}/${req.query.munzee}` });
            return send(req,res,startTime,1,data.data.bouncers||[])
        })
    })
]