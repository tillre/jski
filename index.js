var common = require('./lib/common.js');
var serialize = require('./lib/serialize.js');
var vs = require('./lib/validators.js');


var stdValidators = {
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
  }
};


function createContext(validators) {

  validators = validators || {};

  var context = {

    addValidator: function(name, validator) {
      var v = validator.clone();
      this[name] = validators[name] = function() {
        return v.clone();
      };
      return this;
    },

    createValidator: serialize.fromJSON,

    createValue: serialize.createValue,

    createContext: function(vs) {
      vs = vs || {};
      return createContext(common.extend(vs, validators));
    }
  };
  common.extend(context, validators);
  return context;
};


module.exports = createContext(stdValidators);
