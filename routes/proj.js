const express = require('express');
const router = express.Router();
const http = require('https');

const header = { 'freelancer-oauth-v1': process.env.free_pat }


const homescreen = function (req, res, next) {
  const queryAggregate = [
    {
      '$match': {
        'ignore': {
          '$exists': false
        },
        'status': {
          $ne: 'closed'
        }
      }
    }, {
      '$sort': {
        'time_updated': -1
      }
    }, {
      '$skip': 0
    }, {
      '$limit': 100
    }
  ];

  if (req.query.showIgnore) {
    delete queryAggregate[0].$match["ignore"]
  }
  if (!req.query.showFollow) {
    queryAggregate[0].$match["follow"] = { '$exists': false }
  }
  if (req.query.jobnameregex) {
    queryAggregate[0].$match["jobs.name"] = { $regex: req.query.jobnameregex, $options: 'i' };
  }
  if (req.query.minimum || req.query.maximum) {
    // queryAggregate[0].$match["budget.minimum"] = { '$gt': parseFloat(req.query.minimum) };
    queryAggregate.splice(1, 0,
      {
        "$lookup": {
          from: 'currencys',
          localField: 'currency.code',
          foreignField: 'code',
          as: 'result'
        }
      }
    )

    filters = []
    if (req.query.minimum) {
      filters.push(
        {
          "$gt": [
            { $multiply: ['$budget.minimum', { $first: '$result.exchange_rate' }] }
            ,
            parseFloat(req.query.minimum)
          ]
        }
      )
    }
    if (req.query.maximum) {
      filters.push(
        {
          "$lt": [
            { $multiply: ['$budget.maximum', { $first: '$result.exchange_rate' }] }
            ,
            parseFloat(req.query.maximum)
          ]
        }
      )
    }


    queryAggregate.splice(2, 0,
      {
        '$match': {
          "$expr": {
            "$and": filters
          },
        }
      }
    )
  }
  if (req.query.titleregex) {
    queryAggregate[0].$match["title"] = { $regex: req.query.titleregex, $options: 'i' };
  }

  //"jobs.name":{$regex:'java' , $options:'i'}


  req.db.collection('projects').aggregate(
    queryAggregate, {
    allowDiskUse: true
  }).toArray().then(
    x => {

      res.json(x)
    }
  );
}
const homescreenPost = function (req, res, next) {

  Object.entries(req.body).forEach(x => req.query[x[0]] = x[1])

  homescreen(req, res, next);

}




/* GET home page. */
router.get('/get', homescreen);
router.post('/get', homescreenPost);

router.put("/ignore", (req, res, next) => {
  prj = req.body;
  if (Array.isArray(prj)) {
    res.json(req.db.collection('projects').updateMany({ _id: { $in: prj.map(x => x._id) } }, { "$set": { ignore: new Date() } }))
  }
  else if (prj?._id) {
    res.json(req.db.collection('projects').updateOne({ _id: prj._id }, { "$set": { ignore: new Date() } }))
  }
})

router.get("/follow", (req, res, next) => {
  const queryAggregate = [
    {
      '$match': {
        'follow': {
          '$exists': true
        },
        'ignore': {
          '$exists': false
        },
        'status': {
          $ne: 'closed'
        }
      }
    }, {
      '$sort': {
        'time_updated': -1
      }
    }
  ];


  req.db.collection('projects').aggregate(
    queryAggregate, {
    allowDiskUse: true
  }).toArray().then(
    x => {

      res.json(x)
    }
  );
})

router.put("/follow", (req, res, next) => {

  prj = req.body;
  if (prj?._id) {
    res.json(req.db.collection('projects').updateOne({ _id: prj._id }, { "$set": { follow: new Date() } }))
  }
})


router.post("/save", (req, res, next) => {

  prj = req.body;
  if (prj?._id) {
    res.json(req.db.collection('projects').updateOne({ _id: prj._id }, { "$set": prj }))
  }
})

router.post("/sendBid", (req, res, next) => {

  bid = req.body;
  if (bid?.project_id) {
    let intHeader = {
      ...header
    }
    intHeader["Content-Type"] = "application/json"
    let options = {
      method: 'POST',
      host: 'www.freelancer.com',


      path: `/api/projects/0.1/bids/`,

      //This is the only line that is new. `headers` is an object with the headers to request
      headers: intHeader
    };
    var reqInternal = http.request(options, (response) => {
      response.setEncoding('utf8');
      let str = ''
      response.on('data', (d) => {

        str += d
      });

      response.on('end', function () {

        let content = JSON.parse(str)
        res.json(content)
      });
    })
    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });
    reqInternal.write(JSON.stringify(bid));

    reqInternal.end();
  }
})

router.put("/projectRefresh", (req, res, next) => {
  prj = req.body;
  if (prj?.id) {
    getBids(prj, req)
    let options = {
      method: 'GET',
      host: 'www.freelancer.com',


      path: `/api/projects/0.1/projects/${prj.id}?compact=true&full_description=true&job_details=true`,
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
        req.db.collection("projects").updateOne({ _id: prj.id }, { $set: (content.status == 'error' ? { ignore: new Date() } : content.result) })
        res.json(content)
      });

    }).on('error', (e) => {
      console.error(e);
      res.json({ 'error': "The project die" })
    });
  } else {
    res.json({ 'error': "We need the Project ID" })
  }
})


const getBids = (prj, req) => {

  let options = {
    method: 'GET',
    host: 'www.freelancer.com',


    path: `/api/projects/0.1/projects/${prj.id}/bids/?compact=true&limit={limit}&offset={offset}&user_details=true&user_avatar=true`,
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
      content.result.bids.forEach(b => {
        b["_id"] = b["id"]
        req.db.collection("bids").updateOne({ _id: b.id }, { $set: (content.result) })
      })

    });

  }).on('error', (e) => {
    console.error(e);
  });
}

module.exports = router;