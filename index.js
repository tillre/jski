//
// jski - json schema validation
//

var _ = require('underscore');


var messages = {
  'type': 'Value is not of type <%=type%>.',
  'unknownType': 'Type is not known <%=type%>.',
  'unionTypeNotValid': 'Failed to validate union types.',
  'allOf': 'Value failed to validate against all of the schemas',
  'anyOf': 'Value failed to validate against any of the schemas',
  'oneOf': 'Value failed to validate against at least one of the schemas',
  'notOneOf': 'Value validated against multiples schemas',
  'enum': 'Value is not an enum type <%=value%>.',
  'enumNoArray': 'Schema enum property is not an array.',
  'unknownSchema': 'Unknown schema',
  
  // string
  'pattern': 'String does not match pattern <%=pattern%>.',
  'format': 'Value is not a valid <%=format%>',
  'unknownFormat': 'Format <%=format%> is unkown',
  'minLength': 'String has to be at least <%=minLength%> characters long.',
  'maxLength': 'String should not be longer than <%=maxLength%> characters.',

  // number
  'minimum': 'Number is less than minimum <%=minimum%>.',
  'maximum': 'Number is greater than maximum <%=maximum%>.',
  'exclusiveMinimum': 'Number is less than or equal to exclusive minimum <%=exclusiveMinimum%>.',
  'exclusiveMaximum': 'Number is greater than or equal to exclusive maximum <%=exclusiveMaximum%>.',
  'multipleOf': 'Number should be a multiple of <%=multipleOf%>',

  // object
  'minProperties': 'Object should have at least <%=minProperties%> properties.',
  'maxProperties': 'Object should have not more than <%=maxProperties%> properties.',
  'dependency': 'Property does not meet dependency.',
  'dependencyNoProp': 'Property of dependency does not exist.',
  'required': 'Required property does not exist.',
  'additionalProperties': 'Additional property is not allowed.',

  // array
  'minItems': 'Array should have at least <%=minItems%> items.',
  'maxItems': 'Array should not have more than <%=maxItems%> items.',
  'uniqueItems': 'Array is not unique.',

  // subschema
  '$ref': 'Subschema not found'
};


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
  'host-name': /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])/,
  'utc-millisec': /^\d+$/,
  'regex': {
    test: function (value) {
      try { var re = new RegExp(value); }
      catch (e) { return false }
      return true;
    }
  },
  // non standard
  url: /^(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?$/
};


function addError(errors, schema, value, path, options, msgId) {
  var ctx = _.extend({}, schema, {value: value});
  var msg = _.template(messages[msgId], ctx);
  var err = { path: path, message: msg };

  if (options.onError) {
    options.onError(err, schema, value, path);
  }

  errors.push(err);
  return errors;
}


function addErrors(errors, newErrors) {
  _.each(newErrors, function(error) { errors.push(error); });
  return errors;
}


var validators = {

  'boolean': function(schema, bool, path, options) {
    if (!_.isBoolean(bool)) {
      return addError([], schema, bool, path, options, 'type');
    }
    return [];
  },

  
  'string': function(schema, string, path, options) {
    var errors = [];
    if (!_.isString(string)) {
      return addError(errors, schema, string, path, options, 'type');
    }
    if (schema.pattern && !(new RegExp(schema.pattern)).test(string)) {
      return addError(errors, schema, string, path, options, 'pattern');
    }
    if (schema.format && options.validateFormat) {
      if (!formats[schema.format]) {
        addError(errors, schema, string, path, options, 'unknownFormat');
      }
      else if (!formats[schema.format].test(string)) {
        addError(errors, schema, string, path, options, 'format');
      }
    }
    if (schema.hasOwnProperty('minLength') && string.length < schema.minLength) {
      addError(errors, schema, string, path, options, 'minLength');
    }
    if (schema.hasOwnProperty('maxLength') && string.length > schema.maxLength) {
      addError(errors, schema, string, path, options, 'maxLength');
    }
    return errors;
  },

  
  'number': function(schema, number, path, options) {
    var errors = [];
    if (!_.isNumber(number)) {
      return addError(errors, schema, number, path, options, 'type');
    }
    if (schema.hasOwnProperty('minimum')) {
      if (schema.exclusiveMinimum && number <= schema.minimum) {
        addError(errors, schema, number, path, options, 'exclusiveMinimum');
      }
      else if (number < schema.minimum) {
        addError(errors, schema, number, path, options, 'minimum');
      }
    }
    if (schema.hasOwnProperty('maximum')) {
      if (schema.exclusiveMaximum && number >= schema.maximum) {
        addError(errors, schema, number, path, options, 'exclusiveMaximum');
      }
      else if (number > schema.maximum) {
        addError(errors, schema, number, path, options, 'maximum');
      }
    }
    if (schema.hasOwnProperty('multipleOf') && number % schema.multipleOf !== 0) {
      addError(errors, schema, number, path, options, 'multipleOf');
    }
    return errors;
  },

  
  'integer': function(schema, integer, path, options) {
    var errors = [];
    if (!_.isNumber(integer)) {
      return addError(errors, schema, integer, path, options, 'type');
    }
    if (Math.ceil(integer) !== integer) {
      addError(errors, schema, integer, path, options, 'type');
    }
    addErrors(errors, validators['number'](schema, integer, path, options));
    return errors;
  },

  
  'object': function(schema, object, path, options) {
    var errors = [];
    if (!_.isObject(object) || _.isArray(object)) {
      return addError(errors, schema, object, path, options, 'type');
    }

    // validate min/max
    
    if (schema.minProperties && _.keys(object).length < schema.minProperties) {
      addError(errors, schema, object, path, options, 'minProperties');
    }
    if (schema.maxProperties && _.keys(object).length > schema.maxProperties) {
      addError(errors, schema, object, path, options, 'maxProperties');
    }
    
    // validate dependencies
    
    if (schema.dependencies) {
      _.each(schema.dependencies, function(dependency, key) {
        if (!object.hasOwnProperty(key)) {
          addError(errors, schema, object, path + '.' + key, 
                   options, 'dependencyNoProp');
        }
        if (_.isArray(dependency)) {
          // validate property name array dependency
          _.each(dependency, function(depProp) {
            if (!object.hasOwnProperty(depProp)) {
              addError(errors, schema, object, path + '.' + key, options, 'dependency');
            }
          });
        }
        else if (_.isObject(dependency)) {
          // validate schema dependency
          addErrors(errors, validate(dependency, object, path, options));
        }
      });
    }

    // validate required
    
    if (schema.required) {
      _.each(schema.required, function(reqProp) {
        if (!object.hasOwnProperty(reqProp)) {
          addError(errors, schema, object, path + '.' + reqProp, options,
                   'required', {property: reqProp});
        }
      });
    }

    var pattern = schema.patternProperties ? _.keys(schema.patternProperties) : [];
    var additionalAllowed = options.additionalProperties;
    if (schema.hasOwnProperty('additionalProperties')) {
      additionalAllowed = !!schema.additionalProperties;
    }
    
    // validate properties, additionalProperties and patternProperties
    
    _.each(object, function(value, key) {
      // omit property names defined in the options
      if (options.omitProperties && options.omitProperties.indexOf(key) !== -1) {
        return;
      }

      // validate properties

      if (schema.properties && schema.properties[key]) {
        addErrors(errors, validate(schema.properties[key], value, path + '.' + key, options));
        return;
      }

      // validate pattern properties

      for (var i = 0; i < pattern.length; ++i) {
        if (key.match(new RegExp(pattern[i]))) {
          addErrors(errors, validate(schema.patternProperties[pattern[i]], value, path, options));
          return;
        }
      }

      // validate additional properties

      if (!additionalAllowed) {
        addError(errors, schema, object, path + '.' + key, options, 'additionalProperties');
      }
      else if (schema.additionalProperties && schema.additionalProperties[key]) {
        addErrors(errors, validate(schema.additionalProperties[key],
                                   value, path + '.' + key, options));
      }
    });
    return errors;
  },

  
  'array': function(schema, array, path, options) {
    var errors = [];
    if (!_.isArray(array)) {
      return addError(errors, schema, array, path, options, 'type');
    }

    // validate min/max

    if (schema.hasOwnProperty('minItems') && array.length < schema.minItems) {
      addError(errors, schema, array, path, options, 'minItems');
    }
    if (schema.hasOwnProperty('maxItems') && array.length > schema.maxItems) {
      addError(errors, schema, array, path, options, 'maxItems');
    }

    // validate unique items

    if (schema.uniqueItems) {
      var cache = {};
      _.each(array, function(item, i) {
        var str = JSON.stringify(item);
        if (cache[str]) {
          addError(errors, schema, array, path, options, 'uniqueItems');
          return;
        }
        cache[str] = true;
      });
    }
    
    // validate items and additionalItems
    
    if (schema.items && _.isObject(schema.items)) {
      _.each(array, function(item, i) {

        // validate items

        var errs = null;
        if (_.isArray(schema.items)) {
          // treat items as array of schema objects - array tuple validation
          if (i < schema.items.length) {
            errs = validate(schema.items[i], item, path + '[' + i + ']', options);
            if (errs.length === 0) {
              return;
            }
          }
        }
        else {
          // treat items as schema object
          errs = validate(schema.items, item, path + '[' + i + ']', options);
          if (errs.length === 0) {
            return;
          }
        }

        // validate additional items

        if (schema.hasOwnProperty('additionalItems') || !options.additionalItems) {
          if (_.isObject(schema.additionalItems)) {
            // validate against additional items
            var addErrs = validate(schema.additionalItems, item, path + '[' + i + ']', options);
            if (addErrs.length > 0) {
              // show errors from items
              addErrors(errors, errs);
            }
          }
          else if (!schema.additionalItems || !options.additionalItems) {
            // no additional items allowed
            addErrors(errors, errs);
          }
        }
      });
    }

    return errors;
  },

  
  'null': function(schema, value, path, options) {
    if (value !== null) {
      return addError([], schema, value, path, options, 'type');
    }
    return [];
  },

  
  'any': function(schema, value, path, options) {
    return [];
  },


  'enum': function(schema, value, path, options) {
    if (!_.isArray(schema.enum)) {
      return addError([], schema, value, path, options, 'enumNoArray');
    }
    // compare enum values on string basis
    var vstr = JSON.stringify(value);
    var strs = _.map(schema.enum, JSON.stringify);
    
    if (strs.indexOf(vstr) === -1) {
      return addError([], schema, value, path, options, 'enum');
    }
    return [];
  },
  
  
  'allOf': function(schema, value, path, options) {
    var errors = [];
    _.each(schema.allOf, function(schema) {
      addErrors(errors, validate(schema, value, path, options));
    });
    return errors;
  },


  'anyOf': function(schema, value, path, options) {
    var valid = false;
    _.each(schema.anyOf, function(schema) {
      var localErrors = validate(schema, value, path, options);
      valid = localErrors.length === 0 ? true : valid;
    });
    if (!valid) {
      return addError([], schema, value, path, options, 'anyOf');
    }
    return [];
  },

  
  'oneOf': function(schema, value, path, options) {
    var numValid = 0;
    _.each(schema.oneOf, function(schema) {
      var localErrors = validate(schema, value, path, options);
      if (localErrors.length === 0) numValid++;
    });
    if (numValid === 0) {
      return addError([], schema, value, path, options, 'oneOf');
    }
    if (numValid > 1) {
      return addError([], schema, value, path, options, 'notOneOf');
    }
    return [];
  },


  'type': function(schema, value, path, options) {
    var errors = [];
    if (_.isArray(schema.type)) {
      // union type
      var valid = false;
      _.each(schema.type, function(type) {
        if (validators[type]) {
          var localErrors = validators[type](schema, value, path, options);
          if (localErrors.length === 0) {
            valid = true;
            return;
          }
        }
        else {
          addError(errors, schema, value, path, options, 'unknownType');
        }
      });
      if (!valid) {
        addError(errors, schema, value, path, options, 'unionTypeNotValid');
      }
    }
    else {
      // simple type
      if (validators[schema.type]) {
        addErrors(errors, validators[schema.type](schema, value, path, options));
      }
      else {
        addError(errors, schema, value, path, options, 'unknownType');
      }
    }
    return errors;
  },

  
  '$ref': function(schema, value, path, options) {
    var errors = [];
    var subSchema = options.definitions[schema.$ref];
    if (!subSchema) {
      addError(errors, schema, value, path, options, '$ref');
    }
    else {
      addErrors(errors, validate(subSchema, value, path, options));
    }
    return errors;
  },


  'unkown': function(schema, value, path, options) {
    return addError([], schema, value, path, options, 'unknownSchema');
  }
};


function iterateSchema(handlers, args) {
  var schema = args[0];
  
  // infer type
  if (!schema.type) {
    if (schema.properties) {
      schema.type = 'object';
    }
    else if (schema.items) {
      schema.type = 'array';
    }
  }

  if (schema.enum) {
    return handlers['enum'].apply(null, args);
  }
  else if (schema.oneOf) {
    return handlers['oneOf'].apply(null, args);
  }
  else if (schema.allOf) {
    return handlers['allOf'].apply(null, args);
  }
  else if (schema.anyOf) {
    return handlers['anyOf'].apply(null, args);
  }
  else if (schema.type) {
    return handlers['type'].apply(null, args);
  }
  else if (schema.$ref) {
    return handlers['$ref'].apply(null, args);
  }
  
  return handlers['unkown'].apply(null, args);
}


function validate(schema, value, path, options) {
  var args = Array.prototype.slice.call(arguments);
  return addErrors([], iterateSchema(validators, args));
}


// expose validate
module.exports = function(schema, data, options) {
  // empty schema is valid
  if (_.isEmpty(schema)) {
    return null;
  }
  
  var errors = [];
  var defaultOptions = {
    // always validate formats
    validateFormat: false,
    // allow/disallow additional properties when not specified otherwise
    additionalProperties: true,
    // allow/disallow additional items when not specified otherwise
    additionalItems: true,
    // array of property names to be omitted during validation
    omitProperties: null,
    // called on each error
    onError: null,
    // subschema definitions
    definitions: {}
  };

  _.extend(defaultOptions, options);
  // deviate from the spec and just lookup $ref value directly in the definitions
  _.extend(defaultOptions.definitions, schema.definitions);
  
  errors = validate(schema, data, '', defaultOptions);

  return errors.length > 0 ? errors : null;
};
