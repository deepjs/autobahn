/**
 * JSGI Middleware that catches JavaScript errors and converts them to responses
 * with appropriate HTTP status codes and messages
 */
 if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){
	 var deep = require("deep/deep");


	var ErrorHandler = function(nextApp){
		return function(request, autobahnResponse){
			//console.log("JSGI Errors : will call next app ")
			try{
				return deep.when(nextApp(request, autobahnResponse))
				.done(function(response){
					//console.log("JSGI Errors : direct response : ",response )
					if(response instanceof Error)
					{
						errorHandler(response);
					}
					return response;
				})
				.fail(errorHandler);
			}
			catch(e){
			//	console.log("JSGI ERRORS : catch ", e);

				return errorHandler(e);
			}
			finally{
			//	console.log("JSGI ERRORS : finaly ");

			}
			function errorHandler(e){
				//console.log("JSGI ERRORS : ", e);
				var response = {
					headers:{
						"content-type":"application/json"
					},
					body:[],
					status:500
				};

				if(e.status)
					response.status = e.status;

				if(e.message)
					response.body.push(JSON.stringify(e.message));
				else if(e.body)
					response.body.concat(e.body);
				else
					response.body.push(JSON.stringify(e));


				if(e.headers)
					deep.utils.up(e.headers, response.headers);
				
				return response;
			}
		};
	};
	return {ErrorHandler:ErrorHandler};
});