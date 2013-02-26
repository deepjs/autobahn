if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}


/*

	request : 
		 passage par Session en jsgi : request contient session.
		arrivée dans autobahn controller : 
			analyse request : find roles


		put:stock.allowCreate().onwerput(),
		patch:stock.ownerpatch()
*/



define(function (require)
{
	var HTTPrequest = require("promised-io/http-client").request;
	var deep = require("deep/deep");
	var Querier = require("deep/deep-query");
	var autobahnController = require("autobahn/autobahn-controller");
	var baseHandler = {
		session:function (session) 
		{
			var self = this;
			var func = function (s,e) 
			{
				if(request.session)
					self.currentSession = request.session;
				else
					self.currentSession = null;
				var roles = ["public"];
				if(self.currentSession && self.currentSession.remoteUser && self.currentSession.remoteUser.roles)
					roles = this.currentSession.remoteUser.roles;
				deep.when(autobahnController.compileRoles(roles)).then(function (ctrl) {
					self.currentRole = ctrl;
					//self._entries = [];
					if(!ctrl)
						throw new Error("No roles selected with : "+JSON.stringify(roles));
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [ctrl, null]);
				},
				function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]);
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
			
		},
		roles:function (list) {
			var self = this;
			list = list || ["public"];
			var func = function (s,e) {
				deep.when(autobahnController.compileRoles(list)).then(function (ctrl) {
					self.currentRole = ctrl;
					//self._entries = []
					if(!ctrl)
						throw new Error("No roles selected with : "+JSON.stringify(list));
				
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [ctrl, null]);
				},
				function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]);
				})
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		facet:function (name) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentRole)
					deep.when(autobahnController.compileRoles(["public"])).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected before facet use");
						//console.log("autobahn.facet :    roles  compiled  :  name : ",name, " - ctrl.facets ", ctrl.facets[name])
						self.currentFacet = ctrl.facets[name];
						if(!self.currentFacet)
							throw new Error("No facet selected with : "+name);
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [ctrl, null]);
					},
					function (error) {
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [null, error]);
					});
				else
				{
					self.currentFacet = self.currentRole.facets[name];
					//console.log("autobahn.facet : current roles already present : name : ",name, " - ctrl.facets ", self.currentRole.facets[name])
					if(!self.currentFacet)
						throw new Error("No facet selected with : "+name);
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [self.currentFacet, null]);
				}
			}
			deep.utils.up(facetHandler, self);
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		}
	};
	var facetHandler = deep.utils.up(baseHandler, {
		get:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				deep.when(self.currentFacet.get(id, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		post:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before post : ",object);
				deep.when(self.currentFacet.post(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		put:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before put : ",object);
				options = options || {};
				options.id = options.id || object.id;
				deep.when(self.currentFacet.put(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		patch:function (object, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before patch : ",object);
				options = options || {};
				options.id = options.id || object.id;
				deep.when(self.currentFacet.patch(object, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		query:function (q, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before query : ",q);
				deep.when(self.currentFacet.query(q, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		},
		delete:function (id, options) {
			var self = this;
			var func = function (s,e) {
				if(!self.currentFacet)
					throw new Error("No facet selected before get : ",id);
				deep.when(self.currentFacet["delete"](id, options)).then(function (result) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [result, null]); 
				}, function (error) {
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [null, error]); 
				});
			}
			deep.chain.addInQueue.apply(self, [func]);
			return this;
		}
	});
	
	var autobahn = function () {
		var handler = deep(autobahnController);
		deep.utils.up(baseHandler, handler);
		//console.log("autobahn start : ", handler)
		return handler; 
	}


	autobahn.layer = autobahnController;
	deep(deep.request).up({
		post:function  (uri, object, options) 
		{
			console.log("POST from autobahn-plugin")
			
			var headers = {};

			//this.setRequestHeaders(options, headers);

			//console.log("HEADER  : ", headers )
			var postRequest= HTTPrequest({
					method: "POST",
					url:uri,
					body: JSON.stringify(object),
					headers: headers
				});
			
			return deep.when( postRequest )
				.done( function (results) {
					return results
				})
				.fail( function  (error) {
					console.log("error (remote HTTP call failed) while calling remote-services on autobhan post plugin : ", error);
					return error;
				});
		},
		put:function ( uri, object, options) 
		{
			console.log("put from autobahn-plugin")
		}
	})
	return autobahn;

})