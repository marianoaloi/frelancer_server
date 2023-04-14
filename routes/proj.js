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
  if (prj?._id) {
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