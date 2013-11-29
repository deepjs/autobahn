
var deep = require("deepjs/deep");
var AutobahnResponse = require("autobahn/autobahn-response");
var errors = require("autobahn/errors");
var LocalisationJSGI = exports.LocalisationJSGI = function(app){
	//console.log("creation of autobahn jsgi : ", autobahnController);

	return function (request) {
		//console.log("LocalisationJSGI request", request);
		if(request.pathInfo.match(/(localisation)$/gi))
		{
			request.headers["accept-language"]
			return deep.get("json::"+ request.pathInfo + "/")
		}
		return app(request);
	}

	return function(request){
		return deep.when(autobahnController.analyseRequest(request))
		.done(function(response){
			//console.log("LocalisationJSGI : ---------- response : ", response);
			if(!response)
				if(app)
				{
					var res = app(request);
					return res;
				}
				else
					return new errors.Server("LocalisationJSGI", 404);
			return response;
		});
	};
};
