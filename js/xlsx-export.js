(function(root){
 const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c}return t})();
 function crc32(bytes){let c=~0;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);return(~c)>>>0}
 function u16(n){const b=new Uint8Array(2);b[0]=n&255;b[1]=(n>>>8)&255;return b}
 function u32(n){const b=new Uint8Array(4);b[0]=n&255;b[1]=(n>>>8)&255;b[2]=(n>>>16)&255;b[3]=(n>>>24)&255;return b}
 function concat(parts){let n=0;for(const p of parts)n+=p.length;const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
 function zipStore(files){
  const enc=new TextEncoder();
  const locals=[];const centrals=[];let offset=0;
  files.forEach(file=>{
   const name=enc.encode(file.name);
   const data=typeof file.data==="string"?enc.encode(file.data):file.data;
   const crc=crc32(data);
   const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
   locals.push(local);
   const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
   centrals.push(central);
   offset+=local.length;
  });
  const central=concat(centrals);
  const end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0)]);
  return concat([...locals,central,end]);
 }
 function xmlText(value){return String(value??"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
 function colName(i){let n=i+1,s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
 function cellXml(r,c,value){
  const ref=colName(c)+r;
  if(typeof value==="number"&&Number.isFinite(value))return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlText(value)}</t></is></c>`;
 }
 function sheetXml(headers,rows){
  const body=[headers,...rows].map((row,i)=>{
   const r=i+1;
   return `<row r="${r}">${row.map((v,c)=>cellXml(r,c,v)).join("")}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
 }
 function workbookXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Workout" sheetId="1" r:id="rId1"/></sheets></workbook>`;
 }
 function buildXlsx(headers,rows){
  const files=[
   {name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`},
   {name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
   {name:"xl/workbook.xml",data:workbookXml()},
   {name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`},
   {name:"xl/worksheets/sheet1.xml",data:sheetXml(headers,rows)}
  ];
  return new Blob([zipStore(files)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 }
 async function saveXlsxFile(blob,filename){
  const file=new File([blob],filename,{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   try{await navigator.share({files:[file],title:filename});return true}catch(err){if(err&&err.name==="AbortError")return false}
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return true;
 }
 root.buildXlsx=buildXlsx;
 root.saveXlsxFile=saveXlsxFile;
})(typeof globalThis!=="undefined"?globalThis:this);
