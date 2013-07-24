	//facets-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>

refactoring : 

need to match deep stores API.
will wrap methods (get/post/put/del) directly on root of facet

rpc need to match accessors(methods) pattern

need to provide wrap mecanims for methods and rpc restriction

	as : 

		clearPrivates	(all - output)
		matchReadOnly (put,patch - input)
		sanitize (put/post/patch - input)

		restrictOutputToOwner (  output for get/query )
		restrictToOwner ( input for patch/put/del )
		restrictOutputOnProperty : add rql close that perform filter for properties (as status enum, etc))
			could be provided from schema : 

		associateUser : add userId from session.remoteUser.id in object in post (input)

		restriction : 
			a composition that on collision : 
				- try to find in functions stack if there is other restrictions
				- add it's own restriction
				
	
	need to add from schema : avoid duplicate (on unique schema prop)
		: look in store if there is no duplicate before insertion (post/patch/put - input)
 */

if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){
	var deep = require("deep/deep");
	var errors = require("autobahn/errors");
	var AutobahnResponse = require("autobahn/autobahn-response");
	var utils = require("autobahn/utils");

	//console.log("------Content-Type = ", contentType);

var Accessors  = {
	forbidden:function(message){
		return function(obj, options){
			options = options || {};
			var self = this;
			message = message || "";
			throw new errors.MethodNotAllowed(" ("+self.facet.name+"."+options.method+") You don't have right to perform this operation. "+message);
		}
	},
	get : function(id, options)
	{
		console.log("facets-controller ("+this.facet.name+") : get : ", id);
		var self = this;

		var accessors = this.facet.accessors;
		var schema = this.facet.schema;
		/*if(id == "schema" || id == "schema.get")
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
			return (accessors["delete"] && accessors["delete"].schema)?accessors["delete"].schema:schema;*/

		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to get something");

		//console.log("facet : ("+this.facet.name+") : get  : "+id+" : will call store. ")
		return deep.when(this.facet.store.get(id, options), null, { rethrow:false })
		.done(function(obj){
			console.log("facet get stroe response : ", obj)
			if(typeof obj === 'undefined' || obj == null)
				throw new errors.NotFound("("+self.facet.name+") facet return nothing");
			if(self.restrictToOwner)
			{
				if(!deep.context.session)
					return new errors.Owner("no previous session : ownership failed");
				var toMatch = obj.userId || obj[self.restrictToOwner];
				if(deep.context.session.remoteUser.id !== toMatch)
					return new errors.Owner("id doesn't match : ownership failed");
			}
			if(self.hasPrivates)
				deep(obj, self.schema || schema).remove(".//?_schema.private=true");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("("+self.facet.name+") error when getting on store. "+JSON.stringify(error));
		});
	},
	post : function(object, options)
	{
		//console.log("Accessors.post : ", this.facet.store.post)
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to post something");
		var self = this;


		var schem = this.schema || this.facet.schema ;
		var report = null;
		if(schem)
		{
			report = deep.validate(object, schem);
			if(report && !report.valid)
				return new errors.PreconditionFailed("("+self.name+") put failed!", JSON.stringify(report));
		}	

		if(self.restrictToOwner)
			if(!deep.context.session)
				return new errors.Owner();
			else if(object.userId && deep.context.session.remoteUser.id !== object.userId)
				return new errors.Owner();

		if(typeof this.restrictToOwner === 'function' && !this.restrictToOwner(obj, this.schema || this.facet.schema, options))
			throw new errors.Unauthorized("("+self.facet.name+") you're not the owner of this ressource.");
		//console.log("Accessors : post : ", object);

		return deep.when(this.facet.store.post(object, options), null, { rethrow:false })
		.done(function(obj){
			//console.log("("+self.facet.name+") facet-controller : after store post  : response ", obj);
			if(typeof obj === 'undefined' || obj === null)
				throw new errors.Access("("+self.facet.name+") post return nothing");
			if(self.hasPrivates)
				deep(obj, schem).remove(".//?_schema.private=true");
			return obj;
		})
		.fail(function(error){
			console.log("accessor.post on store error : ", error);
			if(error instanceof Error)
				throw error;
			throw new errors.Access("("+self.facet.name+") error when posting on store. "+JSON.stringify(error));
		});
	},
	query : function(query, options)
	{
		//console.log("FacetController QUERY  : "+query+": options = ", this.facet.store);
		if(!this.facet.store)
			return new errors.Access(this.facet.name + " don't have store to query something");
		var self = this;
		return deep
		.when(this.facet.store.query(query, options), null, { rethrow:false })
		.done(function(result){
			// console.log("facet.query : ", query, result)
			if(!result)
				return [];
			var schema = self.schema || self.facet.schema;
			if(self.hasPrivates && schema)
			{
				var toTest = result;
				if(result._range_object_)
					toTest = result.results;
				deep(toTest, { type:"array", items:schema }).remove(".//?_schema.private=true");
			}
			if(self.restrictToOwner)
				if(!deep.context.session)
					return new errors.Owner();
				else
					deep(toTest, { type:"array", items:schema }).remove("./*?userId=ne="+success.userId);
			return result;
		})
		.fail(function(error){
			if(error instanceof Error)
				return error;
			return new errors.Access("("+self.facet.name+") error when query on store. "+JSON.stringify(error));
		});
	},
	put : function(object, options)
	{
		var self = this;
		//console.log("FACET put : object.id ", object.id, " - id : ", options.id)
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to put something");

		options = options || {};

		options.id = options.id || object.id;

		//console.log("Facet::put : ", object, options)

		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::put ("+self.facet.name+") : problem, ids in object and url dont correspond");

		var schem = this.schema || this.facet.schema ;
		var report = null;
		if(schem)
		{
			report = deep.validate(object, schem);
			if(!report.valid)
				return new errors.PreconditionFailed("("+self.name+") put failed!", JSON.stringify(report));
		}	

		return deep(this.facet.accessors.get.handler(options.id, options), null, {rethrow:false})
		.done(function(success){
			if(success.length == 0)
				throw new errors.Unauthorized("("+self.facet.name+") object don't exists. Please post before.");
			var user = success.shift();
			if(self.restrictToOwner)
				if(!deep.context.session)
					return new errors.Owner();
				else if(deep.context.session.remoteUser.id !== success.userId)
					return new errors.Owner();
		})
		.done(function(oldOne)
		{
			if(self.hasReadOnly)
			{
				var newOnly = deep( object, schem )
				.query(".//*?_schema.readOnly=true")
				.nodes();

				newOnly.forEach(function(e){
					var oldValue = deep.utils.retrieveValueByPath(oldOne, e.path, "/");
					if(typeof oldValue === 'undefined' && oldValue != e.value)
						throw new errors.Unauthorized(e.path+" is readOnly !")
				});
			}
			return self.facet.store.put(object, options);
		})
		.done(function(obj){
			if(!obj)
				return new errors.Access("("+self.facet.name+") put return nothing");
			if(self.hasPrivates)
				deep(obj, schem).remove(".//?_schema.private=true");
			//console.log("FACET PUT DONE obj : ", obj);
			return obj;
		})
		.fail(function(error){
			console.log("Facet.put failed : ",error);
			if(error instanceof Error)
				return error;
			return new errors.Access("("+self.facet.name+") error when putting on store. "+JSON.stringify(error));
		}); 
	},
	patch : function(object, options)
	{
		var self = this;
		//console.log("FACET patch : object.id ", object.id, " - id : ", options.id)
		if(!this.facet.store)
			return new errors.Access(this.facet.name + " don't have store to put something");
		options.id = options.id || object.id;

		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::patch ("+self.facet.name+") : problem, ids in object and url dont correspond");
		var id = object.id || options.id;

		var schem = this.schema || this.facet.schema ;
		var report = null;
		if(schem)
		{
			report = deep.validate(object, schem);
			if(report && !report.valid)
				return new errors.PreconditionFailed("("+self.name+") put failed!", JSON.stringify(report));
		}	

	 	return	deep.when( this.facet.store.get(id, options), null, { rethrow:false } )
		.done( function (success) {
			//console.log("("+self.facet.name+") PATCH GET old object done = ", success);
			
			if(self.restrictToOwner)
				if(!deep.context.session)
					return new errors.Owner();
				else if(deep.context.session.remoteUser.id !== success.userId)
					return new errors.Owner();

			if(!success)
				throw new errors.Unauthorized("no ressource to patch");

			if(self.hasReadOnly)
			{
				var newOnly = deep( object, schem )
				.query(".//*?_schema.readOnly=true")
				.nodes();
				
				newOnly.forEach(function(e){
					//console.log("("+self.facet.name+") READ PROPERTIES readonly : ", e)
					var oldValue = deep.utils.retrieveValueByPath(success, e.path, "/");
					if(typeof oldValue === 'undefined' && oldValue != e.value)
						throw new errors.Unauthorized(" ("+self.facet.name+") "+e.path+" is readOnly !")
				});
			}

			//remove the field that we want to patch (to avoid array merge)
			for(var fieldname in object)
				if( success[fieldname] )
					delete success[fieldname];
			deep.utils.up(object, success);
			delete success.getMetadata;
			//console.log(" PATCH updatedObject = ", updatedObject)
			return deep.when(self.facet.store.put(success, options))
			.done(function(obj){
				if(!obj)
					throw new errors.Access("("+self.facet.name+") patch return nothing");
				if(self.hasPrivates)
					deep(obj, schem).remove(".//?_schema.private=true");
				return obj;
			});
		})
		.fail( function (error) {
			if(error instanceof Error)
				throw error;
			throw new errors.Access("FacetController::patch ("+self.facet.name+"): no object found with this id");
		})
	},
	"delete" : function(object, options)
	{ 
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to delete something");
		var self = this;
		console.log("("+self.facet.name+") delete : ", object, options, this.facet.store)
		return deep.when(this.facet.store["delete"](object, options), null, { rethrow:false })
		.done(function(obj){
			//console.log("delete success : ", obj);
			if(!obj)
				throw new errors.Access("("+self.facet.name+") delete return nothing");
			return true;
		})
		.fail(function(error){
			console.log("("+self.facet.name+") delete error : ", error);
			if(error instanceof Error)
				throw error;
			throw new errors.Access("("+self.facet.name+") delete return error : "+JSON.stringify(error));
		});
	}
}
var sanitizer = require("sanitizer");
var createSanitizer = function (schema) {
	var toSanitize = deep(schema).query(".//*?sanitize=true").nodes();
	//console.log("TO SANITIZE : ", toSanitize);
	if(toSanitize.length == 0)
		return null;
	var queries = [];
	toSanitize.forEach(function (node) {
		var path = node.path.replace("/properties/","/").replace("/items/","/*/");
		queries.push(path);
	})
	return function (object) {
		queries.forEach(function (q) {
			deep(object).query("."+q).transform(function(value){
				return sanitizer.sanitize(value); 
			});
		});
	}
}

var Permissive = {
	roleController:null,
	headers:{
		"Content-Type":"application/json;charset=utf-8",
		"Accept-Ranges":"items"
	},
	schema:{
		
	},
	serveSchema:function (id) 
	{
		var accessors = this.accessors;
		var schema = this.schema;
		switch(id)
		{
			case "schema" : 
				return schema;
			case "schema.get" : 
				return (accessors.get && accessors.get.schema)?accessors.get.schema:schema;
			case "schema.post" : 
				return (accessors.post && accessors.post.schema)?accessors.post.schema:schema;
			case "schema.query" : 
				return (accessors.query && accessors.query.schema)?accessors.query.schema:schema;
			case "schema.put" : 
				return (accessors.put && accessors.put.schema)?accessors.put.schema:schema;
			case "schema.patch" : 
				return (accessors.patch && accessors.patch.schema)?accessors.patch.schema:schema;
			case "schema.delete" : 
				return (accessors["delete"] && accessors["delete"].schema)?accessors["delete"].schema:schema;
			default: ;
		}
	},
	accessors:{
		get:{
			facet:null,
			handler:Accessors.get,
			setCustomHeaders:function (response, request) {
				// console.log("facet  get setCustomHandler")
				request.autobahn.response.headers["Content-Location"] = request.autobahn.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			},
			negociation:{
				
			}
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
				// console.log("facet  post setCustomHandler")
				request.autobahn.response.headers["Content-Location"] = request.autobahn.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			},
			handler:Accessors.post
		},
		put:{
			hasBody:true,
			facet:null,
			handler:Accessors.put,
			setCustomHeaders:function (response, request) {
				// console.log("facet  put setCustomHandler")
				request.autobahn.response.headers["Content-Location"] = request.autobahn.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
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
				// console.log("facet  patch setCustomHandler")
				request.autobahn.response.headers["Content-Location"] = request.autobahn.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			}
		}
	},
	rpc:{
		link:function(handler, relation)
		{
			return handler.getLink(relation);
		}
	},
	store:{
		
	},
	getId : function(instance){
		return instance[this.mainId || "id"];
	},
	init : function(request, infos)
	{
		console.log("facet-controller.init() : ", this.name);

		if(!this.accessors.patch.schema && this.schema)
			this.accessors.patch.schema = deep.utils.copy(this.schema);
		if(this.accessors.patch.schema)
			deep(this.accessors.patch.schema).replace(".//required", false);

		for(var i in this.accessors)
		{
			//console.log("______________________ init accessors from facet : ", this)
			var accessor = this.accessors[i];
			var schema = accessor.schema || this.schema;
			var setupObject = {
				facet:this,
				name:i,
				hasPrivates:deep(schema).query(".//?private=true").values().length>0,
				hasReadOnly:deep(schema).query(".//?readOnly=true").values().length>0
			};
			if(accessor.hasBody)
				setupObject.sanitize = createSanitizer(schema);
			deep.utils.up(setupObject, accessor);
			var name = i + "";
			this[i] = function(arg1, options)
			{
				return accessors[i].handler(arg1, options);
			}
		}
	},
	executeRPC:function(id, body, options)
	{
		var self = this;
		console.log("execute rpc : ",id, body);

		if(this.store && this.store.forwardRPC)
			return this.store.rpc(id, body, options);

		return deep.all([this.accessors.get.handler(id, options), body])
		.done(function (results) {
			var obj = results[0];
			var body = results[1];
			if(body === "")
				body = {};
			if(typeof body === "string")
				body = JSON.parse(body);
			var toCall = self.rpc[body.method];

			//console.log("rpc : call method : ", body)

			if(!toCall)
				return errors.MethodNotAllowed();
			body.params = body.params || [];

			var schema = self.schema;
			var session = options.session;
			var roleController = options.roleController;

			var handler = {
				save:function()
				{
					return autobahn()
					.roles(["admin"])
					.facet(self.name)
					.patch(obj)
					.done(function (success)
					{
						return success;
					});
					//return deep.when(self.accessors.put.handler(obj, {session:session}));
				},
				getLink:function(relationName)
				{
					var link = deep.query(schema, "/links/*?rel="+relationName).shift();
					if(!link)
						return new Error("("+self.name+") no link found with : "+relationName);
					var interpreted = deep.interpret(link.href, obj);
					var splitted = interpreted.split("/");
					interpreted.shift();
					var facetName = splitted.shift();
					var q = splitted.shift();
					var d = autobahn()
					.session(session)
					.facet(interpreted.shift());
					if(q.indexOf("?") !== -1)
						return d.query(q.substring(1));
					else
						return d.get(q);
				},
				facet:self,
				schema:schema,
				session:session,
				roleController:roleController
			}
			body.params.unshift(handler)
			return deep.when(toCall.apply(obj, body.params))
			.done(function  (result) {
				// console.log("rpc call : response : ", result);
				return {
					id:body.id,
					error:null,
					result:result
				}
			})
			.fail(function (error) {
				console.log("rpc failed : response : ", error);
				return {
					id:body.id,
					error:JSON.stringify(error),
					result:null
				}
			});
		});
	},
	rpcCall:function (request)
	{
		//console.log("Facet.rpcCall : ", request.autobahn.path)
		var self = this;
		return self.executeRPC(request.autobahn.path, request.body, request.autobahn)
		.done(function  (result) {
			request.autobahn.response.body = result;
			deep.utils.up(self.headers || {}, request.autobahn.response.headers);
			request.autobahn.response.status = 200;
			return request.autobahn.response;
		})
	},
	analyse:function (request) 
	{
		var infos = request.autobahn,
			self = this;

		//console.log("facet analyse : ", infos.contentType);

		if(infos.method == "post" && infos.contentType.indexOf("application/json-rpc") !== -1)
		{
			//console.log("will call rpc");
			return this.rpcCall(request);
		}	
		var accessor = this.accessors[infos.method];
		if(infos.method == 'get' && this.serveSchema)
		{
			var sch = this.serveSchema(infos.path);
			if(sch)
			{
				infos.response.body = sch;
				//console.log("facet will add headers on response")
				infos.response.headers["Content-Type"] = "application/json;charset=utf-8";
				//if(accessor.setCustomHeaders)
				//	accessor.setCustomHeaders(sch, request);
				return infos.response;
			}
		}


		// QUERY case :
		var isQuery = false;
		if(infos.method === "get" && (!infos.path || infos.path.charAt(infos.path.length-1) == '/'))
		{
			isQuery = true;
			accessor = this.accessors.query;
			utils.parseRange(request);
		}

		if(!accessor)
			throw new errors.MethodNotAllowed(self.name+"."+infos.method+" (not present)");

		request.autobahn.response.status = 200;
		// console.log("facet analyse 2")
		infos.id = infos.path;

		var result = null;
		if(accessor.hasBody)
		{
			//console.log("accessors has body: request.body : ", request.body);	
			if(request.body)
				result = deep.when(request.body)
				.done(function (body)
				{
					if(body instanceof Buffer)
						body = body.toString();
					//console.log("body received : ", body);
					if(request.autobahn.method == "post" && request.autobahn.contentType.match("^(message/)"))
					{
						if(!(body instanceof Array))
							return errors.Access("trying to send message but body isn't array! ("+self.name+")");
						var alls = [];
						body.forEach(function (message) {
							//console.log("BULK UPDATE : message : ", message);
							var acc = self.accessors[message.method.toLowerCase()];
							if(!acc)
								throw errors.Access("trying to send message with method unrecognised or unauthorised ("+self.name+"): "+message.method);
							if(acc.hasBody)
							{
								
								if(acc.sanitize)
									accessor.sanitize(message.body);
								
								alls.push(acc.handler(message.body, {id:message.to}));
							}
							else
								alls.push(acc.handler(message.to, {id:message.to}));
						});
						return deep.all(alls)
						.done(function (results) {
							var res = [];
							body.forEach(function (message) {
								var r = results.shift();
								res.push({
									from:message.to,
									body:r,
									id:message.id,
									type:message.method
								});
							});
							return res;
						});
					}
					else{
						//console.log("facet : do simple method with body : ", self.name+"."+infos.method);
						if(accessor.sanitize)
							accessor.sanitize(body);	
						return accessor.handler(body, infos);
					}
					// console.log("method hasBody : ", accessor.handler)
				});
			else
				throw new errors.Access("("+self.name+") no body provided with ", infos.method, " on ", this.name);
		}
		else if(isQuery)
		{
			//console.log("will do query : ", accessor);
			result = deep.when(accessor.handler(infos.queryString, infos))
			.done(function (result)
			{
				//console.log("query result : range ?", infos.range, " - ", result);
				if(infos.range && result)
				{
					var end = result.end;
					//console.log("facet : range response : ",result);
					infos.response.headers["Content-Range"] = "items " + result.start + '-' + result.end + '/' + (result.total || '*');
					infos.response.status = (result.start === 0 && result.total -1 === end) ? 200 : 206;
					return result.results;
				}
				else if(result && result._range_object_)
					return result.results;
				return result;
			});
		}
		else
		{
			//console.log("facet : "+self.name+" : simple call");
			result = accessor.handler(infos.path, request.autobahn);
		}
		//console.log("facet ("+self.name+"."+infos.method+") call done : result to wait : ", result);

		return deep.when(result)
		.fail(function (error) {
			//console.log("_________________________________________ FACET ANALYSE FAIL : ", error);
		})
		.done(function (result) {

			//console.log("autobahn.facet : final result : ", result);

			if(result && result._pintura_redirection_)
				return result;

			//**************************************************************************************
			//****************************************** NEGOCIATION *******************************
			//**************************************************************************************
			if(accessor && accessor.negociation)
			{	
				var asked = utils.parseAcceptHeader(request.headers);
				//console.log("try negociation : ", asked);
				var negociator = null;
				var alsoJSON = false;
				var choosed = null;
				for(i = 0; i< asked.length; ++i) 
				{
					var ask = asked[i];
					if(ask.media == "application/json")
						alsoJSON = true;
					negociator = accessor.negociation[ask.media];
					if(negociator)
					{
						choosed = ask;
						break;
					}
				}
				//console.log("found negociator ? ",negociator);
				infos.response.headers["Content-Type"] = ask.media;
				if(negociator)
				{
					var r = negociator.handler(result, request);
					///console.log("negociation result : ",r)
					return r;
				}	
				else if(!alsoJSON && accessor.negociation["default"])
					return accessor.negociation["default"].handler(result, request);
				//console.log("negociation failed");
			}
			infos.response.body = result;
			deep.utils.up(accessor.headers || self.headers || {}, infos.response.headers);
			if(accessor.setCustomHeaders)
				accessor.setCustomHeaders(result, request);
			return infos.response;
		});
	}
};
	return {
		Permissive:Permissive,
		Accessors:Accessors
	};
});
