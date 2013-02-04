
var deep = require("deep/deep");
var	Static = require("pintura/jsgi/static").Static;
var	promise = require("promised-io/promise");


var statics = require("pintura/jsgi/cascade").Cascade([

// cascade from static to pintura REST handling
	Static({cachePolicy:{js:0}, urls:["/common/js-lib/deep","/chloe2013/lib/deep"], root: "node_modules/deep", directoryListing: true}),
	//Static({cachePolicy:{js:0}, urls:["/common/js-lib/deep"], root: "node_modules/deep", directoryListing: true}),
	Static({urls:["/common/js-lib/compose"], root: "node_modules/compose", directoryListing: true}),
	Static({urls:["/common/js-lib/rql"], root: "node_modules/rql", directoryListing: true}),
	Static({urls:["/common/js-lib/promised-io"], root: "node_modules/promised-io", directoryListing: true}),
	Static({urls:["/js-custom"], root: "node_modules/smart-push", directoryListing: true}),
	//Static({urls:["/www"], root: "www", directoryListing: true, index:"index.html"}),			
	//Static({urls:["/chloe2013"], root: "www/chloe2013/", directoryListing: true, index:"index.html"}),			
	Static({urls:["/"], root: "www/app/", directoryListing: true, index:"index.html"}),			
	Static({urls:["/common"], root: "www/common/", directoryListing: true, index:"index.html"})
])

var AutobahnStaticsJSGI = exports.AutobahnStaticsJSGI = function(app){
	return function(request){
		return deep.when(statics(request)).then(function(response){
			//console.log("AutobahnJSGI : ---------- response : ", response);
			if(!response || response.status >= 400)
				if(app)
				{
					var def = deep.Deferred();
					deep.when(app(request)).then(function (result) {
						//console.log("autobahn jsgi : next app response : ", result)
						if(result && result.headers && result.headers.request)
							delete result.headers.request;
						def.resolve(result);
					}, function (error) {
						def.reject(error);
					});
					
					return deep.promise(def);
				}	
				else
					return { headers:{}, status:404, body:["error 404 (A.JSGI.statics)"]};
			//if(response.body instanceof Buffer)
			//	response.body = response.body.toString("utf8");
			return response;
		});
	};
};

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