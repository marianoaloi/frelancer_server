const express = require('express');
const router = express.Router();
const http = require('https');

const header = { 'freelancer-oauth-v1': process.env.free_pat }



router.get('/get', (req, res, next) => {
    var options = {
        'method': 'GET',
        'host': 'www.freelancer.com',


        'path': '/api/projects/0.1/currencies/',
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
            res.json(content)

        });

    }).on('error', (e) => {
        console.error(e);
        res.json({ 'error': JSON.stringify(e) })
    });
})

router.get('/biggerjobs', (req, res, next) => {
    const queryAggregate = [
        {
            '$project': {
                'jobs': 1,
                '_id': 0,
                'ignore': {
                    '$cond': [
                        {
                            '$gt': [
                                '$ignore', true
                            ]
                        }, 1, 0
                    ]
                },
                'follow': {
                    '$cond': [
                        {
                            '$gt': [
                                '$follow', true
                            ]
                        }, 1, 0
                    ]
                }
            }
        }, {
            '$unwind': {
                'path': '$jobs'
            }
        }, {
            '$group': {
                '_id': '$jobs.name',
                'count': {
                    '$sum': 1
                },
                'ignore': {
                    '$sum': '$ignore'
                },
                'follow': {
                    '$sum': '$follow'
                }
            }
        }, {
            '$sort': {
                'count': -1
            }
        }, {
            '$limit': 20
        }
    ]

    if (req.query.modify) {
        if (req.query.modify === 'ignore')
            queryAggregate[3]["$sort"] = { ignore: 1, count: -1 }
        else

            queryAggregate[3]["$sort"] = { follow: -1, count: -1 }
    }

    req.db.collection('projects').aggregate(
        queryAggregate, {
        allowDiskUse: true
    }).toArray().then(
        x => {

            res.json(x)
        }
    );
})

router.get('/bymoney', (req, res, next) => {
    queryAggregate = [
        {
            '$lookup': {
                'from': 'currencys',
                'localField': 'currency.code',
                'foreignField': 'code',
                'as': 'result'
            }
        }, {
            '$unwind': {
                'path': '$jobs'
            }
        }, {
            '$project': {
                '_id': 0,
                'job': '$jobs.name',
                'dolarValue': {
                    '$multiply': [
                        '$budget.maximum', {
                            '$first': '$result.exchange_rate'
                        }
                    ]
                },
                'ignore': {
                    '$cond': [
                        {
                            '$gt': [
                                '$ignore', true
                            ]
                        }, 1, 0
                    ]
                },
                'follow': {
                    '$cond': [
                        {
                            '$gt': [
                                '$follow', true
                            ]
                        }, 1, 0
                    ]
                }
            }
        }, {
            '$match': {
                'dolarValue': {
                    '$lt': 100000
                }
            }
        }, {
            '$group': {
                '_id': '$job',
                'media': {
                    '$avg': '$dolarValue'
                },
                'max': {
                    '$max': '$dolarValue'
                },
                'min': {
                    '$min': '$dolarValue'
                },
                'count': {
                    '$sum': 1
                },
                'ignore': {
                    '$sum': '$ignore'
                },
                'follow': {
                    '$sum': '$follow'
                }
            }
        }, {
            '$match': {
                '$expr': {
                    '$gt': [
                        '$count', '$ignore'
                    ]
                }
            }
        }, {
            '$sort': {
                'media': -1
            }
        }, {
            '$limit': 50
        }
    ]

    if (req.query.clean) {
        queryAggregate[3]['$match']['ignore'] = 0
    }

    req.db.collection('projects').aggregate(
        queryAggregate, {
        allowDiskUse: true
    }).toArray().then(
        x => {

            res.json(x)
        }
    );
})

router.get('/ping', (req, res, next) => {
    res.json({ status: 'sucess' })
})

module.exports = router;