const registeredUrl = "/forwardRequestForAuthenticatedClient";

module.exports = function(server){
    server.post(registeredUrl, require("./../../utils/middlewares/index").requestBodyJSONMiddleware);

    server.post(registeredUrl, function(req, res, next){
        let url = req.body.url;

        if(!url){
            res.statusCode = 400;
            return res.end();
        }

        let body = req.body.body || "";
        let options = req.body.options || {method: "POST"};

        let http = require("http");
        if(url.startsWith("https://")){
            http = require("https");
        }

        console.log(`Forwarding request ${options.method} to url ${url}`);

        let request = http.request(url, options, (response)=>{
            res.statusCode = response.statusCode;
            if(res.statusCode > 300){
                res.end();
            }
            response.on("data", res.write);
            res.on('end', res.end);
        });

        request.on("error", (err)=>{
            res.statusCode = 500;
            res.end();
        });

        request.write(body);
        request.end();
    });
}