var test = require('tape')
var State = require('.')

test('sync-state',function(t){
  var state = null
  var test = null
  t.test('init',function(t){
    state = State()
    t.ok(state)
    t.end()
  })
  t.test('create state',function(t){
    t.ok(state.create('test'))
    t.end()
  })
  t.test('get state',function(t){
    test = state.get('test')
    t.ok(test)
    t.end()
  })
  t.test('test.set',function(t){
    var result = test.set('this.is.a.test',true)
    t.ok(result)
    t.end()
  })
  t.test('test.get',function(t){
    var result = test.get('this.is.a.test')
    t.ok(result)
    t.end()
  })
  t.test('test.delete',function(t){
    var result = test.delete('this.is.a.test')
    t.ok(result)
    t.notOk(test.get('this.is.a.test'))
    t.end()
  })
  t.test('test.set null key',function(t){
    var result = test.set(null,{test:true})
    t.ok(result)
    t.ok(test.get('test'))
    t.end()
  })
  t.test('test.get null',function(t){
    var result = test.get(null)
    t.ok(result)
    t.ok(result.test)
    t.end()
  })
  t.test('diff/patch',function(t){
    var s1 = State()
    var s2 = State()
    var t1 = s1.create('test')

    s1.on('change',s2.patch)
    t1.set('test',true)
    t1.set('flop',true)
    t1.delete('flop')
    t.deepEqual(t1.get(),s2.get('test').get())
    t.end()
  })
})
