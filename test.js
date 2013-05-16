/*global describe it*/

var assert = require('assert');
var util = require('util');
var validate = require('./index.js');


describe('Validation of JSON schema', function() {

  it('should validate when schema is null', function() {
    var errs = validate(null, {foo: 'bar'});
    assert(!errs);
  });

  
  it('should validate when schema is empty object', function() {
    var errs = validate({}, {foo: 'bar'});
    assert(!errs);
  });

  
  it('should not validate with empty child schema', function() {
    var errs = validate(
      {properties: {foo: {type: 'string'}, bar: {}}},
      {foo: '', bar: 11}
    );
    assert(errs);
  });

  
  it('should return errors when validation fails', function() {
    var errs = validate({type: 'string'}, 42);
    assert(errs);
    assert(util.isArray(errs));
    assert(errs.length === 1);
  });

  
  describe('options', function() {

    it('should respect validateFormat', function() {
      var schema = {type: 'string', format: 'email'},
          value = 'bess@gggg@hhh.com';
      assert(validate(schema, value) === null);
      assert(validate(schema, value, { validateFormat: true }) !== null);
    });

    
    it('should respect additionalProperties', function() {
      var schema = {properties: {foo: {type: 'number'}}},
          value = {foo: 42, bar: ''};
      assert(!validate(schema, value));
      assert(validate(schema, value, {additionalProperties: false}));
    });

    
    it('should respect additionalItems', function() {
      var schema = {items: {type: 'string'}},
          value = ['', 2, 3];
      assert(!validate(schema, value));
      assert(validate(schema, value, {additionalItems: false}));
    });

    
    it('should respect omitProperties', function() {
      var schema = {properties: {foo: {type: 'string'}}},
          value = {foo: '', bar: 11};
      assert(!validate(schema, value));
      assert(validate(schema, value, { additionalProperties: false }));
      assert(!validate(schema, value, { omitProperties: ['bar'], additionalItems: false }));
    });

    
    it('should call onError', function() {
      var cb = function(err, schema, value, path) {
    	err.hello = true;
      };
      var errs = validate({ properties: {foo: {type: 'string'}, bar: {type: 'number'}} },
    					  { foo: 42, bar: '' }, { onError: cb });
      assert(errs);
      assert(util.isArray(errs));
      assert(errs[0].hello);
      assert(errs[1].hello);
    });
  });

  
  describe('subschemas', function() {

    it('should resolve subschemas', function() {
      var definitions = {
        'foo': { type: 'string' }, 'bar': { properties: { baz: { type: 'number' }}}
      };
      assert(
        !validate(
          { properties: {
            'one': { $ref: 'foo' },
            'two': { $ref: 'bar' }
          }},
          { one: '', two: { baz: 42 } },
          { definitions: definitions })
      );
    });


    it('should not validate when not matching subschema', function() {
      var definitions = {
        'foo': { type: 'string' }, 'bar': { properties: { baz: { type: 'number' }}}
      };
      assert(
        validate(
          { properties: {
            'one': { $ref: 'foo' },
            'two': { $ref: 'bar' }
          }},
          { one: '', two: { baz: true } },
          { definitions: definitions })
      );
    });


    it('should not validate when not finding subschema', function() {
      var definitions = {
        'foo': { type: 'string' }, 'bar': { properties: { baz: { type: 'number' }}}
      };
      assert(
        validate(
          { properties: {
            'one': { $ref: 'foo' },
            'two': { $ref: 'baz' }
          }},
          { one: '', two: { baz: true } },
          { definitions: definitions })
      );
    });
  });

  
  describe('5.1. number and integer', function() {
    
    describe('5.1.1. multipleOf', function() {

      it('should be a multiple of', function() {
        assert(!validate({type: 'number', multipleOf: '3'}, 9));
      });

      it('should not validate when not a multiple of', function() {
        assert(validate({type: 'number', multipleOf: '3'}, 5));
      });
    });


    describe('5.1.2. maximum and exclusiveMaximum', function() {

      it('should not be greater than the maximum', function() {
        assert(!validate({type: 'number', maximum: 3}, 3.0));
        assert(!validate({type: 'number', maximum: 3}, 2.5));
        assert(!validate({type: 'integer', maximum: 3}, 3));
        assert(!validate({type: 'integer', maximum: 3}, 2));
      });

      it('should not validate when greater than the maximum', function() {
        assert(validate({type: 'number', maximum: 3}, 4.0));
        assert(validate({type: 'integer', maximum: 3}, 4));
      });

      it('should be less than the exclusive max', function() {
        assert(!validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 2.9));
        assert(!validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 2));
      });

      it('should not validate when equal to or greater than the exclusive max', function() {
        assert(validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 3.0));
        assert(validate({type: 'number', maximum: 3, exclusiveMaximum: true}, 3.5));
        assert(validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 3));
        assert(validate({type: 'integer', maximum: 3, exclusiveMaximum: true}, 4));
      });
    });

    describe('5.1.3. minimum and exclusiveMinimum', function() {

      it('should not be less than the minimum', function() {
        assert(!validate({type: 'number', minimum: 3.3}, 3.3));
        assert(!validate({type: 'number', minimum: 3.3}, 4));
        assert(!validate({type: 'integer', minimum: 3}, 3));
        assert(!validate({type: 'integer', minimum: 3}, 4));
      });

      it('should not validate when less than the minimum', function() {
        assert(validate({type: 'number', minimum: 3.3}, 3.2));
        assert(validate({type: 'integer', minimum: 3}, 2));
      });

      it('should be greater than the exclusive minimum ', function() {
        assert(!validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 4.0));
        assert(!validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 3.1));
        assert(!validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 4));
      });

      it('should not validate when not greater than the exclusive minimum', function() {
        assert(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 3.0));
        assert(validate({type: 'number', minimum: 3, exclusiveMinimum: true}, 2.5));
        assert(validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 3));
        assert(validate({type: 'integer', minimum: 3, exclusiveMinimum: true}, 2));
      });
    });
  });


  describe('5.2. strings', function() {

    describe('5.2.1 maxLength', function() {

      it('should not exceed max length', function() {
        assert(!validate({type: 'string', maxLength: 2}, 'fo'));
        assert(!validate({type: 'string', maxLength: 2}, 'f'));
      });

      it('should not validate when exceeding max length', function() {
        assert(validate({type: 'string', maxLength: 2}, 'foo'));
      });
    });

    
    describe('5.2.2. minLength', function() {

      it('should be least min characters long', function() {
        assert(!validate({type: 'string', minLength: 2}, 'fo'));
        assert(!validate({type: 'string', minLength: 2}, 'foo'));
      });

      it('should not validate when not long enough', function() {
        assert(validate({type: 'string', minLength: 2}, 'f'));
      });
    });

    
    describe('5.2.3. pattern', function() {

      it('should match the pattern', function() {
        assert(!validate({type: 'string', pattern: '^hello$'}, 'hello'));
      });

      it('should not validate when not matching the pattern', function() {
        assert(validate({type: 'string', pattern: '^hello$'}, 'hello world'));
      });
    });
  });

  
  describe('5.3. arrays', function() {

    describe('5.3.1. additionalItems and items', function() {

      it('should validate when no additional or items are given', function() {
        assert(!validate({type: 'array'}, [1, 2, 3]));
      });
      
      it('should validate when additionalItems is true', function() {
        assert(!validate({type: 'array', items: {type: 'string'}, additionalItems: true}, [1, 2, 3]));
      });
      
      it('should not validate when no additional items are allowed', function() {
        assert(
          validate({type: 'array',
                    items: {type: 'number'},
                    additionalItems: false},
                   [1, true, 3, ''])
        );
      });
      
      it('should validate with additional items schema', function() {
        assert(
          !validate({type:'array',
                    items: {type: 'number'},
                    additionalItems: {type: 'boolean'}},
                    [1, false, 2])
        );
      });
      
      it('should not validate when not valid against additional item', function() {
        assert(
          validate({type: 'array',
                    items: {type: 'number'},
                    additionalItems: {type: 'boolean'}},
                   [1, false, ''])
        );
      });
      
      it('should validate a array with a additional item', function() {
        assert(
          !validate({type: 'array',
                    additionalItems: {type: 'boolean'}},
                   [false, 1, false, ''])
        );
      });
      
      it('should validate a tuple array', function() {
        assert(
          !validate({type: 'array',
                    items: [{type: 'number'}, {type: 'string'}, {type: 'boolean'}],
                    additionalItems: false},
                   [1, '', false])
        );
      });
      
      it('should not validate a invalid tuple array', function() {
        assert(
          validate({type: 'array',
                    items: [{type: 'number'}, {type: 'string'}, {type: 'boolean'}],
                    additionalItems: false},
                   [1, 2, true])
        );
      });
    });

    
    describe('5.3.2. maxItems', function() {
      
      it('should have not too many items', function() {
        assert(!validate({type: 'array', maxItems: 3}, [1, 2]));
        assert(!validate({type: 'array', maxItems: 3}, [1, 2, 3]));
      });

      it('should not validate when has too many items', function() {
        assert(validate({type: 'array', maxItems: 3}, [1, 2, 3, 4]));
      });
    });

    
    describe('5.3.3. minItems', function() {

      it('should have least min items', function() {
        assert(!validate({type: 'array', minItems: 3}, [1, 2, 3]));
        assert(!validate({type: 'array', minItems: 3}, [1, 2, 3, 4]));
      });

      it('should not validate when not has enough items', function() {
        assert(validate({type: 'array', minItems: 3}, [1, 2]));
      });
    });

    
    describe('5.3.4. uniqueItems', function() {

      it('should be unique', function() {
        assert(!validate({type: 'array', uniqueItems: true}, [1, 2, 3]));
      });

      it('should not validate when not unique', function() {
        assert(validate({type: 'array', uniqueItems: true}, [1, 2, 2]));
      });
    });
  });


  describe('5.4. objects', function() {

    describe('5.4.1. maxProperties', function() {

      it('should have not too many properties', function() {
        assert(!validate({type: 'object', maxProperties: 2}, {a: 1, b: 2}));
        assert(!validate({type: 'object', maxProperties: 2}, {a: 1}));
      });

      it('should not validate when has too many properties', function() {
        assert(validate({type: 'object', maxProperties: 1}, {a: 1, b: 2}));
      });
    });

    
    describe('5.4.2. minProperties', function() {

      it('should have at least a minimum of properties', function() {
        assert(!validate({type: 'object', minProperties: 1}, {a: 1, b: 2}));
        assert(!validate({type: 'object', minProperties: 1}, {a: 1}));
      });

      it('should not validate when has not enough properties', function() {
        assert(validate({type: 'object', minProperties: 2}, {a: 1}));
      });
    });

    
    describe('5.4.3. required', function() {

      var schema = {type: 'object',
                    properties: {foo: {type: 'string'}, bar: {type: 'number'}},
                    required: ['foo', 'bar']
                   };
      
      it('should validate when required property is present', function() {
        assert(!validate(schema, {foo: '', bar: 42}));
      });

      it('should not validate when required property is missing', function() {
        assert(validate(schema, {bar: 11}));
      });
    });

    
    describe('5.4.4.', function() {
      
      describe('properties', function() {
        
        var schema = {type: 'object', properties: {foo: {type: 'number'}, bar: {type: 'null'}}};

        it('should be valid', function() {
          assert(!validate(schema, {foo: 42, bar: null}));
        });
        
        it('should be valid with additional properties not in the schema', function() {
          assert(!validate(schema, {foo: 42, bar: null, baz: 'hello'}));
        });
        
        it('should not be valid when properties are of the wrong type', function() {
          assert(validate(schema, {foo: 42, bar: ""}));
        });
      });

      
      describe('additionalProperties', function() {

        var schema = {type: 'object',
                      properties: {foo: {type: 'number'}, bar: {type: 'null'}},
                      additionalProperties: {baz: {type: 'string'}}};

        it('should validate them', function() {
          assert(!validate(schema, {foo: 42, bar: null, baz: ''}));
        });

        it('should not be valid if instance has wrong tyep', function() {
          assert(validate(schema, {foo: 'hello'}));
        });
      });

      
      describe('patternProperties', function() {

        var schema = {type: 'object',
                      additionalProperties: false,
                      patternProperties: {'^\\w+_bar$': {type: 'number'}}};

        it('should match', function() {
          assert(!validate(schema, {foo_bar: 1, baz_bar: 2}));
        });

        it('should not match', function() {
          assert(validate(schema, {foo_bar: 1, bar_foo: 2}));
        });
      });
    });

    
    describe('5.4.5. dependencies', function() {

      var arraySchema = {type: 'object',
                         properties: {a: {type: 'string'}, b: {type: 'number'}},
                         dependencies: {a: ['b', 'c'], b: 'a', c: ['a', 'b']}};

      it('should validate object with simple array dependencies', function() {
        assert(!validate(arraySchema, {a: '', b: 11, c: 12}));
      });

      it('should not validate object when simple array dependencies are not met', function() {
        assert(validate(arraySchema, {a: '', b: 11}));
      });

      var schemaSchema = {type: 'object',
                          properties: {a: {type: 'string'}, b: {type: 'number'}},
                          dependencies: {a: { properties: {b: {type: 'number', required: true}}}}};

      it('should validate object with schema dependency', function() {
        assert(!validate(schemaSchema, {a: '', b: 11}));
      });

      it('should not validate object with schema dependency not met', function() {
        assert(validate(schemaSchema, {a: '', b: ''}));
      });
    });
  });


  describe('5.5. keywords for any instance', function() {

    describe('5.5.1. enum', function() {

      it('should validate a enum value', function() {
        assert(!validate({type: 'string', 'enum': ['one', 'two']}, 'two'));
        assert(!validate({type: 'number', 'enum': [1, 2]}, 1));
        assert(!validate({type: 'number', 'enum': [{foo: 1}, {bar: 2}]}, {foo: 1}));
      });

      it('should not validate a non existant enum value', function() {
        assert(validate({type: 'string', 'enum': ['one', 'two']}, 'three'));
        assert(validate({type: 'number', 'enum': [1, 2]}, 3));
        assert(validate({type: 'number', 'enum': [{foo: 1}, {bar: 2}]}, {foo: 2}));
      });

      it('should not validate when enum schema is no array', function() {
        assert(validate({type: 'string', 'enum': 11}, '11'));
      });
    });

    
    describe('5.5.2. type', function() {

      it('should validate standard types', function() {
        assert(!validate({type: 'string'}, ''));
        assert(!validate({type: 'number'}, 3.3));
        assert(!validate({type: 'integer'}, 3));
        assert(!validate({type: 'boolean'}, true));
        assert(!validate({type: 'object'}, {}));
        assert(!validate({type: 'array'}, []));
        assert(!validate({type: 'null'}, null));
        assert(!validate({type: 'any'}, 123));
      });
      
      it('should not validate when value of wrong type', function() {
        assert(validate({type: 'string'}, 5));
        assert(validate({type: 'number'}, ''));
        assert(validate({type: 'integer'}, true));
        assert(validate({type: 'integer'}, 3.3));
        assert(validate({type: 'boolean'}, null));
        assert(validate({type: 'object'}, []));
        assert(validate({type: 'array'}, {}));
        assert(validate({type: 'null'}, false));
      });

      it('should not validate unknown type', function() {
        assert(validate({type: 'foo'}, 11));
      });

      it('should validate union types', function() {
        assert(!validate({type: ['string', 'number']}, ''));
        assert(!validate({type: ['string', 'number']}, 42));
      });

      it('should not validate unkown union type', function() {
        assert(validate({type: ['number', 'foo']}, true));
      });
    });


    describe('5.5.3. allOf', function() {

      var schema = {allOf:[
        {properties: {foo: {type: 'string'}}},
        {properties: {bar: {type: 'number'}}}
      ]};
      
      it('should conform to all schemas', function() {
        assert(!validate(schema, {foo: '', bar: 42}));
      });
      
      it('should not validate when not conforming to all schemas', function() {
        assert(validate(schema, {foo: '', bar: false}));
      });
    });

    
    describe('5.5.3. anyOf', function() {
      
      var schema = {anyOf: [
        {properties: {foo: {type: 'string'}}, additionalProperties: false},
        {type: 'string'},
        {type: 'array', items: {type: 'boolean'}, additionalItems: false}
      ]};
      
      it('should be valid', function() {
        assert(!validate(schema, {foo: ''}));
        assert(!validate(schema, ''));
        assert(!validate(schema, [true, false]));
      });
      
      it('should not be valid', function() {
        assert(validate(schema, {foo: 13}));
        assert(validate(schema, 11));
        assert(validate(schema, [1, 2]));
      });
    });

    
    describe('5.5.3. oneOf', function() {

      var schema = {oneOf: [
        {properties: {foo: {type: 'string'}, bar: {type: 'boolean'}}, additionalProperties: false},
        {properties: {foo: {type: 'string'}, bar: {type: 'any'}}, additionalProperties: false}
      ]};

      it('should conform to only one schema', function() {
        assert(!validate(schema, {foo: '', bar: 'hello'}));
      });

      it('should not validate when more than one schema match', function() {
        assert(validate(schema, {foo: '', bar: true}));
        assert(validate(schema, {foo: 42, bar: true}));
      });
    });
  });


  describe('7.3. format', function() {
    
    it('should validate formats', function() {

      assert(!validate({type: 'string', format: 'email'},
                       'jeff.bozo@bannn.co.hk', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'ip-address'},
                       '127.0.0.1', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'ipv6'},
                       '2001:0db8:85a3:08d3:1319:8a2e:0370:7344', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'date-time'},
                       '2011-03-12T08:04:10Z', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'date'},
                       '2011-21-01', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'time'},
                       '12:33:11', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'host-name'},
                       'cancada.org', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'color'},
                       '#FF0000', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'utc-millisec'},
                       '123', {validateFormat: true}
                      ));
      assert(!validate({type: 'string', format: 'regex'},
                       "a", {validateFormat: true}
                      ));
      // non standard
      assert(!validate({type: 'string', format: 'url'},
                       'http://hello.world.com', {validateFormat: true}
                      ));
    });
    
    it('should not validate invalid string formats', function() {

      assert(validate({type: 'string', format: 'email'},
                      'jeff.bozo@bannn@co.hk', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'ip-address'},
                      '127.0.0.0.1', {validateFormat: true}
                      ));
      assert(validate({type: 'string', format: 'ipv6'},
                     '2001:0db8:85a3:08d3:1319:8a2e:0370:7344:', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'date-time'},
                     '2011-03-12T08:04:10', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'date'},
                     '2011-021-01', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'time'},
                     '12:333:11', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'host-name'},
                     '99cancada.org', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'color'},
                      '#FF00000', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'utc-millisec'},
                     '-123', {validateFormat: true}
                     ));
      assert(validate({type: 'string', format: 'regex'},
                     "\\", {validateFormat: true}
                     ));
      // non standard
      assert(validate({type: 'string', format: 'url'},
                     'hello.world.com%asd', {validateFormat: true}
                     ));
    });

    it('should not validate when format is unkown', function() {
      assert(validate({type: 'string', format: 'foo'},
                      'bar', {validateFormat: true}
                     ));
    });
  });

  describe('complex schema', function() {

    var schema = {

      title: 'Article',
      description: 'Some type of article.',
      
      properties: {
        'title': { type: 'string' },
        'tags': { type: 'array', items: { type: 'string' }},
        'image': { type: 'string', format: 'url' },
        'sections': {
          type: 'array',
          items: { anyOf: [
            { $ref: 'HeaderSection' },
            { $ref: 'TextSection' },
            { $ref: 'ImageSection' },
            { $ref: 'VideoSection' },
            { $ref: 'TagSection' }
          ]},
          additionalItems: false
        }
      },
      required: ['title', 'image', 'sections'],
      additionalProperties: false
    };

    var definitions = {
      HeaderSection: { properties: {
        headline: { type: 'string' },
        subheadline: { type: 'string' }
      }},
      TextSection: {
        type: 'string'
      },
      ImageSection: { properties: {
        caption: { type: 'string' },
        url: { type: 'string', format: 'url' }
      }},
      VideoSection: { properties: {
        caption: { type: 'string' },
        embedCode: { type: 'string' }
      }},
      TagSection: {
        type: 'array', items: { type: 'string' }
      }
    };
    
    var data = {
      title: 'Talk about foo',
      tags: ['a', 'b', 'c'],
      image: 'http://www.foo.com/bar.png',
      sections: [
        { headline: 'There you go', subheadline: 'Again' },
        'The text is the text is the text',
        { caption: 'balu', url: 'http://djungle.id/balu.jpg' },
        { caption: 'mogli', url: 'http://djungle.id/mogli.gif' },
        ['uh', 'oh', 'ah']
      ]
    };

    it('should validate', function() {
      assert(!validate(schema, data, { definitions: definitions }));
    });
    
    it('should not validate', function() {
      data.sections.push(42);
      assert(validate(schema, data));
    });
  });
});
