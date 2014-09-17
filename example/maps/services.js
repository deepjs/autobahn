/**
 * example of deep-views/deep-routes html render map
 */
var deep = require("deepjs/deep");
require("deep-mongo");
require("autobahnjs/lib/utils"); /// load deep.transformers.Hash

var schema = {
	properties:{
		email:{ type:"string", format:"email", required:true },
		password:{ type:"string", minLength:6, required:true, transformer:deep.transformers.Hash }
	}
};

module.exports = {
	"/user": deep.ocm({
		admin: deep.Mongo(null, "mongodb://127.0.0.1:27017/testdb", "user", schema),
		user: {
			_backgrounds: ["this::../admin", deep.AllowOnly("get")],
			schema:{
				ownerRestriction:"id", // user could only see his own user object.
				properties:{
					email:{ readOnly:true },
					password:{ "private":true, readOnly:true }
				}
			}
		},
		"public": {
		}
	}, {
		protocol: "user",
		sensibleTo: "roles"
	}),
	"/foo":deep.Collection("foo", [{ id:"e1", bar:true, zoo:"hello world" }])
};
