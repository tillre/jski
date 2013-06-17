
var primitives = require('./primitives.js');
var ArrayValidator = require('./array.js');
var ObjectValidator = require('./object.js');
var EnumValidator = require('./enum.js');
var ofs = require('./ofs.js');
var RefValidator = require('./ref.js');

module.exports = {

  Boolean: primitives.BooleanValidator,
  Number: primitives.NumberValidator,
  Integer: primitives.IntegerValidator,
  String: primitives.StringValidator,
  Any: primitives.AnyValidator,
  Null: primitives.NullValidator,
  Array: ArrayValidator,
  Object: ObjectValidator,
  Enum: EnumValidator,
  AllOf: ofs.AllOfValidator,
  AnyOf: ofs.AnyOfValidator,
  OneOf: ofs.OneOfValidator,
  Ref: RefValidator
  
};