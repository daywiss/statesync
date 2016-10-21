var test = require('tape')
var State = require('.')

test('statesync',function(t){
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
    console.log(result)
    t.ok(result)
    t.ok(result.test)
    t.end()
  })
  t.test('delete state',function(t){
    state.delete('test')
    t.equal(state.get('test'),undefined)
    t.notOk(state.get('test'))
    t.ok(state.get('test1'))
    t.end()
  })
  // t.test('set null',function(t){
  //   var result = state.set()
  //   t.notOk(result)
  //   t.notOk(state.get('test1'))
  //   t.end()
  // })
  t.test('scope',function(t){
    var scope = null
    t.test('init',function(t){
      scope = state.scope('scope')
      t.ok(scope)
      t.end()
    })
    t.test('set/get',function(t){
      scope.set('child','child')
      t.equal(scope.get('child'),'child')
      t.equal(state.get('scope.child'),'child')
      t.equal(scope.get(),state.get('scope'))
      t.end()
    })
    t.test('delete',function(t){
      scope.delete('child')
      t.notOk(scope.get('child'))
      t.notOk(state.get('scope.child'))
      t.end()
    })
  })
  t.test('diff/patch',function(t){
    var s1Pointer = {}
    var s1 = State(s1Pointer)
    var s2 = State()

    s1.on('change',function(state,path,value){
      t.deepEqual(state,s1Pointer)
      t.ok(state === s1Pointer)
    })

    s1.on('diff',s2.patch)
    s2.on('diff',s1.patch)
    s1.set('s1',true)
    s2.set('s2',true)
    s1.set('blah',1)
    s2.set('blah',2)
    s1.delete('s2')
    t.equal(s1.get('blah'),2)
    t.deepEqual(s1.get(),s2.get())
    t.deepEqual(s1.get(),s1Pointer)
    t.end()
  })
  t.test('internal pointer',function(t){
    var ptr = {test:'test'}
    var state = State(ptr)
    // t.test('set root to null',function(t){
    //   t.equal(state.get('test'),'test')
    //   state.set()
    //   t.equal(ptr,state.get())
    //   t.end()
    // })
    t.test('delete root',function(t){
      t.equal(state.get('test'),'test')
      state.delete()
      t.equal(ptr,state.get())
      t.end()
    })
  })
  
})
