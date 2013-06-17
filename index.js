var common = require('./lib/common.js');
var serialize = require('./lib/serialize.js');
var vs = require('./lib/validators.js');

//
// exports
//

module.exports = {
    
  boolean: function() { return new vs.Boolean(); },
  number:  function() { return new vs.Number(); },
  integer: function() { return new vs.Integer(); },
  string:  function() { return new vs.String(); },
  any:     function() { return new vs.Any(); },
  null:    function() { return new vs.Null(); },

  array:   function(varargs) {
    return new vs.Array(common.cloneArgs(arguments));
  },
  object:  function(properties) {
    return new vs.Object(properties);
  },
  'enum':    function(varargs) {
    return new vs.Enum(common.cloneArgs(arguments));
  },
  allOf:   function(varargs) {
    return new vs.AllOf(common.cloneArgs(arguments));
  },
  anyOf:   function(varargs) {
    return new vs.AnyOf(common.cloneArgs(arguments));
  },
  oneOf:   function(varargs) {
    return new vs.OneOf(common.cloneArgs(arguments));
  },
  ref:     function(name) {
    return new vs.Ref(name);
  },

  schema: serialize.fromJSON,
  createValue: serialize.createValue
};



