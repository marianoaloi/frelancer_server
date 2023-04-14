const express = require('express');
const router = express.Router();


router.get("/projectBids", (req, res, next) => {

    const queryAggregate = [
        {
            '$match': {
                'project_id': parseInt(req.query.projectId),
                'sealed': false
            }
        }, {
            '$sort': {
                'amount': 1
            }
        }
    ];


    req.db.collection('bids').aggregate(
        queryAggregate, {
        allowDiskUse: true
    }).toArray().then(
        x => {

            res.json(x)
        }
    );
})

const getBids = (prj, req) => {

    let options = {
        method: 'GET',
        host: 'www.freelancer.com',


        path: `/api/projects/0.1/projects/${prj._id}/bids/?compact=true&limit={limit}&offset={offset}&user_details=true&user_avatar=true`,
        qs: { compact: true, full_description: true, job_details: true },

        //This is the only line that is new. `headers` is an object with the headers to request
        headers: header
    };

    http.get(options, (response) => {
        response.setEncoding('utf8');
        let str = ''
        response.on('data', (d) => {

            str += d
        });

        response.on('end', function () {

            let content = JSON.parse(str)
            req.db.collection("bids").updateOne({ _id: prj._id }, { $set: (content.status == 'error' ? { ignore: new Date() } : content.result) })
        });

    }).on('error', (e) => {
        console.error(e);
    });
}


module.exports = router;