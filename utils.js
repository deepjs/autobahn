/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function (require)
{
	var deep = require("deepjs");
	var utils = {
		setNoCacheHeaders : function (infos) {
	        deep.aup( {
	            'Pragma': 'no-cache',
	            'Cache-Control': 'no-store, no-cache, must-revalidate',
	        }, infos.response.headers);
	    },
		createBody : function  (request) {
				return request.body = function(){
					//console.log("create simple body");
					var def = deep.Deferred();
					var body = "";
					request.on('data', function(chunk) {
				      //	console.log("Received simple body data:");
				      	body += (chunk.toString());
				    });
				    request.on('end', function() {
				    	//console.log("simple body end")
				   

				    	request.body = deep.utils.parseBody(body, request.headers);
						def.resolve(request.body);
				    });
				    request.on('error', function(error) {
						// empty 200 OK response for now
						request.body = null;
						def.reject(error);
					});
				  return deep.when(def);
				}();
		},
		parseRange : function (request) {
			var rangeSum = request.autobahn.range = {};
			// handle the range header, TODO: maybe handle ranges with another piece of middleware
			// N.B. nomatter valid Range: is present, let's honor model.maxLimit, if any
			rangeSum.limit = Math.min(this.maxLimit||Infinity, this.defaultLimit||Infinity) || Infinity;
			rangeSum.maxCount = 0; // don't trigger totalCount evaluation unless a valid Range: is seen
			rangeSum.start = 0;
			rangeSum.end = Infinity;
			if (request.headers.range) 
			{
				// invalid "Range:" are ignored
				var range = request.headers.range.match(/^items=(\d+)-(\d+)?$/);
				if (range) 
				{
					rangeSum.start = +range[1] || 0;
					rangeSum.end = range[2];
					rangeSum.end = (rangeSum.end !== undefined) ? +rangeSum.end : Infinity;
					// compose the limit op
					if (rangeSum.end >= rangeSum.start) 
					{
						rangeSum.limit = Math.min(rangeSum.limit, rangeSum.end + 1 - rangeSum.start);
						// trigger totalCount evaluation
						rangeSum.maxCount = Infinity;
					}
				}
			}
			else
				delete request.autobahn.range;
			if (rangeSum.limit !== Infinity) 
				request.autobahn.queryString += "&limit(" + rangeSum.limit + "," + rangeSum.start + "," + rangeSum.maxCount + ")";
			//console.log("autobahn.utils : parserange : ", request.autobahn.range)
		},
		parseRequestInfos : function (request) 
		{
			request.autobahn = request.autobahn || {};

			request.autobahn.response = new AutobahnResponse(200, {}, "");
			request.pathInfo = request.autobahn.pathInfo = decodeURIComponent(request.pathInfo);
			//console.log("analyseRequest : ", request, this)
			request.autobahn.path = decodeURIComponent(request.pathInfo.substring(1));
			request.autobahn.method = request.method.toLowerCase();
			request.autobahn.scriptName = "";
			request.autobahn.url = request.url;

			request.autobahn.contentType = request.headers["content-type"] || request.headers["Content-Type"] || "application/json";
			request.autobahn.contentType = request.autobahn.contentType.split(";")[0];

			var slashIndex = request.autobahn.path.indexOf("/");
			if(slashIndex > -1)
			{
				request.autobahn.part = request.autobahn.path.substring(0, slashIndex);
				request.autobahn.path = request.autobahn.path.substring(slashIndex + 1);
				request.autobahn.scriptName += '/' + request.autobahn.part;
			}

			request.autobahn.queryString = request.queryString.replace(/\?.*/,'');
			if(request.autobahn.queryString.search(/^(null)/i)> -1)
				request.autobahn.queryString = request.autobahn.queryString.substring(4);
			request.autobahn.scheme = "http";
			request.autobahn.host =  request.headers.host ? request.headers.host.split(":")[0] : "";
			request.autobahn.port = request.headers.host ? (request.headers.host.split(":")[1] || 80) : 80;
			request.autobahn.remoteAddr = request.connection.remoteAddress;
			request.autobahn.version = [ request.httpVersionMajor, request.httpVersionMinor ];
			request.autobahn.requestHeaders = request.headers || {};
			//	console.log("Autobahn controller : analyseRequest  : ", JSON.stringify(infos));

			/*for(var i in request.headers)// for now just copy all of them, probably should do certain ones though
				request.autobahn.response.headers[i.toLowerCase()] = request.headers[i];
			delete request.autobahn.response.headers["user-agent"];
			delete request.autobahn.response.headers["content-type"];
			delete request.autobahn.response.headers["content-length"];*/
		}
	}
	return utils;
});
