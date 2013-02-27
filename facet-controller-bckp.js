	//facets-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>

refactoring : 

each method need to be wrapped in a RessourceAcccessor

GetAccessor :
	restrictToOwner:false
	schema:{}
	headers:{}
	filterProperties
	


autobahn.utils.parseRange = function (request, infos) {
	request.headers["content-range"]
}

autobahn.utils.parseRequestInfos = function (request, infos) {
	request.headers["content-range"]
}





Permissive = {
	backgrounds:[Facet],
	accessors:{
		get:{
			handler:autobahn.accessors.get()
		},
		put:Accessor.put(),
		post:Accessor.post(),
		del:Accessor.del(),
		patch:Accessor.patch()
	}
}

Restrictive = {
	backgrounds:[Facet],
	accessors:{
		get:autobahn.accessors.forbidden(),
		put:Accessor.forbidden(),
		post:Accessor.forbidden(),
		del:Accessor.forbidden(),
		patch:Accessor.forbidden()
	}
}


 */

if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){
	var deep = require("deep/deep");
	var errors = require("autobahn/errors");
	var AutobahnResponse = require("autobahn/autobahn-response");

//console.log("------Content-Type = ", contentType);
var createBody = function  (request) {
	return request.body = function(){
		var def = deep.Deferred();
		var body = "";
		request.on('data', function(chunk) {
	      	//console.log("Received body data:");
	      	body += chunk.toString();
	    });
	    request.on('end', function() {
	    	if(!body)
	    	{
	    		request.body = {};
	    	}
	    	else
		      // empty 200 OK response for now
		      switch(request.autobahn.contentType)
		      {
		      	case "application/json" : 
		      		request.body = JSON.parse(body);
		      		break;	
		      	case "application/javascript" : 
		      		request.body = JSON.parse(body);
		      		break;	
		      	default :
		      		request.body = body;
		      }
			def.resolve(request.body);
	    });
	    request.on('error', function(error) {
			// empty 200 OK response for now
			request.body = null;
			def.reject(error);
		});
	  return deep.promise(def);
	}()
}
	
function removeProps(obj, path)
{
	if(path[0] == "/")
		path = path.substring(1);
	deep.utils.deletePropertyByPath(obj, path, "/");
}
var filterPrivatesProperties = function(obj, schema){
	if(!obj)
		return;
	schema = schema;
	if(obj.forEach)
		obj.forEach(function(o)
		{
			//console.log("_____________________ ", o , deep.query)
			var privates = deep.query(o, ".//?_schema.private=true", { resultType:"full", schema:schema });
			//console.log("privates : ", privates)
			privates.forEach(function(p)
			{
				removeProps(o, p.path);
			})
		})
	else
	{
		var privates = deep.query(obj, ".//?_schema.private=true", { resultType:"full", schema:schema });
		//console.log("privates : ", privates)
		privates.forEach(function(p)
		{
			removeProps(obj, p.path);
		}); 
	}
	return obj;
}

var aroundChain = deep.compose.around(function (old) {
	// body...
})


var fct = {
	accessors:{
		get:{
			handlers:Accessors.get().
		}
	}
}

var Accessors  = {
	get : function(id, options)
	{
		//console.log("facets-controller : get : ", id, this.schemas);

		var accessors = this.facet.accessors;
		var schema = this.facet.schema;
		if(id == "schema" || id == "schema.get")
			return (accessors.get && accessors.get.schema)?accessors.get.schema:schema;
		else if(id == "schema.put")
			return (accessors.put && accessors.put.schema)?accessors.put.schema:schema;
		else if(id == "schema.post")
			return (accessors.post && accessors.post.schema)?accessors.post.schema:schema;
		else if(id == "schema.query")
			return (accessors.query && accessors.query.schema)?accessors.query.schema:schema;
		else if(id == "schema.patch")
			return (accessors.patch && accessors.patch.schema)?accessors.patch.schema:schema;
		else if(id == "schema.delete")
			return (accessors["delete"] && accessors["delete"].schema)?accessors["delete"].schema:schema;

		if(!this.facet.store)
			throw new errors.Access(this.name + " don't have store to get something");

		var othis = this;
		return deep.when(this.facet.store.get(id, options))
		.done(function(obj){
			if(typeof obj === 'undefined' || obj == null)
				return new errors.NotFound("facet return nothing");
			if(obj.status && obj.status >= 400)
				return obj;
			if(typeof othis.restrictToOwner === 'function' && !othis.restrictToOwner(obj, othis.schema || schema, options))
				throw new errors.Unauthorized("you're not the owner of this ressource.");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when getting on store. "+JSON.stringify(error));
		}); 
	},
	post : function(object, options)
	{
		if(!this.facet.store)
			throw new errors.Access(this.name + " don't have store to post something");
		//console.log("facets-controller : post : ", object, options);
		if(typeof this.restrictToOwner === 'function' && !this.restrictToOwner(obj, this.schema || this.facet.schema, options))
			throw new errors.Unauthorized("you're not the owner of this ressource.");

		return deep.when(this.facet.store.post(object, options))
		.done(function(obj){
			//console.log("facet-controller : after store post  : response ", obj)
			if(typeof obj === 'undefined' || obj == null)
				return new errors.Access("post return nothing");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when posting on store. "+JSON.stringify(error));
		}); 
	},
	query : function(query, options){
		//console.log("FacetController QUERY : options = ", options);
		if(!this.facet.store)
			throw new errors.Access(this.name + " don't have store to query something");
		return deep.when(this.facet.store.query(query, options))
		.done(function(obj){
			if(!obj)
				return [];
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when query on store. "+JSON.stringify(error));
		}); 
	},
	put : function(object, options){ 
		var othis = this;
		//console.log("FACET put : object.id ", object.id, " - id : ", options.id)

		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::put : problem, ids in object and url dont correspond");

		if(!this.facet.store)
			throw new errors.Access(this.name + " don't have store to put something");

		return deep.when(this.facet.store.put(object, options))
		.done( function(obj){
			if(!obj)
				throw new errors.Access("put return nothing");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when putting on store. "+JSON.stringify(error));
		}); 
	},
	patch : function(object, options){ 
		var othis = this;
		//console.log("FACET patch : object.id ", object.id, " - id : ", options.id)
		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::patch : problem, ids in object and url dont correspond");

		var id = object.id || options.id;
		if(!this.facet.store)
			throw new errors.Access(this.name + " don't have store to put something");

	 	return	deep.when( this.facet.store.get(id, options) )
		.done( function (success) {
			//console.log(" PATCH GET old obect done = ", success);
			deep.utils.up(object, success);
			delete updatedObject.getMetadata;
			//console.log(" PATCH updatedObject = ", updatedObject)
			return deep.when(othis.facet.store.put(success, options))
			.done(function(obj){
				if(!obj)
					throw new errors.Access("patch return nothing");
				return obj;
			});
		})
		.fail( function (error) {
			if(error instanceof Error)
				throw error;
			throw new errors.Access("FacetController::patch : no object found with this id");
		})
	},
	"delete" : function(object, options){ // handle puts to add to history and define attribution
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to delete something");
		return deep.when(this.store["delete"](object, options))
		.done(function(obj){
			if(!obj)
				throw new errors.Access("delete return nothing");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("delete return error : "+JSON.stringify(error));
		});
	}
}

var Permissive = {
	headers:{
		"Content-Type":"application/javascript;charset=utf-8"
	},
	schema:{
		
	},
	accessors:{
		get:{
			facet:null,
			handler:Accessors.get
		},
		query:{
			facet:null,
			handler:Accessors.query
		},
		"delete":{
			facet:null,
			handler:Accessors["delete"]
		},
		post:{
			hasBody:true,
			facet:null,
			setCustomHeaders:function (response, request) {
				request.autobahn.response.headers["Content-Location"] = request.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			},
			handler:Accessors.post
		},
		put:{
			hasBody:true,
			facet:null,
			handler:Accessors.put,
			setCustomHeaders:function (response, request) {
				request.autobahn.response.headers["Content-Location"] = request.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			}
		},
		patch:{
			hasBody:true,
			facet:null,
			handler:Accessors.patch,
			schema:{
				backgrounds:["#../../../schema"]
			},
			setCustomHeaders:function (response, request) {
				request.autobahn.response.headers["Content-Location"] = request.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			}
		}
	},
	rpc:{
		
	},
	getId : function(instance){
		return instance[this.mainId || "id"];
	},
	init : function(request, infos)
	{
		console.log("facet-controller.init()")
		deep(this.accessors.patch.schema).replace("//required", false);
	},
	rpcCall:function (request) 
	{
		var self = this;
		return deep.all(this.accessors.get.handler(request.autobahn.path, request.autobahn), createBody(request))
		.done(function (results) {
			var obj = results[0];
			var body = results[1];
			if(body == "")
				body = {};
			if(typeof body === "string")
				body = JSON.parse(body);
			var toCall = self.rpc[body.method];
			if(!toCall)
				return errors.MethodNotAllowed();
			return deep.when(toCall.apply(obj, body.params))
			.done(function  (result) {
				return {
					id:body.id,
					error:null,
					result:result
				}
			})
			.fail(function (error) {
				return {
					id:body.id,
					error:error,
					result:null
				}
			})
		})
		.done(function  (result) {
			deep.utils.up(self.headers || {}, request.autobahn.response.headers);
			return result;
		});
	},
	analyse:function (request) 
	{
		var infos = request.autobahn,
			self = this;

		if(infos.method == "post" && request.headers["Content-Type"] == "application/json-rpc")
			return this.rpcCall(request);

		var accessor = this.accessors[infos.method];

		// QUERY case :
		var isQuery = false;
		if(infos.method === "get" && (!infos.path || infos.path.charAt(infos.path.length-1) == '/'))
		{
			isQuery = true;
			accessor = this.accessors.query;
			autobahn.utils.parseRange(request);
		}	

		if(!accessor)
			throw new errors.MethodNotAllowed();

		var result = null;

		if(accessor.hasBody)
			result = deep.when(createBody(request))
			.done(function (body) 
			{
				var report = deep.validate(body, accessor.schema || self.schema || {});
				if(report.valid)
					return accessor.handler(body, request.autobahn);
				return errors.PreconditionFailed(report);
			});
		else if(isQuery)
		{
			result = deep.when(accessor.handler(body, request.autobahn))
			.done(function (result) 
			{
				if(infos.range)
					return result && deep.when(result.totalCount)
					.done(function(count){
						delete result.totalCount;
						var end = infos.range.start + (result.length || 0) - 1;
						infos.response.headers["Content-Range"] = "items " + infos.range.start + '-' + end + '/' + (count || '*');
						infos.response.status = (infos.range.start === 0 && count -1 === end) ? 200 : 206;
						return result;
					});
				return result;
			});
		}
		else
			result = deep.when(accessor.handler(body, request.autobahn));

		return deep.when(result)
		.done(function (result) {
			if(!isQuery)
				filterPrivatesProperties(result, accessor.schema || self.schema || {});
			else result && result.forEach(function (r) {
				filterPrivatesProperties(r, accessor.schema || self.schema || {});
			});
			deep.utils.up(accessor.headers || self.headers || {}, infos.response.headers);
			if(accessor.setCustomHeaders)
				accessor.setCustomHeaders(result, request);
			return infos.response;
		});
	},
	store:{
	
	}
}



	var FacetController = function(){}
	FacetController.prototype = {

		schemas : {
			get:{
				hasBody:false
			},
			query:{
				hasBody:false
			},
			post:{
				hasBody:true
			},
			put:{
				hasBody:true
			},
			patch:{
				hasBody:true
			},
			"delete":{
				hasBody:false
			}
		},
		headers:{
			"accept-ranges":"items"
		},
		ownerID:function (instance) {
			return instance.ownerID;
		},
		filterProperties : function(obj, schema){
			if(!obj)
				return;
			schema = schema || this.schema;
			if(obj.forEach)
				obj.forEach(function(o)
				{
					//console.log("_____________________ ", o , deep.query)
					var privates = deep.query(o, ".//?_schema.private=true", { resultType:"full", schema:schema });
					//console.log("privates : ", privates)
					privates.forEach(function(p)
					{
						removeProps(o, p.path);
					})
				})
			else
			{
				var privates = deep.query(obj, ".//?_schema.private=true", { resultType:"full", schema:schema });
				//console.log("privates : ", privates)
				privates.forEach(function(p)
				{
					removeProps(obj, p.path);
				}); 
			}
			return obj;
		}
	}

	FacetController.prototype.parseRange = function(request, infos)
	{

	}

	FacetController.prototype.init = function(request, infos)
	{
		console.log("facet-controller.init()")
		deep(this.schemas.patch).replace("//required", false);
	}

	FacetController.prototype.analyse = function(request, infos)
	{
		try{
			if(!this.schemas[infos.method])
				throw new errors.MethodNotAllowed("method ("+infos.method+") don't allowed in model");
	
			if(!this[infos.method])
				throw new errors.MethodNotAllowed("method ("+infos.method+") not founded in model");
			
			console.log("facet : this.schemas : ", this.schemas[infos.method])
			var othis = this;
			var responseValue = null;

			var method = infos.method;
			var path = infos.path;
			var scriptName = infos.scriptName;
			var status = 200;
			deep.utils.up(this.headers, infos.responseHeaders);
			infos.id = decodeURIComponent(infos.path);

			console.log("FACET ANALYSE : path : ", path, " - scriptName : ", scriptName, " - method : ", method, " - query : ", request.queryString);


			if(!this.schemas[infos.method].hasBody)
			{
				var queryString = request.queryString.replace(/\?.*/,'');
				// handle the range header, TODO: maybe handle ranges with another piece of middleware
				// N.B. nomatter valid Range: is present, let's honor model.maxLimit, if any
				var limit = Math.min(this.maxLimit||Infinity, this.defaultLimit||Infinity) || Infinity;
				var maxCount = 0; // don't trigger totalCount evaluation unless a valid Range: is seen
				var start = 0;
				var end = Infinity;
				if (infos.responseHeaders.range) {
					// invalid "Range:" are ignored
					var range = infos.responseHeaders.range.match(/^items=(\d+)-(\d+)?$/);
					if (range) {
						start = +range[1] || 0;
						end = range[2];
						end = (end !== undefined) ? +end : Infinity;
						// compose the limit op
						if (end >= start) {
							limit = Math.min(limit, end + 1 - start);
							// trigger totalCount evaluation
							maxCount = Infinity;
						}
					}
				}
				if (limit !== Infinity) 
					queryString += "&limit(" + limit + "," + start + "," + maxCount + ")";
				if(queryString.search(/^(null)/i)>-1)
					queryString = queryString.substring(4);
				//console.log("Method dont has body : ", method)
				if(infos.method === "get" && (!path || path.charAt(path.length-1) == '/')){
					
					responseValue = this["query"](queryString, infos);
					//else
					//	responseValue = this[method](queryString, infos);
					
				}
				else{
					// call the model with just the path
					//console.log("Facet : call method "+method+" with just the path : ", infos.id)
					responseValue = this[method](infos.id, infos);
				}
				if(range){
					// we have to wait for promise for counts to be set (e.g., mongo)
					responseValue = when(responseValue).then( function(responseValue){
						return responseValue && when(responseValue.totalCount).then(  function(count){
							delete responseValue.totalCount;
							var end = start + (responseValue.length || 0) - 1;
							infos.responseHeaders["content-range"] = "items " + start + '-' + end + '/' + (count || '*');
							status = (start === 0 && count -1 === end) ? 200 : 206;
							return responseValue;
						});
					});
				}
			}
			else // method has body
			{
				 console.log("Facet : method has body ", request.body, " - infos : " , infos)



				if(method == "put")
				{
		
					var id = this.getId(request.body);
					if(!id)
						id = request.body.id = infos.id;
					else
						infos.id = id;
					if(!id)
						throw new errors.PreconditionFailed("Facet need id on put");
					
				}
				responseValue = this[method](request.body, infos);
				//console.log("Facet : method has body : responseValue ", responseValue)

				deep.when(responseValue)
				.done(function(responseValue){
					//console.log("first responseValue handler : ", responseValue)
					if(responseValue)
					{
						infos.responseHeaders["content-type"] = "application/javascript"
						// include a Content-Location per http://greenbytes.de/tech/webdav/draft-ietf-httpbis-p2-semantics-08.html#rfc.section.6.1
						infos.responseHeaders["content-location"] = request.scheme + "://" + request.headers.host + scriptName  + '/' + (othis.getId(responseValue));
					}
					if(deep.context && deep.context.generatedId)
					{
						status = 201;
						infos.responseHeaders.location = infos.responseHeaders["content-location"]; // maybe it should come from transaction.generatedId?
					}
				});
			} 

			return deep.when(responseValue)
			.done(function(responseValue){
				// console.log("second responseValue handler : ", responseValue)
				if(typeof responseValue != 'undefined' && responseValue != null)
				{
					infos.responseHeaders["content-type"] = "application/json;charset=utf-8;"

					if(responseValue instanceof Error)
						return responseValue;
					return {
						status: status,
						headers: infos.responseHeaders,
						body: responseValue
					}
				}	
				throw new errors.NotFound("error : facets doesn't give something");
			}); 
		}
		catch(e){
			console.log("FACET ANALYSE ERROR : ", e);
			if(e instanceof Error && e.status)
				throw e;
			throw new errors.Server("Facet analyse error : "+JSON.stringify(e), 500);
			//throw e;// new Error("error while facet.analyse : ", e);
		}
	}

	
	function removeProps(obj, path)
	{
		if(path[0] == "/")
			path = path.substring(1);
		deep.utils.deletePropertyByPath(obj, path, "/");
	}

	FacetController.prototype.get = function(id, options)
	{
		//console.log("facets-controller : get : ", id, this.schemas);

		if(id == "schema" || id == "schema.get")
			return this.schemas.get;
		else if(id == "schema.put")
			return this.schemas.put;
		else if(id == "schema.post")
			return this.schemas.post;
		else if(id == "schema.query")
			return this.schemas.query;
		else if(id == "schema.patch")
			return this.schemas.patch;
		else if(id == "schema.delete")
			return this.schemas["delete"];

		if(!this.store)
			throw new errors.Access(this.name + " don't have store to get something");

		var othis = this;
		return deep.when(this.store.get(id, options))
		.done(function(obj){
			if(typeof obj === 'undefined' || obj == null)
				return new errors.NotFound("facet return nothing");
			if(obj.status && obj.status >= 400)
				return obj;
			if(typeof othis.schemas.get.restrictToOwner === 'function' && !othis.restrictToOwner(obj, othis.schemas.post, options))
				throw new errors.Unauthorized("you're not the owner of this ressource.");
			return othis.filterProperties(obj, othis.schemas.get);
		})
		.fail(function(error){
			if(error instanceof Error)
				return error;
			throw new errors.Access("error when getting on store. "+JSON.stringify(error));
		}); 
	}

	FacetController.prototype.post = function(object, options)
	{
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to post something");
		var othis = this;
		//console.log("facets-controller : post : ", object, options);
		return deep.when(Validator.validate(object, othis.schemas.post))
		.done(  function(report){
			if(!report.valid)
				throw new errors.PreconditionFailed(report);

			if(typeof othis.schemas.get.restrictToOwner === 'function' && !othis.restrictToOwner(obj, othis.schemas.post, options))
				throw new errors.Unauthorized("you're not the owner of this ressource.");

			return when(othis.store.post(object, options)).then(  function(obj){
				//console.log("facet-controller : after store post  : response ", obj)
				if(!obj)
					return new errors.Access("post return nothing");
				if(obj.status && obj.status >= 400)
					return obj;
				return othis.filterProperties(obj, othis.schemas.post);
			},function(error){
				return error;
			});
		})
		.fail(function(error){
			throw error;//{ __isErrorResponse__:true, status:400, body: }
		});
	}

	FacetController.prototype.query = function(query, options){
		//console.log("FacetController QUERY : options = ", options);
		var othis = this;
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to query something");
		return when(this.store.query(query, options)).then( function(obj){
			if(!obj)
				return [];
			if(obj.status && obj.status >= 400)
				return obj;
			return othis.filterProperties(obj, othis.schemas.query);
		},function(error){
			throw error;//{ __isErrorResponse__:true, status:400, body:"query failed on store" }
		});
	}
	
	FacetController.prototype.getId = function(instance){
		return instance[this.schemas.get.mainId || "id"];
	}

	FacetController.prototype.put = function(object, options){ 
		var othis = this;
		//console.log("FACET put : object.id ", object.id, " - id : ", options.id)
		var id = object.id || options.id;
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to put something");

		return deep.when(Validator.validate(object, othis.schemas.put)).then( function(report){
			if(report.valid)
				return deep.when(othis.store.put(object, options))
				.done(  function(obj){
					if(!obj)
						throw new errors.Access("put return nothing");
					if(obj.status && obj.status >= 400)
						return obj;
					//if(!othis.getId(obj))
					//	return  { __isErrorResponse__:true, status:400, body:"no id associated with object after put : "+JSON.stringify(obj) }
					
					return othis.filterProperties(obj, othis.schemas.put);
				});
			else
			{
				console.log("PRECONDITION FAILED : ", JSON.stringify(report, null, ' '));
				throw new errors.PreconditionFailed("put failed to be executed : precondition failed : ", report);
			}	
		},function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.PreconditionFailed("put failed to be executed : precondition failed : ", error);
		});
	}
	FacetController.prototype.patch = function(object, options){ 
		var othis = this;
		//console.log("FACET patch : object.id ", object.id, " - id : ", options.id)
		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::patch : problem, ids in object and url dont correspond");

		var id = object.id || options.id;
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to put something");

		var updatedObject = {};
	 	return	deep.when( this.store.get(id, options) )
		.fail( function (error) {
			if(error instanceof Error)
				throw error;
			throw new errors.NotFound("FacetController::patch : no object found with this id");
		})
		.done( function (success) {
			//console.log(" PATCH GET old obect done = ", success);
			updatedObject = deep.utils.up(object, success);
			delete updatedObject.getMetadata;

			//console.log(" PATCH updatedObject = ", updatedObject)
			return deep.when(Validator.validate(updatedObject, othis.schemas.put))
			.done( function(report){
				if(report.valid)
					return when(othis.store.put(updatedObject, options)).then(  function(obj){
						if(!obj)
							throw new errors.Access("patch return nothing");
						if(obj.status && obj.status >= 400)
							return obj;
						//if(!othis.getId(obj))
						//	return  { __isErrorResponse__:true, status:400, body:"no id associated with object after put : "+JSON.stringify(obj) }
						
						return othis.filterProperties(obj, othis.schemas.put);
					});
				else
					throw new errors.PreconditionFailed("patch failed to be executed : precondition failed : ", report);
			})
			.fail(function(error){
				if(error instanceof Error)
					throw error;
				throw new errors.PreconditionFailed("patch failed to be executed : precondition failed : ", error);
			});
		})
		

		
	}
	FacetController.prototype.delete = function(object, options){ // handle puts to add to history and define attribution
		if(!this.store)
			throw new errors.Access(this.name + " don't have store to delete something");
		return deep.when(this.store["delete"](object, options))
		.done(function(obj){
			if(!obj)
				throw new errors.Access("delete return nothing");
			if(obj.status && obj.status >= 400)
				return obj;
			//if(!othis.getId(obj))
			//	return  { __isErrorResponse__:true, status:400, body:"no id associated with object after put : "+JSON.stringify(obj) }
			
			return othis.filterProperties(obj, othis.schemas.put);
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			var e =	new errors.Access("delete return error : "+JSON.stringify(error));
			throw e ;
		});
	}
	return FacetController;
});
