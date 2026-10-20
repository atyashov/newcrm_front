const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const read=file=>fs.readFileSync(path.join(__dirname,'../src',file),'utf8')
test('audit preserves server pagination/summary and passes the history filter',async()=>{
  const calls=[]
  const data={summary:{created:{user:null,at:'2026-10-01 10:00:00',source:'unknown'},last_edited:null,creator_changed:null},items:{data:[],current_page:2,per_page:20,total:25}}
  const source=read('services/outlayAuditService.js').replace(/^import .*$/gm,'').replace(/export const /g,'const ')
  const make=get=>new Function('apiGet','serverMessage',`${source};return fetchOutlayAudit`)(get,response=>response.message||'error')
  const fetch=make(async(...args)=>{calls.push(args);return {status:true,data}})
  assert.equal(await fetch(5,{page:2,page_size:20,event:'status_changed'}),data)
  assert.deepEqual(calls[0],['admin/outlays/5/audit',{page:2,page_size:20,event:'status_changed'}])
  await assert.rejects(make(async()=>({status:false,message:'Forbidden'}))(5),/Forbidden/)
  await assert.rejects(make(async()=>({status:true,data:{summary:{},items:[]}}))(5),/некорректный/)
})
test('audit labels distinguish unknown authors/system actions and initial status installation',async()=>{
  const {auditUser,auditDescription}=await import(`data:text/javascript;base64,${Buffer.from(read('views/components/outlayAudit.js')).toString('base64')}`)
  assert.equal(auditUser({source:'unknown',user:null}),'Пользователь неизвестен')
  assert.equal(auditUser({source:'system',user:null}),'Система')
  assert.equal(auditUser({source:'user',user:{login:'historical-login'}}),'historical-login')
  assert.equal(auditDescription({event:'status_changed',from_status:null,to_status:{id:1,title:'Новая'}}),'Установлен: Новая')
  assert.equal(auditDescription({event:'status_changed',from_status:{title:'Новая'},to_status:{title:'Собрана'}}),'Новая → Собрана')
  assert.equal(auditDescription({event:'creator_changed',from_creator:{login:'first'},to_creator:{login:'second'}}),'first → second')
})
