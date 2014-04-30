autobahn.roles
===

deep(js) expressivity (through queries, AOP, backgrounds, OCM,...) allows realy polymorphic approach of users roles management and modelisation.

Amoung all possibilities, here are listed differents strategies.

They are there as 'good practices', and to show you how imbricated deep(js) concepts and tools nicely.
You could (should?) adapt it to your own apps architecture.


## Define simple ocm service

Example of soustractive synthesis : "admin" is full rights, "user" and "public" inherit from admin and remove capacities.

```javascript

var myServiceMap = {
	admin:deep.store.Collection.create(null, [{ id:"e1", title:"hello" }, { id:"e2", title:"world" }]),
	public:{
		backgrounds:["this::../admin", deep.AllowOnly("get","range")]
	},
	user:{
		backgrounds:["this::../admin", deep.Restrictions("del")]
	}
};

var myService = deep.ocm(myServiceMap, { strict:false });

myService("admin").post({ id:"e3", title:"deepjs"}).log();		// ok
myService("user").del("e1").log();								// error : 403
myService("public").range(1,4).log();							// ok

```


## Define service with dev/prod particular config 

var myServiceMap = {
	dev:deep.store.Collection.create(null, ...),
	prod:deep.store.Mongo.create(null, ...),
	public:deep.AllowOnly("get","range"),
	user:deep.Restrictions("del"),
	admin:{}
	// if strict:false : all other roles (as admin) have all rights
};
var myService = deep.ocm(myServiceMap, { group:"roles", strict:true });
(strict:true means : if any of asked modes is not present : return empty object (+ debug log))

==> on usage :
deep.setModes("roles",["dev","bloutch"])

