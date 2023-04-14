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

router.get('/ping', (req, res, next) => {
    res.json({ status: 'sucess' })
})

module.exports = router;