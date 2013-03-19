/*global describe it*/

var expect = require('chai').expect;
var validate = require('./index.js');

describe('Validation of JSON schema', function() {

  it('should validate empty schema with any object', function() {
    expect(validate(null, {foo: 'bar'})).to.be.null;
    expect(validate({}, {foo: 'bar'})).to.be.null;
  });

  it('should not be valid when it has errors', function() {
    expect(validate({type: 'string'}, 42)).to.not.be.null;
    expect(validate({type: 'string'}, 42)).to.be.a('array');
    expect(validate({type: 'string'}, 42).length).to.be.at.least(1);
  });

  describe('validate method options', function() {
    it('should respect the validateFormat option', function() {
      var schema = {type: 'string', format: 'email'},
          value = 'bess@gggg@hhh.com';
      expect(validate(schema, value)).to.be.null;
      expect(validate(schema, value, {validateFormat: true}).valid).to.not.be.null;
    });
    it('should respect the additionalProperties option', function() {
      var schema = {properties: {foo: {type: 'number'}}},
          value = {foo: 42, bar: ''};
      expect(validate(schema, value)).to.be.null;
      expect(validate(schema, value, {additionalProperties: false})).to.not.be.null;
    });
    it('should respect the additionalItems option', function() {
      var schema = {items: {type: 'string'}},
          value = ['', 2, 3];
      expect(validate(schema, value)).to.be.null;
      expect(validate(schema, value, {additionalItems: false})).to.not.be.null;
    });
    it('should omit properties while validating', function() {
      var schema = {properties: {foo: {type: 'string'}}},
          value = {foo: '', bar: 11};
      expect(validate(schema, value)).to.be.null;
      expect(validate(schema, value, {additionalProperties: false})).to.not.be.null;
      expect(validate(schema, value, {omitProperties: ['bar'], additionalItems: false}
                     )).to.be.null;
    });
    it('should call the onError callback on each error', function() {
      var cb = function(err, schema, value, path) {
    	err.hello = true;
      };
      var errors = validate({properties: {foo: {type: 'string'}, bar: {type: 'number'}}},
    						{foo: 42, bar: ''}, {onError: cb});
      expect(errors).to.not.be.null;
      expect(errors).to.be.a('array');
      expect(errors[0].hello).to.be.true;
      expect(errors[1].hello).to.be.true;
    });
  });

  describe('subschemas', function() {
    it('should resolve subschemas', function() {
      expect(validate({
        definitions: {
          'foo': { type: 'string' }, 'bar': { properties: { baz: { type: 'number' }}}
        },
        properties: {
          'one': { $ref: 'foo' },
          'two': { $ref: 'bar' }
        }
      }, {one: '', two: { baz: 42 }})).to.be.null;
    });
    it('should not validate when not matching subschema', function() {
      expect(validate({
        definitions: {
          'foo': { type: 'string' }, 'bar': { properties: { baz: { type: 'number' }}}
        },
        properties: {
          'one': { $ref: 'foo' },
          'two': { $ref: 'bar' }
        }
      }, {one: '', two: { baz: true }})).to.be.a('array');
    });
  });
  
  describe('5.1. number and integer', function() {
    describe('5.1.1. multipleOf', function() {
      it('should be a multiple of the value', function() {
        expect(validate({type: 'number', multipleOf: '3'}, 9)).to.be.null;
      });
      it('should not validate when not a multiple of the value', function() {
        expect(validate({type: 'number', multipleOf: '3'}, 5)).to.be.not.null;
      });
    });

    describe('5.1.2. maximum and exclusiveMaximum', function() {
      it('should not be greater then the maximum', function() {
        expect(validate({type: 'number', maximum: 3}, 3.0)).to.be.null;
        expect(validate({type: 'number', maximum: 3}, 2.5)).to.be.null;
        expect(validate({type: 'integer', maximum: 3}, 3)).to.be.null;
        expect(validate({type: 'integer', maximum: 3}, 2)).to.be.null;
      });
      it('should not validate when greater than the maximum', function() {
        expect(validate({type: 'number', maximum: 3}, 4.0)).to.not.be.null;
        expect(validate({type: 'integer', maximum: 3}, 4)).to.not.be.null;
      });

      it('should be less than the exclusive max', function() {
        expect(validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 2.9)).to.be.null;
        expect(validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 2)).to.be.null;
      });
      it('should not validate when equal to or greater than the exclusive max', function() {
        expect(validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 3.0)).to.not.be.null;
        expect(validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 3.5)).to.not.be.null;
        expect(validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 3)).to.not.be.null;
        expect(validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 4)).to.not.be.null;
      });
    });

    describe('5.1.3. minimum and exclusiveMinimum', function() {
      it('should not be less than the minimum', function() {
        expect(validate({type: 'number', minimum: 3.3}, 3.3)).to.be.null;
        expect(validate({type: 'number', minimum: 3.3}, 4)).to.be.null;
        expect(validate({type: 'integer', minimum: 3}, 3)).to.be.null;
        expect(validate({type: 'integer', minimum: 3}, 4)).to.be.null;
      });
      it('should not validate when less than the minimum', function() {
        expect(validate({type: 'number', minimum: 3.3}, 3.2)).to.not.be.null;
        expect(validate({type: 'integer', minimum: 3}, 2)).to.not.be.null;
      });

      it('should be greater than the exclusive minimum ', function() {
        expect(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 4.0)).to.be.null;
        expect(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 3.1)).to.be.null;
        expect(validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 4)).to.be.null;
      });
      it('should not validate when not greater than the exclusive minimum', function() {
        expect(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 3.0)).to.not.be.null;
        expect(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 2.5)).to.not.be.null;
        expect(validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 3)).to.not.be.null;
        expect(validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 2)).to.not.be.null;
      });
    });
  });


  describe('5.2. strings', function() {
    describe('5.2.1 maxLength', function() {
      it('should not exceed max length', function() {
        expect(validate({type: 'string', maxLength: 2}, 'fo')).to.be.null;
        expect(validate({type: 'string', maxLength: 2}, 'f')).to.be.null;
      });
      it('should not validate when exceeding max length', function() {
        expect(validate({type: 'string', maxLength: 2}, 'foo')).to.not.be.null;
      });
    });

    describe('5.2.2. minLength', function() {
      it('should be least min characters long', function() {
        expect(validate({type: 'string', minLength: 2}, 'fo')).to.be.null;
        expect(validate({type: 'string', minLength: 2}, 'foo')).to.be.null;
      });
      it('should not validate when not long enough', function() {
        expect(validate({type: 'string', minLength: 2}, 'f')).to.not.be.null;
      });
      
    });

    describe('5.2.3. pattern', function() {
      it('should match the pattern', function() {
        expect(validate({type: 'string', pattern: '^hello$'}, 'hello')).to.be.null;
      });
      it('should not validate when not matching the pattern', function() {
        expect(validate({type: 'string', pattern: '^hello$'}, 'hello world')).to.not.be.null;
      });
    });
  });

  describe('5.3. arrays', function() {
    describe('5.3.1. additionalItems and items', function() {
      it('should validate when no additional or items are given', function() {
        expect(validate({type: 'array'}, [1, 2, 3])).to.be.null;
      });
      it('should validate when additionalItems is true', function() {
        expect(validate({type: 'array', items: {type: 'string'}, additionalItems: true},
                        [1, 2, 3])).to.be.null;
      });
      it('should not validate when no additional items are allowed', function() {
        expect(validate({type: 'array',
                         items: {type: 'number'},
                         additionalItems: false},
                        [1, true, 3, ''])).to.not.be.null;
      });
      it('should validate with additional items schema', function() {
        expect(validate({type:'array',
                         items: {type: 'number'},
                         additionalItems: {type: 'boolean'}},
                        [1, false, 2])).to.be.null;
      });
      it('should validate a array with a additional item', function() {
        expect(validate({type: 'array',
                         additionalItems: {type: 'boolean'}},
                        [false, 1, false, ''])).to.be.null;
      });
      it('should validate a tuple array', function() {
        expect(validate({type: 'array',
                        items: [{type: 'number'}, {type: 'string'}, {type: 'boolean'}],
                        additionalItems: false},
                        [1, '', false])).to.be.null;
      });
      it('should not validate a invalid tuple array', function() {
        expect(validate({type: 'array',
                        items: [{type: 'number'}, {type: 'string'}, {type: 'boolean'}],
                        additionalItems: false},
                        [1, 2, true])).to.be.a('array');
      });
    });

    describe('5.3.2. maxItems', function() {
      it('should have not too many items', function() {
        expect(validate({type: 'array', maxItems: 3}, [1, 2])).to.be.null;
        expect(validate({type: 'array', maxItems: 3}, [1, 2, 3])).to.be.null;
      });
      it('should not validate when has too many items', function() {
        expect(validate({type: 'array', maxItems: 3}, [1, 2, 3, 4])).to.not.be.null;
      });
    });

    describe('5.3.3. minItems', function() {
      it('should have least min items', function() {
        expect(validate({type: 'array', minItems: 3}, [1, 2, 3])).to.be.null;
        expect(validate({type: 'array', minItems: 3}, [1, 2, 3, 4])).to.be.null;
      });
      it('should not validate when not has enough items', function() {
        expect(validate({type: 'array', minItems: 3}, [1, 2])).to.not.be.null;
      });
    });

    describe('5.3.4. uniqueItems', function() {
      it('should be unique', function() {
        expect(validate({type: 'array', uniqueItems: true}, [1, 2, 3])).to.be.null;
      });
      it('should not validate when not unique', function() {
        expect(validate({type: 'array', uniqueItems: true}, [1, 2, 2])).to.not.be.null;
      });
    });
  });


  describe('5.4. objects', function() {
    describe('5.4.1. maxProperties', function() {
      it('should have not too many properties', function() {
        expect(validate({type: 'object', maxProperties: 2}, {a: 1, b: 2})).to.be.null;
        expect(validate({type: 'object', maxProperties: 2}, {a: 1})).to.be.null;
      });
      it('should not validate when has too many properties', function() {
        expect(validate({type: 'object', maxProperties: 1}, {a: 1, b: 2})).to.not.be.null;
      });
    });
    describe('5.4.2. minProperties', function() {
      it('should have at least a minimum of properties', function() {
        expect(validate({type: 'object', minProperties: 1}, {a: 1, b: 2})).to.be.null;
        expect(validate({type: 'object', minProperties: 1}, {a: 1})).to.be.null;
      });
      it('should not validate when has not enough properties', function() {
        expect(validate({type: 'object', minProperties: 2}, {a: 1})).to.not.be.null;
      });
    });
    describe('5.4.3. required', function() {
      var schema = {type: 'object',
                    properties: {foo: {type: 'string'}, bar: {type: 'number'}},
                    required: ['foo', 'bar']
                   };
      it('should validate when required property is present', function() {
        expect(validate(schema, {foo: '', bar: 42})).to.be.null;
      });
      it('should not validate when required property is missing', function() {
        expect(validate(schema, {bar: 11})).to.not.be.null;
      });
    });
    describe('5.4.4.', function() {
      describe('properties', function() {
        var schema = {type: 'object', properties: {foo: {type: 'number'}, bar: {type: 'null'}}};

        it('should be valid', function() {
          expect(validate(schema, {foo: 42, bar: null})).to.be.null;
        });
        it('should be valid with additional properties not in the schema', function() {
          expect(validate(schema, {foo: 42, bar: null, baz: 'hello'})).to.be.null;
        });
        it('should not be valid when properties are of the wrong type', function() {
          expect(validate(schema, {foo: 42, bar: ""})).to.not.be.null;
        });
      });
      describe('additionalProperties', function() {
        var schema = {type: 'object',
                      properties: {foo: {type: 'number'}, bar: {type: 'null'}},
                      additionalProperties: {baz: {type: 'string'}}};

        it('should validate them', function() {
          expect(validate(schema, {foo: 42, bar: null, baz: ''})).to.be.null;
        });
        it('should not be valid if instance has wrong tyep', function() {
          expect(validate(schema, {foo: 'hello'})).to.not.be.null;
        });
      });
      describe('patternProperties', function() {
        var schema = {type: 'object',
                      additionalProperties: false,
                      patternProperties: {'^\\w+_bar$': {type: 'number'}}};

        it('should match', function() {
          expect(validate(schema, {foo_bar: 1, baz_bar: 2})).to.be.null;
        });
        it('should not match', function() {
          expect(validate(schema, {foo_bar: 1, bar_foo: 2})).to.not.be.null;
        });
      });
    });
    describe('5.4.5. dependencies', function() {
      var arraySchema = {type: 'object',
                         properties: {a: {type: 'string'}, b: {type: 'number'}},
                         dependencies: {a: ['b', 'c'], b: 'a', c: ['a', 'b']}};
      it('should validate object with simple array dependencies', function() {
        expect(validate(arraySchema, {a: '', b: 11, c: 12})).to.be.null;
      });
      it('should not validate object when simple array dependencies are not met', function() {
        expect(validate(arraySchema, {a: '', b: 11})).to.not.be.null;
      });

      var schemaSchema = {type: 'object',
                          properties: {a: {type: 'string'}, b: {type: 'number'}},
                          dependencies: {a: { properties: {b: {type: 'number', required: true}}}}};
      it('should validate object with schema dependency', function() {
        expect(validate(schemaSchema, {a: '', b: 11})).to.be.null;
      });
      it('should not validate object with schema dependency not met', function() {
        expect(validate(schemaSchema, {a: '', b: ''})).to.not.be.null;
      });
    });
  });

  describe('5.5. keywords for any instance', function() {
    describe('5.5.1. enum', function() {
      it('should validate a enum value', function() {
        expect(validate({type: 'string', 'enum': ['one', 'two']}, 'two')).to.be.null;
        expect(validate({type: 'number', 'enum': [1, 2]}, 1)).to.be.null;
        expect(validate({type: 'number', 'enum': [{foo: 1}, {bar: 2}]}, {foo: 1})).to.be.null;
      });
      it('should not validate a non existant enum value', function() {
        expect(validate({type: 'string', 'enum': ['one', 'two']}, 'three')).to.not.be.null;
        expect(validate({type: 'number', 'enum': [1, 2]}, 3)).to.not.be.null;
        expect(validate({type: 'number', 'enum': [{foo: 1}, {bar: 2}]}, {foo: 2})).to.not.be.null;
      });
    });
    describe('5.5.2. type', function() {
      it('should validate standard types', function() {
        expect(validate({type: 'string'}, '')).to.be.null;
        expect(validate({type: 'number'}, 3.3)).to.be.null;
        expect(validate({type: 'integer'}, 3)).to.be.null;
        expect(validate({type: 'boolean'}, true)).to.be.null;
        expect(validate({type: 'object'}, {})).to.be.null;
        expect(validate({type: 'array'}, [])).to.be.null;
        expect(validate({type: 'null'}, null)).to.be.null;
        expect(validate({type: 'any'}, 123)).to.be.null;
      });
      it('should not validate when value of wrong type', function() {
        expect(validate({type: 'string'}, 5)).to.not.be.null;
        expect(validate({type: 'number'}, '')).to.not.be.null;
        expect(validate({type: 'integer'}, true)).to.not.be.null;
        expect(validate({type: 'integer'}, 3.3)).to.not.be.null;
        expect(validate({type: 'boolean'}, null)).to.not.be.null;
        expect(validate({type: 'object'}, [])).to.not.be.null;
        expect(validate({type: 'array'}, {})).to.not.be.null;
        expect(validate({type: 'null'}, false)).to.not.be.null;
      });
      it('should validate union types', function() {
        expect(validate({type: ['string', 'number']}, '')).to.be.null;
        expect(validate({type: ['string', 'number']}, 42)).to.be.null;
      });
    });
    describe('5.5.3. allOf', function() {
      var schema = {allOf:[
        {properties: {foo: {type: 'string'}}},
        {properties: {bar: {type: 'number'}}}
      ]};
      it('should conform to all schemas', function() {
        expect(validate(schema, {foo: '', bar: 42})).to.be.null;
      });
      it('should not validate when not conforming to all schemas', function() {
        expect(validate(schema, {foo: '', bar: false})).to.not.be.null;
      });
    });
    describe('5.5.3. anyOf', function() {
      var schema = {anyOf: [
        {properties: {foo: {type: 'string'}}, additionalProperties: false},
        {properties: {bar: {type: 'number'}}, additionalProperties: false},
        {properties: {baz: {type: 'boolean'}}, additionalProperties: false}
      ]};
      it('should conform to any schema', function() {
        expect(validate(schema, {foo: ''})).to.be.null;
        expect(validate(schema, {bar: 42})).to.be.null;
        expect(validate(schema, {baz: true})).to.be.null;
      });
      it('should not validate when no conforming to any schema', function() {
        expect(validate(schema, {foo: 13})).to.not.be.null;
        expect(validate(schema, {bar: ''})).to.not.be.null;
        expect(validate(schema, {baz: null})).to.not.be.null;
      });
    });
    describe('5.5.3. oneOf', function() {
      var schema = {oneOf: [
        {properties: {foo: {type: 'string'}, bar: {type: 'boolean'}}, additionalProperties: false},
        {properties: {foo: {type: 'string'}, bar: {type: 'any'}}, additionalProperties: false}
      ]};
      it('should conform to only one schema', function() {
        expect(validate(schema, {foo: '', bar: 'hello'})).to.be.null;
      });
      it('should not validate when more than one schema match', function() {
        expect(validate(schema, {foo: '', bar: true})).to.not.be.null;
        expect(validate(schema, {foo: 42, bar: true})).to.not.be.null;
      });
    });
  });


  describe('7.3. format', function() {
    it('should validate formats', function() {
      expect(validate({type: 'string', format: 'email'},
                      'jeff.bozo@bannn.co.hk', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'ip-address'},
                      '127.0.0.1', {validateFormat: true}
                      )).to.be.null;
      expect(validate({type: 'string', format: 'ipv6'},
                     '2001:0db8:85a3:08d3:1319:8a2e:0370:7344', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'date-time'},
                     '2011-03-12T08:04:10Z', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'date'},
                     '2011-21-01', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'time'},
                     '12:33:11', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'host-name'},
                     'cancada.org', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'color'},
                      '#FF0000', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'utc-millisec'},
                     '123', {validateFormat: true}
                     )).to.be.null;
      expect(validate({type: 'string', format: 'regex'},
                     "a", {validateFormat: true}
                     )).to.be.null;
      // non standard
      expect(validate({type: 'string', format: 'url'},
                     'http://hello.world.com', {validateFormat: true}
                     )).to.be.null;
    });
    it('should not validate invalid string formats', function() {
      expect(validate({type: 'string', format: 'email'},
                      'jeff.bozo@bannn@co.hk', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'ip-address'},
                      '127.0.0.0.1', {validateFormat: true}
                      )).to.not.be.null;
      expect(validate({type: 'string', format: 'ipv6'},
                     '2001:0db8:85a3:08d3:1319:8a2e:0370:7344:', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'date-time'},
                     '2011-03-12T08:04:10', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'date'},
                     '2011-021-01', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'time'},
                     '12:333:11', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'host-name'},
                     '99cancada.org', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'color'},
                      '#FF00000', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'utc-millisec'},
                     '-123', {validateFormat: true}
                     )).to.not.be.null;
      expect(validate({type: 'string', format: 'regex'},
                     "\\", {validateFormat: true}
                     )).to.not.be.null;
      // non standard
      expect(validate({type: 'string', format: 'url'},
                     'hello.world.com%asd', {validateFormat: true}
                     )).to.not.be.null;
    });
  });

});
