
const validUrl = require('valid-url')
const shortId = require('shortid')
const urlModel = require('../models/urlModel')

const redis = require("redis");
const { promisify } = require("util");

//-------------Connect to redis-----------------------------------------------------------------------------------------------

const redisClient = redis.createClient(
    17703,
    "redis-17703.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("Ajx3VPvOW7bPfuBsEFEtzPXgP20MylAO", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});


//------------- Connection setup for redis----------------------------------------------------------------------------------------

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//------------ validations--------------------------------------------------------------------------------------------------------

const isValid = function (value) {
    if (typeof (value) == 'undefined' || typeof (value) == 'null') {
        return false
    }
    if (typeof (value) != 'string') {
        return false
    }
    if (typeof (value) == 'string' && value.trim().length == 0) {
        return false
    }
    return true
}

const queryparams = function (query) {
    if (Object.keys(query).length != 0) {
        return false
    }
    return true
}

const isvalidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0;
}

        // if (!longUrl.includes("//")) {
        //     return res.status(400).send({ status: false, message: "Invalid longUrl" });
        // }

        // if (!/(.com|.org|.co.in|.in|.co|.us)/.test(longUrl)) {
        //     return res.status(400).send({ status: false, message: "Invalid longUrl" });
        // }


//---------------- for create url------------------------------------------------------------------------------------------------------

const shortUrl = async function (req, res) {
    try {
        const requestBody = req.body
        const longUrl = req.body.longUrl

        //here isvalid mainly using for if type != 'string' then it give error

        if (!isvalidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "plz provide url details" })
        }

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: 'invalid long url' })
        }

        const baseUrl = 'http://localhost:3000'

        if (!validUrl.isUri(baseUrl)) {
            return res.status(400).send({ status: false, message: 'invalid base url' })
        }

        const urlCode = shortId.generate()
        // shortid is used to create short url unique ids

        if (validUrl.isUri(longUrl)) {

            let cachedUrl = await GET_ASYNC(`${longUrl}`);

            if(cachedUrl){
                return res.status(200).send({status: true, data: JSON.parse(cachedUrl)})
            }
            let url = await urlModel.findOne({ longUrl }).select({_id: 0, longUrl: 1, shortUrl: 1, urlCode: 1  });

            if (url) {

                await SET_ASYNC(`${longUrl}`, JSON.stringify( url ));

                res.status(200).send({ status: true, message: "short url already generated", data: url })
            } 
             else {
                const shortUrl = baseUrl + '/' + urlCode

               let newUrl = await urlModel.create({ longUrl,
                                                    shortUrl,
                                                    urlCode });

                await SET_ASYNC(`${longUrl}`, JSON.stringify(newUrl));

                let data = await urlModel.create(newUrl)
                return res.status(200).send({status: true, data : data})

            }
        } else {
            res.status(400).send({ status: false, message: 'invalid long url' })
        }
    }
    catch (error) {
        console.log(error)
        res.status(500).send({ status: false, message: error.message })

    }

}

//--------------- for get url----------------------------------------------------------------------------------------------------


const getUrl = async (req, res) => {
    try {
        const { urlCode } = req.params;

        if (!isValid(urlCode)) return res.status(400).send({ status: false, message: "Invalid Url" })

        let cahcedUrlData = await GET_ASYNC(`${urlCode}`)  

        if(cahcedUrlData){
            let data = JSON.parse(cahcedUrlData)
            return res.redirect(data.longUrl)
        }

        const result = await urlModel.findOne({ urlCode })
        if (!result) {
            return res.status(404).send({ status: false, message: "Url doesn't exist" });
        }

        await SET_ASYNC(`${urlCode}`, JSON.stringify(result))

        return res.redirect(result.longUrl)


    } catch (error) {
        return res.status(500).send({ status: true, msg: error.message })
    }
}

module.exports = { shortUrl, getUrl }