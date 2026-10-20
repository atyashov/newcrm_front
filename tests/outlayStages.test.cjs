const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vue = require('vue')
const {renderToString} = require('@vue/server-renderer')
const {parse,compileScript} = require('@vue/compiler-sfc')
const babel = require('@babel/core')
const read = file => fs.readFileSync(path.join(__dirname,'../src',file),'utf8')
const moduleFrom = file => import(`data:text/javascript;base64,${Buffer.from(read(file)).toString('base64')}`)
const descendants = node => [node,...(Array.isArray(node?.children) ? node.children.flatMap(descendants) : [])]

test('item-stage service sends only one real boolean and validates the response identity', async () => {
  const calls=[]
  const source=read('services/outlayTabsService.js').replace(/^import .*$/gm,'').replace(/export const /g,'const ')
  const api=new Function('apiPatch',`${source};return updateOutlayItemStage`)(async (...args)=>{
    calls.push(args)
    return {status:true,data:{item:{id:3,stages:{assembled:true}}}}
  })
  await api(10,3,'assembled',true)
  await api(10,3,'assembled',false)
  assert.deepEqual(calls[0],['admin/outlays/10/items/3/stages',{assembled:true},{notify:false}])
  assert.deepEqual(calls[1][1],{assembled:false})
  await assert.rejects(api(10,3,'unknown',true),/Некорректное/)
  await assert.rejects(api(10,3,'assembled','0'),/Некорректное/)
  await assert.rejects(api(10,999,'assembled',true),/некорректные статусы/)
})

const setupControl = async update => {
  const fields=await moduleFrom('views/components/outlayItemStages.js')
  const labels=await moduleFrom('views/components/outlayTabs.js')
  const {descriptor}=parse(read('components/OutlayItemStages.vue'))
  const source=compileScript(descriptor,{id:'stages',inlineTemplate:true}).content
  const {code}=babel.transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']})
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='vue'?vue:name.includes('outlayTabsService')?{updateOutlayItemStage:update,serverMessage:e=>e.message}:name.includes('outlayItemStages')?fields:labels,module,module.exports)
  const Component=module.exports.default
  let tree, render
  const events=[]
  const Wrapped={...Component,setup(props,context){render=Component.setup(props,context);return (...args)=>{tree=render(...args);return tree}}}
  const html=await renderToString(vue.createSSRApp({render:()=>vue.h(Wrapped,{outlayId:10,item:{id:3,stages:{assembled:false}},onUpdated:item=>events.push(item)})}))
  return {html,events,nodes:descendants(tree),render:()=>descendants(render({},[]))}
}

test('six accessible checkboxes save once per row and preserve confirmed state during the request',async()=>{
  let resolve,calls=0
  const control=await setupControl(()=>{calls++;return new Promise(done=>{resolve=done})})
  const inputs=control.nodes.filter(node=>node.type==='input')
  assert.equal(inputs.length,6)
  assert.equal((control.html.match(/type="checkbox"/g)||[]).length,6)
  const event={target:{checked:true}}
  const pending=inputs[0].props.onChange(event)
  assert.equal(event.target.checked,false)
  await inputs[1].props.onChange({target:{checked:true}})
  assert.equal(calls,1)
  resolve({id:3,stages:{assembled:true,updated_by:{id:7,login:'worker'}}})
  await pending
  assert.equal(control.events.length,1)
  assert.equal(control.events[0].stages.assembled,true)
})

test('failed stage updates keep the old check and display a local error; public snapshot has no controls',async()=>{
  const control=await setupControl(async()=>{throw new Error('Access denied')})
  const input=control.nodes.find(node=>node.type==='input')
  const event={target:{checked:true}}
  await input.props.onChange(event)
  assert.equal(event.target.checked,false)
  assert.equal(control.events.length,0)
  assert.ok(control.render().some(node=>node.type==='p'&&node.props?.role==='alert'))
  assert.equal(read('views/PublicOutlay.vue').includes('OutlayItemStages'),false)
  assert.ok(read('views/OutlayInfo.vue').includes('<OutlayProcessingTable'))
  assert.ok(read('components/OutlayProcessingTable.vue').includes('<OutlayItemStages'))
})
