/**
 * @author gilles.coomans@gmail.com
 *
 * 
 * refactoring : 
 *
 *   we need :
 *   	- a first plugin (deep-facets) that add .roles in deep chain and manage roles through deep.roles and deep.stores/facets
 *   		+ facet model
 *   		
 *   	- a second plugin (deep-ui) that gives .route(...), views, app, binder 
 *
 *   	- a third plugin (autobahn) that give a nodejs driver that provides
 *   		- jsgi stack with session, or index management, or...
 *   		- an .analyse function that gives a request descriptor
 *   			which  give an unique function 'run' that gives a deep chain based on stores/facet/routes 
 *   			and that returns an AutobahnResponse
 *   		- a bunch of nodejs related stores/driver (as mongo, fs, sql, ...)
 *   		- add statics and routes management in roles
 *
 * 		- + deep-jquery : 
 * 			that gives ajax/jquery stores + dom.appendTo familly stores + .deeplink
 * 			
 * 
 * 	http.createServer(function (request, res) 
 * 	{
 * 		deep
 * 		.analyse(request)
 * 		.run()
 * 		.done(function (response) {
 * 			res.write(...)
 * 		})
 * 	})
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){
	var util = require('util');
	var http = require('http');
	var deep = require("deepjs/deep");
	autobahn = require("./autobahn");
	var AutobahnResponse = require("./autobahn-response");
	var Facet = require("./facet-controller").Permissive;
	var UploadFacet = require("./uploader-facet");
	var UploadHandler = UploadFacet.UploadHandler;

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
			request.autobahn = { nodeResponse:res };
			
			deep(request)
			.catchError(true)
			.done(function () {
				//console.log("manage body")
				//autobahn.utils.parseRequestInfos(request);
				var contentType = request.headers["content-type"] || request.headers["Content-Type"] || "application/json";
				var isForm = (contentType.indexOf("multipart/form-data") !== -1);
				if(Facet.accessors[method] && Facet.accessors[method].hasBody )
					if(!isForm)
					{
						//console.log("manage simple body")
						autobahn.utils.createBody(request);
					}
						
					else
					{
						//console.log("create upload body")
						request.autobahn.uploadHandler = new UploadHandler(request, 
						{
					            tmpDir: settings.rootPath + '/tmpfiles',
					            publicDir: settings.rootPath + '/files/profile',
					            uploadDir: settings.rootPath + '/www/files/profile',
					            uploadUrl: '/files/',
					            maxPostSize: 21000000, // 11 GB
					            minFileSize: 1,
					            maxFileSize: 20000000, // 10 GB
					            acceptFileTypes: /\.(gif|jpe?g|png)$/i,
					            // Files not matched by this regular expression force a download dialog,
					            // to prevent executing any scripts in the context of the service domain:
					            safeFileTypes: /\.(gif|jpe?g|png)$/i,
					            imageTypes: /\.(gif|jpe?g|png)$/i,
					            imageVersions: {
					                'thumbnail': {
					                    width: 80,
					                    height: 80
					                }
					            },
					            accessControl: {
					                allowOrigin: '*',
					                allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE'
					            },
					            /* Uncomment and edit this section to provide the service via HTTPS:
					            ssl: {
					                key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
					                cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
					            },
					            */
					            nodeStatic: {
					                cache: 3600 // seconds to cache served files
					            }
					        
						});
						request.body = request.autobahn.uploadHandler[request.method.toLowerCase()]()
					}	
			})
			.exec(function () {
				// console.log("launch jsgi")
				return jsgiStack.jsgi(request, res);
			})
			.done(function (response) 
			{
				if(response.shift)
					response = response.shift();
				// console.log("Response from jsgi stack : ", response)
				if(typeof response === 'undefined' || response == null)
				{
		 			res.writeHead(404, {'Content-Type': 'text/html'});
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
