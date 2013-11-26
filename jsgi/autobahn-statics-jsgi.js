
var deep = require("deepjs/deep");
var	Static = require("pintura/jsgi/static").Static;
var AutobahnResponse = require("autobahn/autobahn-response");


var AutobahnStaticsJSGI = exports.AutobahnStaticsJSGI = function(stats, app){
//	console.log("AutobahnStaticsJSGI : init : statics : ", stats)
	var statics = require("pintura/jsgi/cascade").Cascade(stats)
	return function(request){
		return deep.when(statics(request)).then(function(response){
		//	console.log("AutobahnStaticsJSGI : ---------- response : ", response);
			if(!response || response.status >= 400)
			{
				if(app)
				{
					//console.log("autobahn.statics.jsgi : try next app ")
					return deep.when(app(request)).then(function (result) {
						//console.log("autobahn.statics.jsgi :  next app result  ", result)

						if(result instanceof AutobahnResponse)
							return result;
						var autobahnResponse = null;
						if(result)
							 autobahnResponse = new AutobahnResponse(result.status, result.headers, result.body);
						else
							 autobahnResponse = new AutobahnResponse(404, {}, result);
						return autobahnResponse;
					}, function (error) {
						return error;
					});
				}	
				if(response instanceof AutobahnResponse)
					return response;
				return new AutobahnResponse(404, {}, "error 404 (A.JSGI.statics)");
			}
			
			if(response instanceof AutobahnResponse)
				return response;
			return new AutobahnResponse(response.status || 200, response.headers || {}, response.body || response)
		
		});
	};
};
/*
var promiseModule = require("promised-io/promise");

AutobahnStaticsJSGI.getFile = function(path, type)
{
	//console.log("AutobahnStaticsJSGI : ", path)
	//var request = promiseModule.currentContext && promiseModule.currentContext.request;
	var req = {
		pathInfo:path,
		method:"GET",
		headers:{

		}
	}
	var def =  promise.Deferred();

	 when(statics(req)).then(function(response){
		//console.log("AutobahnStaticsJSGI : ---------- response : ", response);
		if(!response || response.status >= 400)
		{
				def.reject(response);
				return;
		}
		//console.log("WILL WAIT BODY : ", response.body.toString())
		var resolved = response.body.toString()
		//console.log("AutobahnStaticsJSGI : body resolved: ", resolved)
	
		var p = null;
		try{
			switch(type)
			{
				case "json": 
					p = JSON.parse(resolved);
					break;
				case "html" : 
					p = resolved;
					break;
				default : throw new Error("bad file type ("+type+") in AutobahnStaticsJSGI for path : ", path)
			}	
		}
		catch(e){
			p = null;
		}
		if(p)
			resolved = p; 
		
			
		//	console.log("createHTTPRequestParser : "+method+" -  after parsing/resolving : body ? ", resolved)
		response.body = resolved;
		def.resolve(response.body);
	});

return promise.promise(def);
}

*/
