var test = require('tape')
var State = require('.')

test('sync-state',function(t){
  var state = null
  t.test('init',function(t){
    state = State()
    t.ok(state)
    t.end()
  })
  t.test('set',function(t){
    t.ok(state.set('test','test'))
    t.ok(state.set('test1','test1'))
    t.end()
  })
  t.test('get state',function(t){
    var result = state.get('test')
    t.equal('test',result)
    t.end()
  })
  t.test('get null',function(t){
    var result = state.get()
    t.ok(result)
    t.ok(result.test)
    t.end()
  })
  t.test('delete state',function(t){
    var result = state.delete('test')
    t.ok(result)
    t.notOk(state.get('test'))
    t.ok(state.get('test1'))
    t.end()
  })
  t.test('set null',function(t){
    var result = state.set()
    t.notOk(result)
    t.notOk(state.get('test1'))
    t.end()
  })
  t.test('scope',function(t){
    var test = null
    t.test('init',function(t){
      test = state.scope('test')
      t.ok(test)
      t.end()
    })
    t.test('set/get',function(t){
      test.set('child','child')
      t.equal(test.get('child'),'child')
      t.equal(state.get('test.child'),'child')
      t.end()
    })
    t.test('delete',function(t){
      test.delete('child')
      t.notOk(test.get('child'))
      t.notOk(state.get('test.child'))
      t.end()
    })
  })
  t.test('diff/patch',function(t){
    var s1 = State()
    var s2 = State()

    s1.on('diff',s2.patch)
    s2.on('diff',s1.patch)
    s1.set('s1',true)
    s2.set('s2',true)
    s1.set('blah',1)
    s2.set('blah',2)
    s1.delete('s2')
    t.equal(s1.get('blah'),2)
    t.deepEqual(s1.get(),s2.get())
    t.end()
  })
  
})
