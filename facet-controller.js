	//facets-controller
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>

refactoring : 

each method need to be wrapped in a RessourceAcccessor



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
			throw new errors.MethodNotAllowed("You don't have right to perform this operation. "+message||"");
		}
	},
	get : function(id, options)
	{
		//console.log("facets-controller : get : ", id, this.facet);

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
			throw new errors.Access(this.facet.name + " don't have store to get something");

		var self = this;
		return deep.when(this.facet.store.get(id, options))
		.done(function(obj){
			if(typeof obj === 'undefined' || obj == null)
				return new errors.NotFound("facet return nothing");
			if(typeof self.restrictToOwner === 'function' && !self.restrictToOwner(obj, self.schema || schema, options))
				throw new errors.Unauthorized("you're not the owner of this ressource.");
			// filter privates props
			deep(obj, self.schema || self.facet.schema || {}).remove(".//?_schema.private=true");
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
		//console.log("Accessors.post : ", this.facet.store.post)
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to post something");

		var report = deep.validate(object, this.schema || this.facet.schema || {});
		if(!report.valid)
			throw new errors.PreconditionFailed("post failed!", report);

	//	console.log("facets-controller : post : ", object, options);
		if(typeof this.restrictToOwner === 'function' && !this.restrictToOwner(obj, this.schema || this.facet.schema, options))
			throw new errors.Unauthorized("you're not the owner of this ressource.");

		var self = this;

		return deep.when(this.facet.store.post(object, options))
		.done(function(obj){
			console.log("facet-controller : after store post  : response ", obj)
			if(typeof obj === 'undefined' || obj == null)
				throw new errors.Access("post return nothing");
			deep(obj, self.schema || self.facet.schema || {}).remove(".//?_schema.private=true");
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when posting on store. "+JSON.stringify(error));
		}); 
	},
	query : function(query, options)
	{
		//console.log("FacetController QUERY : options = ", options);
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to query something");
		var self = this;
		return deep.when(this.facet.store.query(query, options))
		.done(function(result){
			// console.log("facet.query : ", query, result)
			if(!result)
				return [];
			deep(result, { type:"array", items:self.schema || self.facet.schema || {} }).remove(".//?_schema.private=true");
			return result;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when query on store. "+JSON.stringify(error));
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
			throw new errors.PreconditionFailed("FacetController::put : problem, ids in object and url dont correspond");

		var report = deep.validate(object, this.schema || this.facet.schema || {});
		if(!report.valid)
			return new errors.PreconditionFailed("put failed!", JSON.stringify(report));

		return deep.when(this.facet.accessors.get.handler(options.id, options))
		.done(function(success){
			if(success.length == 0)
				throw new errors.Unauthorized("object don't exists. Please post before.");
			return success;
		})
		.done(function(oldOne)
		{
			var newOnly = deep(object, self.schema || self.facet.schema )
			.query("./*?_schema.readOnly=true")
			.nodes();

			newOnly.forEach(function(e){
				var oldValue = deep.utils.retrieveValueByPath(oldOne, e.path, "/");
				if(typeof oldValue === 'undefined' && oldValue != e.value)
					throw new errors.Unauthorized(e.path+" is readOnly !")
			});
			return deep.when(self.facet.store.put(object, options))
		})
		.done(function(obj){
			if(!obj)
				throw new errors.Access("put return nothing");
			deep(obj, self.schema || self.facet.schema || {}).remove(".//?_schema.private=true");
			console.log("FACET PUT DONE obj : ", obj);
			
			return obj;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("error when putting on store. "+JSON.stringify(error));
		}); 
	},
	patch : function(object, options)
	{
		var self = this;
		//console.log("FACET patch : object.id ", object.id, " - id : ", options.id)
		if(!this.facet.store)
			throw new errors.Access(this.facet.name + " don't have store to put something");
		options.id = options.id || object.id;

		if(!options.id || (object.id && options.id != object.id))
			throw new errors.PreconditionFailed("FacetController::patch : problem, ids in object and url dont correspond");
		var id = object.id || options.id;

		var report = deep.validate(object, this.schema || this.facet.schema || {});
		if(!report.valid)
			return new errors.PreconditionFailed("patch failed!", report);

	 	return	deep.when( this.facet.store.get(id, options) )
		.done( function (success) {
			console.log(" PATCH GET old object done = ", success);
			
			if(!success)
				throw new errors.Unauthorized("no ressource to patch");

			var newOnly = deep(object, self.schema || self.facet.schema )
			.query("./*?_schema.readOnly=true")
			.nodes();
			
			newOnly.forEach(function(e){
				console.log(" READ PROPERTIES readonly : ", e)
				var oldValue = deep.utils.retrieveValueByPath(success, e.path, "/");
				if(typeof oldValue === 'undefined' && oldValue != e.value)
					throw new errors.Unauthorized(e.path+" is readOnly !")
			});

			deep.utils.up(object, success);
			delete success.getMetadata;
			//console.log(" PATCH updatedObject = ", updatedObject)
			return deep.when(self.facet.store.put(success, options))
			.done(function(obj){
				if(!obj)
					throw new errors.Access("patch return nothing");
				deep(obj, self.schema || self.facet.schema || {}).remove(".//?_schema.private=true");
				return obj;
			});
		})
		.fail( function (error) {
			if(error instanceof Error)
				throw error;
			throw new errors.Access("FacetController::patch : no object found with this id");
		})
	},
	"delete" : function(object, options)
	{ 
		if(!this.store)
			throw new errors.Access(this.facet.name + " don't have store to delete something");
		return deep.when(this.store["delete"](object, options))
		.done(function(obj){
			if(!obj)
				throw new errors.Access("delete return nothing");
			return true;
		})
		.fail(function(error){
			if(error instanceof Error)
				throw error;
			throw new errors.Access("delete return error : "+JSON.stringify(error));
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
	accessors:{
		get:{
			facet:null,
			handler:Accessors.get,
			setCustomHeaders:function (response, request) {
				request.autobahn.response.headers["Content-Location"] = request.scheme + "://" + request.headers.host + request.autobahn.scriptName  + '/' + (this.facet.getId(response));
			},
			negociation:{
				"text/html":{
					handler:function (response, request) {
						// body...
					}
				}
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
		console.log("facet-controller.init()")
		deep(this.accessors.patch.schema).replace("//required", false);
		for(var i in this.accessors)
		{
			console.log("______________________ init accessors from facet : ", this)
			deep.utils.up({
				facet:this,
				name:i
			}, this.accessors[i]);
		}
	},
	rpcCall:function (request) 
	{
		console.log("Facet.rpcCall")
		var self = this;
		return deep.all([this.accessors.get.handler(request.autobahn.path, request.autobahn), request.body])
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
			body.params = body.params || [];

			var schema = self.facet.schema;
			var session = request.autobahn.session;
			var roleController = request.autobahn.roleController;

			var handler = {
				save:function()
				{
					return deep.when(self.accessors.put(obj, {}));
				},
				getLink:function(relationName)
				{
					var link = deep.query(schema, "/links/*?rel="+relationName).shift();
					if(!link)
						return new Error("no link found with : "+relationName);	
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
				return {
					id:body.id,
					error:null,
					result:result
				}
			})
			.fail(function (error) {
				return {
					id:body.id,
					error:JSON.stringify(error),
					result:null
				}
			})
		})
		.done(function  (result) {
			request.autobahn.response.body = result;
			deep.utils.up(self.headers || {}, request.autobahn.response.headers);
			request.autobahn.response.status = 200;
			return request.autobahn.response;
		});
	},
	analyse:function (request) 
	{
		var infos = request.autobahn,
			self = this;

		 // console.log("facet analyse")

		if(infos.method == "post" && infos.contentType.indexOf("application/json-rpc") !== -1)
			return this.rpcCall(request);

		var accessor = this.accessors[infos.method];

		// QUERY case :
		var isQuery = false;
		if(infos.method === "get" && (!infos.path || infos.path.charAt(infos.path.length-1) == '/'))
		{
			isQuery = true;
			accessor = this.accessors.query;
			utils.parseRange(request);
		}	

		if(!accessor)
			throw new errors.MethodNotAllowed();

		request.autobahn.response.status = 200;
		  // console.log("facet analyse 2")
		infos.id = infos.path;

		var result = null;
		if(accessor.hasBody)
			if(request.body)
				result = deep.when(request.body)
				.done(function (body) 
				{
					// console.log("method hasBody : ", accessor.handler)
					return accessor.handler(body, infos);
				});
			else
				throw new errors.Access("no body provided with ", infos.method, " on ", this.name)
		else if(isQuery)
		{
			result = deep.when(accessor.handler(infos.queryString, infos))
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
			result = accessor.handler(infos.path, request.autobahn);
		 // console.log("facet analyse 3")

		return deep.when(result)
		.done(function (result) {
			 // console.log("facet analyse 4")
			request.autobahn.response.body = result;
			deep.utils.up(accessor.headers || self.headers || {}, infos.response.headers);
			if(accessor.setCustomHeaders)
				accessor.setCustomHeaders(result, request);
			return infos.response;
		});
	}
}
	
	return {
		Permissive:Permissive,
		Accessors:Accessors
	}
});
