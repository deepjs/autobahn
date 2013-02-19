
var deep = require("deep/deep");
var AutobahnResponse = require("autobahn/autobahn-response");
var AutobahnJSGI = exports.AutobahnJSGI = function(autobahnController, app){
	//console.log("creation of autobahn jsgi : ", autobahnController);
	return function(request){
		return deep.when(autobahnController.analyseRequest(request))
		.done(function(response){
			//console.log("AutobahnJSGI : ---------- response : ", response);
			if(!response)
				if(app)
				{
					var res = app(request);	
					return res;
				}
				else
					return new AutobahnResponse(404,{}, "AutobahnJSGI 404");
			return response;
		});
	};
};
