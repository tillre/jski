/*global describe it*/

var assert = require('assert');
var util = require('util');

var jski = require('./index.js');


describe('jski', function() {

  describe('5.1. number and integer', function() {

    it('should create the schema', function() {
      assert(jski.number().type === 'number');
    });

    it('should validate value', function() {
      assert(jski.number().validate(10).length === 0);
    });

    it('should not validate invalid value', function() {
      assert(jski.number().validate(true).length === 1);
    });

    it('should not validate float value as integer', function() {
      assert(jski.integer().validate(3.3).length === 1);
    });

    
    describe('5.1.1. multipleOf', function() {

      it('should be a multiple of', function() {
        assert(jski.number().multipleOf(3).validate(9).length === 0);
      });

      it('should not validate when not a multiple of', function() {
        assert(jski.number().multipleOf(3).validate(5).length === 1);
      });
    });

    
    describe('5.1.2. maximum', function() {

      it('should validate when equal or less', function() {
        assert(jski.number().maximum(3).validate(3).length === 0);
        assert(jski.number().maximum(3).validate(2).length === 0);
      });

      it('should not validate when greater', function() {
        assert(jski.number().maximum(3).validate(4).length === 1);
      });
    });


    describe('5.1.3. minimum', function() {

      it('should validate when equal or greater', function() {
        assert(jski.number().minimum(1).validate(1).length === 0);
        assert(jski.number().minimum(1).validate(2).length === 0);
      });

      it('should not validate when greater', function() {
        assert(jski.number().minimum(1).validate(0).length === 1);
      });
    });    
  });

  
  describe('5.2. strings', function() {

    var schema;

    it('should create the schema', function() {
      assert(jski.string().type === 'string');
    });

    it('should validate a value', function() {
      assert(jski.string().validate('foo').length === 0);
    });

    it('should not validate invalid value', function() {
      assert(jski.string().validate(11).length === 1);
    });


    describe('5.2.1 maxLength', function() {

      it('should not exceed max length', function() {
        assert(jski.string().maxLength(2).validate('fo').length === 0);
        assert(jski.string().maxLength(2).validate('f').length === 0);
      });

      it('should not validate when exceeding max length', function() {
        assert(jski.string().maxLength(2).validate('foo').length === 1);
      });
    });

    
    describe('5.2.2. minLength', function() {

      it('should be least min characters long', function() {
        assert(jski.string().minLength(3).validate('foo').length === 0);
        assert(jski.string().minLength(3).validate('fooo').length === 0);
      });

      it('should not validate when not long enough', function() {
        assert(jski.string().minLength(3).validate('fo').length === 1);
      });
    });

    
    describe('5.2.3. pattern', function() {

      it('should match the pattern', function() {
        assert(jski.string().pattern('^hello$').validate('hello').length === 0);
      });

      it('should not validate when not matching the pattern', function() {
        assert(jski.string().pattern('^hello$').validate('hello world').length === 1);
      });
    });
  });

  
  describe('5.3. arrays', function() {

    it('should create the schema', function() {
      assert(jski.array().type === 'array');
    });

    it('should validate anything whithout items specified', function() {
      assert(jski.array().validate([1, '1', true]).length === 0);
    });
    
    describe('5.3.1. additionalItems and items', function() {

      it('should validate the items', function() {
        assert(jski.array(jski.number()).validate([1, 2, 3]).length === 0);
      });

      it('should not validate when value not of type array', function() {
        assert(jski.array(jski.number()).validate(123).length === 1);
      });

      it('should validate when item has wrong type', function() {
        assert(jski.array(jski.number()).validate([true]).length === 0);
      });

      it('should not validate when item has wrong type and additional not allowed', function() {
        assert(jski.array(jski.number()).additionalItems(false).validate([true, '']).length > 0);
      });

      it('should validate a tuple', function() {
        assert(jski.array(
          jski.integer(), jski.string(), jski.boolean()
        ).validate([1, '1', true]).length === 0);
      });

      it('should not validate a invalid tuple', function() {
        assert(jski.array(
          jski.integer(), jski.string(), jski.boolean()
        ).validate([1, '1', 1]).length === 1);
      });
    });

    
    describe('5.3.2. maxItems', function() {
      
      it('should not have too many items', function() {
        assert(jski.array().maxItems(3).validate([1, 2]).length === 0);
        assert(jski.array().maxItems(3).validate([1, 2, 3]).length === 0);
      });

      it('should not validate when has too many items', function() {
        assert(jski.array().maxItems(2).validate([1, 2, 3]).length === 1);
      });
    });

    
    describe('5.3.3. minItems', function() {

      it('should have least min items', function() {
        assert(jski.array().minItems(2).validate([1, 2, 3]).length === 0);
        assert(jski.array().minItems(2).validate([1, 2]).length === 0);
      });

      it('should not validate when not has enough items', function() {
        assert(jski.array().minItems(2).validate([1]).length === 1);
      });
    });

    
    describe('5.3.4. uniqueItems', function() {

      it('should be unique', function() {
        assert(jski.array().uniqueItems(true).validate([1, 2, 3]).length === 0);
      });

      it('should not validate when not unique', function() {
        assert(jski.array().uniqueItems(true).validate([1, 2, 2]).length === 1);
      });
    });
  });

  
  describe('5.4. objects', function() {

    var schema;
    
    it ('should create the schema', function() {
      schema = jski.object({
        foo: jski.boolean(),
        bar: jski.string(),
        baz: jski.object({
          ban: jski.number()
        })
      });
      assert(schema.type === 'object');
    });

    it('should validate value', function() {
      assert(schema.validate({ foo: true, bar: 'hello', baz: { ban: 42 } }).length === 0);
    });

    it('should not validate invalid value', function() {
      assert(schema.validate({ foo: true, bar: 11, baz: { ban: 'boo' } }).length === 2);
    });

    describe('5.4.1. maxProperties', function() {

      it('should not have too many properties', function() {
        assert(jski.object().maxProperties(2).validate({a: 1, b: 2}).length === 0);
        assert(jski.object().maxProperties(2).validate({a: 1}).length === 0);
      });

      it('should not validate when has too many properties', function() {
        assert(jski.object().maxProperties(1).validate({a: 1, b: 2}).length === 1);
      });
    });

    
    describe('5.4.2. minProperties', function() {

      it('should have at least a minimum of properties', function() {
        assert(jski.object().minProperties(1).validate({a: 1, b: 2}).length === 0);
        assert(jski.object().minProperties(2).validate({a: 1, b: 2}).length === 0);
      });

      it('should not validate when has not enough properties', function() {
        assert(jski.object().minProperties(3).validate({a: 1, b: 2}).length === 1);
      });
    });

    
    describe('5.4.3. required', function() {
      
      var schema = jski.object({
        foo: jski.string(),
        bar: jski.number(),
        baz: jski.boolean()
      }).required('foo', 'bar');
      
      it('should validate when required property is present', function() {
        assert(schema.validate({foo: '', bar: 42}).length === 0);
      });

      it('should validate when non required property is present', function() {
        assert(schema.validate({foo: '', bar: 42, baz: true}).length === 0);
      });

      it('should not validate when required property is missing', function() {
        assert(schema.validate({bar: 42}).length === 1);
      });
    });

    
    describe('5.4.4.', function() {
      
      describe('properties', function() {

        var schema = jski.object({
          foo: jski.number(),
          bar: jski.boolean()
        });

        it('should validate', function() {
          assert(schema.validate({foo: 42, bar: false}).length === 0);
        });

        it('should validate with additional properties', function() {
          assert(schema.validate({foo: 42, bar: false, baz: ''}).length === 0);
        });

        it('should not validate when properties are of the wring type', function() {
          assert(schema.validate({foo: 42, bar: ''}).length === 1);
        });

        it('should not validate when no additional properties are allowed', function() {
          assert(schema
                 .additionalProperties(false)
                 .validate({foo: 42, bar: false, baz: ''}).length === 1);
        });
      });
    });
  });

  
  describe('5.5. keywords for any instance', function() {

    describe('5.5.1. enum', function() {

      it('should validate a primitive enum value', function() {
        assert(jski.enum(true, false).validate(false).length === 0);
        assert(jski.enum(1, 2, 3).validate(2).length === 0);
        assert(jski.enum('one', 'two').validate('two').length === 0);
      });

      it('should validate a object enum value', function() {
        assert(jski.enum({foo: 42}, {bar: 'baz'}).validate({foo: 42}).length === 0);
        assert(jski.enum([1, 2], ['one', 'two']).validate(['one', 'two']).length === 0);
      });

      it('should not validate a non existant enum value', function() {
        assert(jski.enum(true).validate(false).length === 1);
        assert(jski.enum(1, 2, 3).validate(4).length === 1);
        assert(jski.enum('one', 'two').validate('three').length === 1);
        assert(jski.enum({foo: 42}, {bar: 'baz'}).validate({foo: '42'}).length === 1);
        assert(jski.enum([1, 2], ['one', 'two']).validate(['one']).length === 1);
      });
    });

    
    describe('5.5.2. type', function() {

      it('should validate standard types', function() {
        assert(jski.string().validate('').length === 0);
        assert(jski.number().validate(11.1).length === 0);
        assert(jski.integer().validate(12).length === 0);
        assert(jski.boolean().validate(false).length === 0);
        assert(jski.object().validate({}).length === 0);
        assert(jski.array().validate([]).length === 0);
        assert(jski.null().validate(null).length === 0);
        assert(jski.any().validate('foo').length === 0);
      });
      
      it('should not validate when value is of wrong type', function() {
        assert(jski.string().validate(false).length === 1);
        assert(jski.number().validate('').length === 1);
        assert(jski.integer().validate(12.1).length === 1);
        assert(jski.boolean().validate(11).length === 1);
        assert(jski.object().validate([]).length === 1);
        assert(jski.array().validate({}).length === 1);
        assert(jski.null().validate({}).length === 1);
      });
    });
  });

  
  describe('5.5.3. allOf', function() {

    var schema = jski.allOf(
      jski.object({ foo: jski.number() }),
      jski.object({ bar: jski.string() })
    );
    
    it('should conform to all schemas', function() {
      assert(schema.validate({ foo: 42, bar: '' }).length === 0);
    });
    
    it('should not validate when not conforming to all schemas', function() {
      assert(schema.validate({ foo: 42, bar: true }).length === 1);
    });
  });

    
  describe('5.5.3. anyOf', function() {
    
    var schema = jski.anyOf(
      jski.object({ foo: jski.number() }),
      jski.object({ foo: jski.string() })
    );
    
    it('should be valid', function() {
      assert(schema.validate({ foo: 42 }).length === 0);
      assert(schema.validate({ foo: 'hello' }).length === 0);
    });
    
    it('should not be valid', function() {
      assert(schema.validate({ foo: true }).length === 1);
    });
  });

    
  describe('5.5.3. oneOf', function() {

    var schema = jski.oneOf(
      jski.object({ foo: jski.string(), bar: jski.boolean() }),
      jski.object({ foo: jski.string(), bar: jski.number() })
    );

    it('should conform to only one schema', function() {
      assert(schema.validate({foo: '', bar: true }).length === 0);
    });

    it('should not validate when more than one schema match', function() {
      assert(schema.validate({foo: ''}).length === 1);
    });
  });


  describe('7.3. format', function() {
    
    it('should validate formats', function() {
      assert(jski.string().format('email').validate('tim.tim@tom.co.hk').length === 0);
      assert(jski.string().format('ip-address').validate('127.0.0.1').length === 0);
      assert(jski.string().format('ipv6').validate('2001:0db8:85a3:08d3:1319:8a2e:0370:7344').length === 0);
      assert(jski.string().format('date-time').validate('2011-03-12T08:04:10Z').length === 0);
      assert(jski.string().format('date').validate('2011-21-01').length === 0);
      assert(jski.string().format('time').validate('12:33:11').length === 0);
      assert(jski.string().format('host-name').validate('canada.org').length === 0);
      assert(jski.string().format('color').validate('#ff0000').length === 0);
      assert(jski.string().format('utc-millisec').validate('123').length === 0);
      assert(jski.string().format('regex').validate('a').length === 0);
    });

    it('should validate non standard formats', function() {
      assert(jski.string().format('url').validate('https://localhost.com/bar/baz').length === 0);
      assert(jski.string().format('slug').validate('hello-world-whats-up').length === 0);
    });
    
    it('should not validate invalid string formats', function() {
      assert(jski.string().format('email').validate('tim.tim@tom@co.hk').length === 1);
      assert(jski.string().format('ip-address').validate('127.0.0.1.1').length === 1);
      assert(jski.string().format('ipv6').validate('2001:0db8:85a3:08d3:1319:8a2e:0370').length === 1);
      assert(jski.string().format('date-time').validate('2011-03-12TT08:04:10Z').length === 1);
      assert(jski.string().format('date').validate('2011-211-01').length === 1);
      assert(jski.string().format('time').validate('122:33:11').length === 1);
      assert(jski.string().format('host-name').validate('canada.org/foo/bar').length === 1);
      assert(jski.string().format('color').validate('#ff00000').length === 1);
      assert(jski.string().format('utc-millisec').validate('123m3').length === 1);
      assert(jski.string().format('regex').validate('\\').length === 1);
    });

    it('should not validate non standard invalid format', function() {
      assert(jski.string().format('url').validate('http:/localhost/asd').length === 1);
      assert(jski.string().format('slug').validate('-9hello-world-whats-up-').length === 1);
    });
  });


  describe('6.1 title and description', function() {

    it('should set title', function() {
      assert(jski.object().title('foo').toJSON().title === 'foo');
    });

    it('should set description', function() {
      assert(jski.object().description('foo').toJSON().description === 'foo');
    });
  });


  describe('6.2 default', function() {

    it('should set default', function() {
      assert(jski.object().default(123).toJSON().default === 123);
    });
  });

  
  describe('ref definitions', function() {

    var schema = jski.ref('foo');
    var definitions = {
      foo: jski.number()
    };

    it('should validate against the referenced schema', function() {
      assert(schema.validate(11, { definitions: definitions }).length === 0);
    });

    it('should not validate against the missing definition', function() {
      assert(schema.validate(11).length === 1);
    });

    it('should not validate when not matching referenced schema', function() {
      assert(schema.validate(true, { definitions: definitions }).length === 1);
    });

    it('should validate when ommiting refs', function() {
      assert(schema.validate(true, { definitions: definitions, omitRefs: true }).length === 0);
    });
  });


  describe('serialize', function() {

    var schemas = {

      boolean: [
        { schema: { type: 'boolean' },
          val: jski.boolean() }
      ],
      number: [
        { schema: { type: 'number' },
          val: jski.number() },
        { schema: { type: 'number', minimum: 1, maximum: 10, multipleOf: 2 },
          val: jski.number().minimum(1).maximum(10).multipleOf(2) }
      ],
      integer: [
        { schema: { type: 'integer' },
          val: jski.integer() }
      ],
      string: [
        { schema: { type: 'string' },
          val: jski.string() },
        { schema: { type: 'string', minLength: 1, maxLength: 10, pattern: '.*', format: 'email' },
          val: jski.string().minLength(1).maxLength(10).pattern('.*').format('email') }
      ],
      array: [
        { schema: { type: 'array' },
          val: jski.array() },
        { schema: { type: 'array', additionalItems: false, minItems: 1, maxItems: 10,
                    uniqueItems: true, items: { type: 'number' }},
          val: jski.array(jski.number()).minItems(1).maxItems(10).uniqueItems(true).additionalItems(false) },
        { schema: { type: 'array', items: [{ type: 'number'}, {type: 'string' }] },
          val: jski.array(jski.number(), jski.string()) }
      ],
      object: [
        { schema: { type: 'object' },
          val: jski.object() },
        { schema: { type: 'object', properties: { foo: { type: 'number' } },
                    minProperties: 1, maxProperties: 10, required: ['foo'], additionalProperties: false},
          val: jski.object({ foo: jski.number() }).minProperties(1).maxProperties(10)
          .required('foo').additionalProperties(false) }
      ],
      'enum': [
        { schema: { 'enum': [1, 2, 3] },
          val: jski.enum(1, 2, 3) },
        { schema: { 'enum': [1, 2, 3], foo: 'bar'},
          val: jski.enum(1, 2, 3).custom('foo', 'bar')}
      ],
      'null': [
        { schema: { type: 'null' },
          val: jski.null() }
      ],
      any: [
        { schema: { type: 'any' },
          val: jski.any() }
      ],
      allOf: [
        { schema: { allOf: [{ type: 'number'}, { type: 'string' }]},
          val: jski.allOf(jski.number(), jski.string()) },
        { schema: { allOf: [{ type: 'number'}, { type: 'string' }], foo: 'bar' },
          val: jski.allOf(jski.number(), jski.string()).custom('foo', 'bar') }
      ],
      anyOf: [
        { schema: { anyOf: [{ type: 'number'}, { type: 'string' }]},
          val: jski.anyOf(jski.number(), jski.string()) }
      ],
      oneOf: [
        { schema: { oneOf: [{ type: 'number'}, { type: 'string' }]},
          val: jski.oneOf(jski.number(), jski.string()) }
      ],
      ref: [
        { schema: { $ref: 'foo' },
          val: jski.ref('foo') },
        { schema: { $ref: 'foo', foo: 'bar' },
          val: jski.ref('foo').custom('foo', 'bar') }
      ]
    };

    describe('fromJSON', function() {
      Object.keys(schemas).forEach(function(key) {
        it('should create ' + key, function() {
          schemas[key].forEach(function(config) {
            assert.deepEqual(config.schema, jski.schema(config.schema).toJSON());
          });
        });
      });
    });
             
    describe('toJSON', function() {
      Object.keys(schemas).forEach(function(key) {
        it('should create ' + key, function() {
          schemas[key].forEach(function(config) {
            assert.deepEqual(config.schema, config.val.toJSON());
          });
        });
      });
    });
  });

  
  describe('custom attributes', function() {

    it('should add custom attributes', function() {
      assert.deepEqual(jski.object().custom('foo', 11).toJSON(), { type: 'object', foo: 11 });
    });

    it('should keep custom attributes from json schema', function() {
      assert.deepEqual(jski.schema({ type: 'object', foo: 11 }).toJSON(), { type: 'object', foo: 11 });
    });
  });


  describe('create value from schema', function() {

    var types = [
      { name: 'boolean',
        schema: { type: 'boolean' },
        value: true },
      { name: 'boolean default',
        schema: { type: 'boolean', default: false },
        value: false },
      { name: 'number',
        schema: { type: 'number' },
        value: 0 },
      { name: 'number default',
        schema: { type: 'number', default: 1.1 },
        value: 1.1 },
      { name: 'integer',
        schema: { type: 'integer' },
        value: 0 },
      { name: 'string',
        schema: { type: 'string' },
        value: '' },
      { name: 'string default',
        schema: { type: 'string', default: 'hello' },
        value: 'hello' },
      { name: 'enum',
        schema: { 'enum': [1, 2] },
        value: 1 },
      { name: 'enum default',
        schema: { 'enum': [1, 2], default: 2 },
        value: 2 },
      { name: 'ref',
        schema: { $ref: 'Foo' },
        value: {} },
      { name: 'ref default',
        schema: { $ref: 'Foo', default: { id: 'bar'} },
        value: { id: 'bar' } },
      { name: 'object',
        schema: { type: 'object' },
        value: {} },
      { name: 'object default',
        schema: { type: 'object', default: { foo: 'bar' } },
        value: { foo: 'bar'} },
      { name: 'object properties',
        schema: { type: 'object', properties: { foo: { type: 'string' } } },
        value: { foo: '' } },
      { name: 'array',
        schema: { type: 'array' },
        value: [] },
      { name: 'array default',
        schema: { type: 'array', default: [1, 2], value: [1, 2] },
        value: [1, 2] },
      { name: 'anyof',
        schema: { type: 'array', items: { anyOf: [] } },
        value: [] },
      { name: 'jski schema primitive',
        schema: jski.number(),
        value: 0 },
      { name: 'jski schema object',
        schema: jski.object({ foo: jski.boolean() }),
        value: { foo: true }}
    ];

    types.forEach(function(type) {

      it('should create value for ' + type.name, function() {
        assert(JSON.stringify(jski.createValue(type.schema)) === JSON.stringify(type.value));
      });
    });
  });
  
           
  describe('complex schema', function() {

    var schema = jski.object({
      title: jski.string(),
      tags: jski.array(jski.string()),
      image: jski.string().format('url'),
      sections: jski.array(
        jski.anyOf(
          jski.ref('HeaderSection'),
          jski.ref('TextSection'),
          jski.ref('ImageSection'),
          jski.ref('VideoSection'),
          jski.ref('TagSection')
        )
      ).additionalItems(false)
      
    }).required('title', 'image', 'sections')
      .additionalProperties(false);
    
    var definitions = {
      HeaderSection: jski.object({
        headline: jski.string(),
        subheadline: jski.string()
      }),
      TextSection: jski.string(),
      ImageSection: jski.object({
        caption: jski.string(),
        url: jski.string().format('url')
      }),
      VideoSection: jski.object({
        caption: jski.string(),
        embedCode: jski.string()
      }),
      TagSection: jski.array(jski.string())
    };
    
    var data = {
      title: 'Talk about foo',
      tags: ['a', 'b', 'c'],
      image: 'http://www.foo.com/bar.png',
      sections: [
        { headline: 'There you go', subheadline: 'Again' },
        'The text is the text is the text',
        { caption: 'balu', url: 'http://djungle.id/balu.jpg' },
        { caption: 'mogli', embedCode: 'foobarbaz' },
        ['uh', 'oh', 'ah']
      ]
    };

    it('should validate', function() {
      assert(schema.validate(data, { definitions: definitions }).length === 0);
    });

    it('should validate when added definitions', function() {
      schema.definitions(definitions);
      assert(schema.validate(data).length === 0);
    });
    
    it('should not validate', function() {
      data.sections.push(42);
      assert(schema.validate(data, { definitions: definitions }).length === 1);
    });
  });

  describe('validating schemas', function() {

    it('should validate another schema validator', function() {
      assert(jski.object({ type: jski.string() }).validate(jski.number()).length === 0);
    });
  });
});
