const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const vue=require('vue')
const {parse,compileScript}=require('@vue/compiler-sfc')
const babel=require('@babel/core')
const read=file=>fs.readFileSync(path.join(__dirname,'../src',file),'utf8')
const descendants=node=>[node,...(Array.isArray(node?.children)?node.children.flatMap(descendants):[])]

test('comments and notes use separate PATCH routes with one-field payloads, including clearing',async()=>{
  const calls=[]
  const source=read('services/outlayTabsService.js').replace(/^import .*$/gm,'').replace(/export const /g,'const ')
  const save=new Function('apiPatch',`${source};return updateOutlayText`)(async(...args)=>{
    calls.push(args)
    return {status:true,data:{item:args[0].endsWith('/comments')?{id:3,comments:{...args[1]}}:{id:10,work_notes:{...args[1]}}}}
  })
  await save(10,3,'assembly_comment','Ready')
  await save(10,3,'retrieve_comment',null)
  await save(10,null,'damage_loss_comment','Broken')
  assert.deepEqual(calls[0],['admin/outlays/10/items/3/comments',{assembly_comment:'Ready'},{notify:false}])
  assert.deepEqual(calls[1][1],{retrieve_comment:null})
  assert.deepEqual(calls[2][0],'admin/outlays/10/work-notes')
  assert.deepEqual(calls[2][1],{damage_loss_comment:'Broken'})
  await assert.rejects(save(10,3,'damage_loss_comment','Wrong scope'),/Некорректное/)
  await assert.rejects(save(10,null,'assembly_comment','Wrong scope'),/Некорректное/)
})

const control=async(save,value='')=>{
  const labels=await import(`data:text/javascript;base64,${Buffer.from(read('views/components/outlayTabs.js')).toString('base64')}`)
  const {descriptor}=parse(read('components/OutlayWorkText.vue'))
  const {code}=babel.transformSync(compileScript(descriptor,{id:'text',inlineTemplate:true}).content,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']})
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='vue'?vue:name.includes('outlayTabsService')?{updateOutlayText:save,serverMessage:e=>e.message}:labels,module,module.exports)
  let tree,render
  const events=[]
  const Component=module.exports.default
  const Wrapped={...Component,setup(props,context){render=Component.setup(props,context);return(...args)=>{tree=render(...args);return tree}}}
  const renderer=vue.createRenderer({
    createElement:type=>({type,children:[],props:{}}),createText:text=>({text}),createComment:text=>({text}),
    setText:(node,text)=>{node.text=text},setElementText:(node,text)=>{node.text=text},
    patchProp:(node,key,old,value)=>{node.props[key]=value},
    insert:(node,parent)=>{node.parent=parent;parent.children.push(node)},
    remove:node=>{if(node.parent)node.parent.children=node.parent.children.filter(child=>child!==node)},
    parentNode:node=>node.parent,nextSibling:()=>null,
  })
  const app=renderer.createApp({render:()=>vue.h(Wrapped,{outlayId:10,itemId:3,field:'assembly_comment',label:'Assembly',value,onUpdated:item=>events.push(item)})})
  app.mount({children:[]})
  return {nodes:descendants(tree),events,current:()=>descendants(render({},[])),dispose:()=>app.unmount()}
}

test('text saves on blur, skips unchanged values, and serializes an empty field as null',async()=>{
  const calls=[]
  let done
  const instance=await control((...args)=>{calls.push(args);return new Promise(resolve=>{done=resolve})},'Initial')
  const textarea=instance.nodes.find(node=>node.type==='textarea')
  await textarea.props.onBlur()
  assert.equal(calls.length,0)
  textarea.props.onInput({target:{value:''}})
  const pending=textarea.props.onBlur()
  await textarea.props.onBlur()
  assert.equal(calls.length,1)
  assert.deepEqual(calls[0],[10,3,'assembly_comment',null])
  done({id:3,comments:{assembly_comment:null,editors:{}}})
  await pending
  assert.equal(instance.events.length,1)
  instance.dispose()
})

test('failure preserves draft text for retry and keeps comments off the public page',async()=>{
  const instance=await control(async()=>{throw new Error('Server unavailable')})
  const textarea=instance.nodes.find(node=>node.type==='textarea')
  textarea.props.onInput({target:{value:'Unsaved work'}})
  await textarea.props.onBlur()
  assert.equal(instance.events.length,0)
  const nodes=instance.current()
  assert.equal(nodes.find(node=>node.type==='textarea').props.value,'Unsaved work')
  assert.ok(nodes.some(node=>node.type==='p'&&node.props?.role==='alert'))
  assert.ok(nodes.some(node=>node.type==='button'))
  assert.equal(read('views/PublicOutlay.vue').includes('OutlayWorkText'),false)
  instance.dispose()
})
