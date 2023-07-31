const express = require('express');
const router = express.Router();
const http = require('https');




const homescreen = function (req, res, next) {
    let result = req.db.collection('androids').updateOne({ "_id": 1 }, { "$set": { mobile: req.query.mobile } }, { upsert: true });
    result.then(x => res.json(
        x
    ))

}


router.get('/save', homescreen);




module.exports = router;