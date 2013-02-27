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
	var deep = require("deep/deep");
	var Querier = require("deep/deep-query");
	var autobahnController = require("autobahn/autobahn-controller");
	var utils = require("autobahn/utils");
	var baseHandler = {
		session:function (session) 
		{
			var self = this;
			var func = function (s,e) 
			{
				
				self.currentSession = session;
				self.currentFacet = null;
				self.currentRole = null;
				var roles = session.remoteUser.roles || ["public"];
				if(session.roleController)
				{
					self.currentRole = session.roleController();
					self.running = false;
					deep.chain.nextQueueItem.apply(self, [self.currentRole, null]);
				}
				else
					deep.when(autobahnController.compileRoles(roles)).then(function (ctrl) {
						self.currentRole = ctrl;
						if(!ctrl)
							throw new Error("No roles selected with : "+JSON.stringify(roles));
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [ctrl, null]);
					},
					function (error) {
						self.running = false;
						deep.chain.nextQueueItem.apply(self, [null, error]);
					});
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
				deep.when(self.currentFacet.accessors.get.handler(id, options)).then(function (result) {
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
				deep.when(self.currentFacet.accessors.post.handler(object, options)).then(function (result) {
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
				deep.when(self.currentFacet.accessors.put.handler(object, options)).then(function (result) {
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
				deep.when(self.currentFacet.accessors.patch.handler(object, options)).then(function (result) {
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
				deep.when(self.currentFacet.accessors.query.handler(q, options)).then(function (result) {
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
				deep.when(self.currentFacet.accessors["delete"].handler(id, options)).then(function (result) {
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
	autobahn.utils = utils;

	autobahn.layer = autobahnController;
	deep(deep.request).up({
		post:function (object, uri, options) 
		{
			console.log("post from autobahn-plugin")
		},
		put:function (object, uri, options) 
		{
			console.log("put from autobahn-plugin")
		}
	})
	return autobahn;

})