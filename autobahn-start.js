if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){
	var util = require('util');
	var http = require('http');
	var deep = require("deep/deep");
	autobahn = require("autobahn/autobahn");
	var AutobahnResponse = require("autobahn/autobahn-response");
	var Facet = require("autobahn/Facet-controller");

	var start = function(settings, jsgiStack)
	{
		http.createServer(function(request, res) 
		{
			var url = request.url;
			var questionIndex = url.indexOf("?");
			if(questionIndex > -1)
			{
				request.pathInfo = url.substring(0, questionIndex);
				request.queryString = url.substring(questionIndex + 1);
			}
			else
			{
				request.pathInfo = url;
				request.queryString = "";
			}

			var method = String(request.method).toLowerCase();
			deep.context = { request:request };
			
			deep(request)
			.catchError()
			.done(function () {
				//autobahn.utils.parseRequestInfos(request);
				if(Facet.accessors[method] && Facet.accessors[method].hasBody)
					autobahn.utils.createBody(request);
			})
			.exec(function () {
				// console.log("launch jsgi")
				return jsgiStack.jsgi(request, res);
			})
			.done(function (response) 
			{
				if(response.shift)
					response = response.shift();
				//console.log("Response from jsgi stack : ", response)
				if(typeof response === 'undefined' || response == null)
				{
		 			res.writeHead(404, {'content-type': 'text/html'});
		 			res.end("nothing returned. bye!");
		 			return;
				}

				// headers
				var headers = {};
				if(response instanceof AutobahnResponse || (response.headers && response.status))
					deep.utils.up(response.headers, headers);
		  		res.writeHead(response.status, headers);
				//console.log("end of headers")

		  		// body
				var body = response.body || response;
				if(!(body instanceof Array) && body.forEach)
				{
					body.forEach(function(b){
						//console.log("for Each iteration : ", b)
						res.write(b);
					});
					res.end("\n");
				}
				else if(typeof body !== 'string' && !(body instanceof Buffer))
					res.end(JSON.stringify(body));
				else
					res.end(body);
			})
			.fail(function (error) 
			{
				console.log("server error : ", error);
				error = error || "Internal Server Error";
				res.writeHead(error.status || 500, error.headers || {'content-type': 'text/html'});
		 		res.write(JSON.stringify(error.body || error));
		 		res.end("<br/>bye!");
			});

		}).listen(settings.port);

		//_______________________________

		console.log('Listening on port : ' + settings.port);
		console.log('process pid : ' + process.pid);
		console.log('processor architecture : ' + process.arch);
		console.log('platform : ' + process.platform);
		console.log("memory usage : ", util.inspect(process.memoryUsage()));
		console.log('Versions : ' , process.versions);


	}

	return start;

});
