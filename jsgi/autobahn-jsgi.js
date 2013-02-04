
var when = require("deep/promise").when;
var autobahnController = require("autobahn/autobahn-controller");
var AutobahnJSGI = exports.AutobahnJSGI = function(app){
	return function(request){
		return when(autobahnController.analyseRequest(request)).then(function(response){
			//console.log("AutobahnJSGI : ---------- response : ", response);
			if(!response)
				if(app)
				{
					var res = app(request);	
					return res;
				}
				else
					return { headers:{}, status:404, body:["AutobahnJSGI 404"] }
			return response;
		});
	};
};
