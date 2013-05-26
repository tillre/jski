
function isUndefined(x) {
  return x === void 0;
}

function isNull(x) {
  return x === null;
}

function isBoolean(x) {
  return typeof x === 'boolean';
}

function isNumber(x) {
  return typeof x === 'number';
}

function isString(x) {
  return typeof x === 'string';
}

function isArray(x) {
  if (Array.isArray) return Array.isArray(x);
  return toString.call(x) == '[object Array]';
}

function isObject(x) {
  return x === Object(x);
}


function extend(a, b) {
  for (var n in b) {
    a[n] = b[n];
  }
  return a;
}


function inherit(a, b) {
  extend(a.prototype, b.prototype);
}


function makeError(message, path) {
  var err = new Error(message);
  err.path = path;
  return err;
}


function addError(errors, message, path) {
  errors.push(makeError(message, path));
  return errors;
}


function addErrors(errors, newErrors) {

  newErrors.forEach(function(err) {
    errors.push(err);
  });
  return errors;
}


function isKeyword(key) {
  return ['type', 'enum', 'allOf', 'anyOf', 'oneOf', '$ref'].indexOf(key) !== -1;
};


function fromJSON(schema) {

  var validator;
  
  if (schema.type || schema.properties || schema.items) {

    var type = schema.type;
    // infer 'array' and 'object' type
    if (schema.properties) type = 'object';
    if (schema.items) type = 'array';
    
    validator = new ({
      'boolean': BooleanValidator,
      'number': NumberValidator,
      'integer': IntegerValidator,
      'string': StringValidator,
      'any': AnyValidator,
      'null': NullValidator,
      'array': ArrayValidator,
      'object': ObjectValidator
    })[type]();
  }
  else if (schema.enum) {
    validator = new EnumValidator();
  }
  else if (schema.allOf) {
    validator = new AllOfValidator();
  }
  else if (schema.anyOf) {
    validator = new AnyOfValidator();
  }
  else if (schema.oneOf) {
    validator = new OneOfValidator();
  }
  else if (schema.$ref) {
    validator = new RefValidator();
  }

  if (!validator) {
    throw new Error('Unkown schema');
  }
  
  return validator.fromJSON(schema);
}


//
// Validator
//

function Validator(type) {

  this.type = type;
  this._options = {};
  this._constraints = [];
  this._checks = [];
  this._customAttributes = [];

  // meta keywords
  this.addOption('title', '');
  this.addOption('description', '');
  this.addOption('default');
  this.addOption('definitions');
}


Validator.prototype.toJSON = function() {

  var schema = { type: this.type };
  var self = this;

  Object.keys(this._options).forEach(function(key) {
    if (self._options[key].enabled) {
      schema[key] = self._options[key].value;
    }
  });

  this._constraints.forEach(function(constraint) {
    if (constraint.enabled) {
      schema[constraint.name] = constraint.toJSON ? constraint.toJSON() : constraint.value;
    }
  });

  Object.keys(this._customAttributes).forEach(function(key) {
    schema[key] = self._customAttributes[key];
  });
  
  return schema;
};


Validator.prototype.fromJSON = function(schema) {

  var self = this;

  Object.keys(schema).forEach(function(key) {

    if (isKeyword(key)) return;
    
    if (self._options.hasOwnProperty(key)) {
      self._options[key] = {
        enabled: true,
        value: schema[key]
      };
    }
    else {
      var isConstraint = false;
      
      self._constraints.forEach(function(constraint) {
        if (constraint.name === key) {
          self[constraint.name](constraint.fromJSON(schema[key]));
          isConstraint = true;
        }
      });

      if (!isConstraint) {
        self._customAttributes[key] = schema[key];
      }
    }
  });

  return this;
};


Validator.prototype.addOption = function(name, defaultValue) {

  this._options[name] = {
    enabled: false,
    value: defaultValue
  };

  this[name] = function(value) {

    // get value when not passed
    if (isUndefined(value)) {
      return this._options[name].value;
    }

    // set value
    this._options[name] = {
      enabled: true,
      value: value
    };
    return this;
  };
};


Validator.prototype.addConstraint = function(name, validate, toJSON, fromJSON) {

  var self = this;
  
  var constraint = {
    name: name,
    value: null,
    enabled: false,

    validate: function(value, options, path) {
      path = path || '';
      return validate.call(self, value, this.value, options, path);
    },
    toJSON: function() {
      return toJSON ? toJSON(this.value) : this.value;
    },
    fromJSON: function(schema) {
      return fromJSON ? fromJSON(schema) : schema;
    }
  };

  this[name] = function(value) {
    constraint.value = value;
    constraint.enabled = true;
    return this;
  };

  this._constraints.push(constraint);
};


Validator.prototype.addCheck = function(check) {

  this._checks.push(check);
};


Validator.prototype.custom = function(name, value) {

  this._customAttributes[name] = value;
  return this;
};


Validator.prototype.validate = function(value, options, path) {

  path = path || '';
  options = options || {};

  // pass on local definitions
  var defs = this.definitions();
  if (defs) {
    options.definitions = options.definitions || {};
    extend(options.definitions, defs);
  }
  
  var errors = [];
  var self = this;

  this._constraints.forEach(function(constraint) {
    if (constraint.enabled) {
      addErrors(errors, constraint.validate(value, options, path));
    }
  });

  this._checks.forEach(function(check) {
    addErrors(errors, check.call(self, value, options, path));
  });
  
  return errors;
};


//
// Boolean Validator
//

function BooleanValidator() {

  Validator.call(this, 'boolean');

  this.addCheck(function(value, options, path) {
    return isBoolean(value) ? [] : [
      makeError('Value is not a boolean', path)
    ];
  });
}

inherit(BooleanValidator, Validator);


//
// Number Validator
//

function NumberValidator() {

  Validator.call(this, 'number');

  this.addConstraint(
    'multipleOf',
    function(value, n, options, path) {
      return value % n === 0 ? [] : [
        makeError('Value is not a multiple of: ' + n, path)
      ];
    }
  );
  
  this.addConstraint(
    'maximum',
    function(value, n, options, path) {
      return value <= n ? [] : [
        makeError('Value is greater than the maximum: ' + n, path)
      ];
    }
  );
  
  this.addConstraint(
    'minimum',
    function(value, n, options, path) {
      return value >= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );

  this.addCheck(function(value, options, path) {
    return isNumber(value) ? [] : [
      makeError('value is not a number', path)
    ];
  });
}

inherit(NumberValidator, Validator);


//
// Integer Validator
//

function IntegerValidator() {

  NumberValidator.call(this, arguments);
  this.type = 'integer';

  this.addCheck(function(value, options, path) {
    return Math.floor(value) === value ? [] : [
      makeError('Value is not an integer', path)
    ];
  });
}


inherit(IntegerValidator, NumberValidator);


//
// StringValidator
//

function StringValidator() {

  Validator.call(this, 'string');

  this.addConstraint(
    'maxLength',
    function(value, n, options, path) {
      return value.length <= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );

  this.addConstraint(
    'minLength',
    function(value, n, options, path) {
      return value.length >= n ? [] : [
        makeError('Value is less than minimum: ' + n, path)
      ];
    }
  );

  this.addConstraint(
    'pattern',
    function(value, p, options, path) {
      return new RegExp(p).test(value) ? [] : [
        makeError('Value does not match pattern: ' + p, path)
      ];
    }
  );

  this.addConstraint(
    'format',
    function(value, f, options, path) {
      if (!formats[f]) {
        return [makeError('Unkown format: ' + f, path)];
      }
      if (!formats[f].test(value)) {
        return [makeError('Value does not match format: ' + f, path)];
      }
      return [];
    }
  );

  this.addCheck(function(value, options, path) {
    return isString(value) ? [] : [
      makeError('Value is not a string', path)
    ];
  });
}


inherit(StringValidator, Validator);


//
// Array Validator
//

function ArrayValidator(items) {

  Validator.call(this, 'array');
  
  this.addOption('additionalItems', true);
  
  this.addConstraint(
    'maxItems',
    function(value, m, options, path) {
      return value.length <= m ? [] : [
        makeError('Number of items is larger than maximum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'minItems',
    function(value, m, options, path) {
      return value.length >= m ? [] : [
        makeError('Number of items is less than minimum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'uniqueItems',
    function(value, u, options, path) {
      if (!u) return [];

      var errors = [];
      var cache = {};

      for (var i = 0; i < value.length; ++i) {
        var str = JSON.stringify(value[i]);
        if (cache[str]) {
          addError(errors, 'Array items are not unique', path);
          break;
        }
        cache[str] = true;
      };
      return errors;
    }
  );
  
  this.addConstraint(
    'items',
    function(values, items, options, path) {

      var errors = [];
      var self = this;

      if (isArray(items)) {

        // array tuple

        values.forEach(function(value, i) {
          if (i < items.length) {
            addErrors(errors, items[i].validate(value, options, path + '[' + i + ']'));
          }
          else if (!self.additionalItems()) {
            addError(errors, 'Array index outside tuple length: ' + i, path + '[' + i + ']');
          }
        });
      }
      else if (isObject(items) && !this.additionalItems()) {

        // array
        
        values.forEach(function(value, i) {
          addErrors(errors, items.validate(value, options, path + '[' + i + ']'));
        });
      }

      return errors;
    },
    
    function(items) {
      if (isArray(items)) {
        return items.map(function(item) {
          return item.toJSON();
        });
      }
      else {
        return items.toJSON();
      }
    },

    function(schema) {
      if (isArray(schema)) {
        return schema.map(function(item) {
          return fromJSON(item);
        });
      }
      else {
        return fromJSON(schema);
      }
    }
  );

  this.addCheck(function(values, options, path) {
    return isArray(values) ? [] : [
      makeError('Value is not a array', path)
    ];
  });
  
  // set items constraint
  if (items) this.items(items);
}

inherit(ArrayValidator, Validator);


//
// Object Validator
//

function ObjectValidator(properties) {

  Validator.call(this, 'object');
  
  this.addOption('additionalProperties', true);

  this.addConstraint(
    'maxProperties',
    function(value, m, options, path) {
      return Object.keys(value).length <= m ? [] : [
        makeError('Number of properties is larger than maximum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'minProperties',
    function(value, m, options, path) {
      return Object.keys(value).length >= m ? [] : [
        makeError('Number of properties is less than minimum: ' + m, path)
      ];
    }
  );
  
  this.addConstraint(
    'required',
    function(value, reqs, options, path) {
      var errors = [];
      var self = this;
      
      reqs.forEach(function(name) {
        if (!value.hasOwnProperty(name)) {
          addError(errors, 'Required property is missing: ' + name, path);
        }
      });
      return errors;
    }
  );
  
  this.addConstraint(
    'properties',

    function(value, properties, options, path) {
      var errors = [];
      
      for (var n in value) {
        if (properties[n]) {
          addErrors(errors, properties[n].validate(value[n], options, path + '.' + n));
        }
        else if (!this.additionalProperties()) {
          addError(errors, 'Object has no property with name: ' + n, path + '.' + n);
        }
      }
      return errors;
    },

    function(properties) {
      var schema = {};
      Object.keys(properties).forEach(function(key) {
        schema[key] = properties[key].toJSON();
      });
      return schema;
    },

    function(schema) {
      properties = {};
      Object.keys(schema).forEach(function(key) {
        properties[key] = fromJSON(schema[key]);
      });
      return properties;
    }
  );

  this.addCheck(function(value, options, path) {
    return isObject(value) && !isArray(value) ? [] : [
      makeError('Value is not an object', path)
    ];
  });
  
  // shortcut to set constraint
  if (properties) this.properties(properties);
}

inherit(ObjectValidator, Validator);


//
// Enum Validator
//

function EnumValidator(items) {

  this.items = items || [];
  Validator.call(this, 'enum');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var valid = false;
    
    this.items.forEach(function(item) {
      if (!valid) {
        if (isObject(item) || isArray(item)) {
          valid = JSON.stringify(item) === JSON.stringify(value);
        }
        else {
          valid = item === value;
        }
      }
    });

    if (!valid) {
      addError(errors, 'Not a valid enumeration item: ' + value, path);
    }
    return errors;
  });
}


inherit(EnumValidator, Validator);


EnumValidator.prototype.toJSON = function() {
  return { 'enum': this.items };
};


EnumValidator.prototype.fromJSON = function(schema) {
  this.items = schema.enum;
  return this;
};


//
// Any Validator
//

function AnyValidator() {

  Validator.call(this, 'any');
}

inherit(AnyValidator, Validator);


//
// Null Validator
//

function NullValidator() {

  Validator.call(this, 'null');

  this.addCheck(function(value, options, path) {
    return isNull(value) ? [] : [
      makeError('Value is not null', path)
    ];
  });
}

inherit(NullValidator, Validator);


//
// *Of Validator
//

function OfValidator(items, type) {

  this.items = items;
  Validator.call(this, type);
}

inherit(OfValidator, Validator);


OfValidator.prototype.toJSON = function() {
  var schema = {};
  schema[this.type] = this.items.map(function(item) {
    return item.toJSON();
  });
  return schema;
};


OfValidator.prototype.fromJSON = function(schema) {
  this.items = schema[this.type].map(function(item) {
    return fromJSON(item);
  });
  return this;
};


//
// AllOf Validator
//

function AllOfValidator(items) {

  OfValidator.call(this, items, 'allOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    this.items.forEach(function(item) {
      addErrors(errors, item.validate(value, options, path));
    });
    return errors;
  });
}

inherit(AllOfValidator, OfValidator);


//
// AnyOf Validator
//

function AnyOfValidator(items) {

  OfValidator.call(this, items, 'anyOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var valid = false;

    this.items.forEach(function(item) {
      valid = item.validate(value, options, path).length === 0 || valid;
    });
    if (!valid) {
      addError(errors, 'Value does not match any of the schemas', path);
    }
    return errors;
  });
}

inherit(AnyOfValidator, AllOfValidator);


//
// OneOf Validator
//

function OneOfValidator(items) {

  OfValidator.call(this, items, 'oneOf');

  this.addCheck(function(value, options, path) {
    var errors = [];
    var valid = 0;

    this.items.forEach(function(item) {
      valid += (item.validate(value, options, path).length === 0) ? 1 : 0;
    });
    if (valid === 0) {
      addError(errors, 'Value does not validate against one of the schemas');
    }
    if (valid > 1) {
      addError(errors, 'Value does validate against more than one of the schemas');
    }
    return errors;
  });
}

inherit(OneOfValidator, AllOfValidator);


//
// Ref Validator
//

function RefValidator(refName) {

  this.ref = refName;
  Validator.call(this, '$ref');

  this.addCheck(function(value, options, path) {
    var errors = [];
    if (options && options.definitions && options.definitions[this.ref]) {
      addErrors(errors, options.definitions[this.ref].validate(value, options, path));
    }
    else {
      addError(errors, 'Definition of schema reference not found: ' + value, path);
    }
    return errors;
  });
}

inherit(RefValidator, Validator);


RefValidator.prototype.toJSON = function() {
  return { $ref: this.ref };
};


RefValidator.prototype.fromJSON = function(schema) {
  this.ref = schema.$ref;
  return this;
};


//
// exports
//

module.exports = {
    
  boolean: function() { return new BooleanValidator(); },
  number:  function() { return new NumberValidator(); },
  integer: function() { return new IntegerValidator(); },
  string:  function() { return new StringValidator(); },
  any:     function() { return new AnyValidator(); },
  null:    function() { return new NullValidator(); },
  array:   function(items) { return new ArrayValidator(items); },
  object:  function(properties) { return new ObjectValidator(properties); },
  'enum':    function(items) { return new EnumValidator(items); },
  allOf:   function(items) { return new AllOfValidator(items); },
  anyOf:   function(items) { return new AnyOfValidator(items); },
  oneOf:   function(items) { return new OneOfValidator(items); },
  ref:     function(name) { return new RefValidator(name); },

  schema: fromJSON
};


//
// Format Regexps
//

var formats = {
  // originally taken from https://github.com/flatiron/revalidator/
  'email': /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
  'ip-address': /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i,
  'ipv6': /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d{1,3})?Z$/,
  'date': /^\d{4}-\d{2}-\d{2}$/,
  'time': /^\d{2}:\d{2}:\d{2}$/,
  'color': /^#[a-z0-9]{6}$|^#[a-z0-9]{3}$|^(?:rgba?\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*(?:,\s*(?:[+-]?\d+%?)\s*)?\))$/i,
  //'style': (not supported)
  //'phone': (not supported)
  //'uri': (not supported)
  'host-name': /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/,
  'utc-millisec': /^\d+$/,
  'regex': {
    test: function (value) {
      try { var re = new RegExp(value); }
      catch (e) { return false }
      return true;
    }
  },
  // non standard
  url: /^(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?$/,
  slug: /^([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])*$/
};

