// Todo:
// -> check file limits, iOS headers and upload token authorization

// --- Evidence media checks ---
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
async function compile(path) {
  return ts.transpileModule(await readFile(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
}
const mediaUrl=dataUrl(await compile("../src/utils/evidenceMedia.ts"));
const { EVIDENCE_MAX_BYTES, inspectEvidenceFile, evidenceContentType }=await import(mediaUrl);
const upstream=dataUrl((await compile("../src/lib/api-upstream.ts")).replace(/import ["']server-only["'];?/,""));
const auth=dataUrl((await compile("../src/lib/upload-auth.ts")).replace('"./api-upstream"',JSON.stringify(upstream)));
const sdkUrl=pathToFileURL(createRequire(import.meta.url).resolve("@vercel/blob/client")).href;
const route=dataUrl((await compile("../src/app/api/evidence/upload/route.ts"))
  .replace('"@/lib/upload-auth"',JSON.stringify(auth)).replace('"@/utils/evidenceMedia"',JSON.stringify(mediaUrl)).replace('"@vercel/blob/client"',JSON.stringify(sdkUrl)));
const { POST }=await import(route);
const { getPayloadFromClientToken }=await import(sdkUrl);
const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
const ftyp=brand=>Uint8Array.from(Buffer.from(`\0\0\0\x18ftyp${brand}\0\0\0\0${brand}`));

test("each file accepts exactly 50 MB and rejects empty or larger content",async()=>{
  const file=new File([png,new Uint8Array(EVIDENCE_MAX_BYTES-png.length)],"large.png");
  assert.equal(await inspectEvidenceFile(file),"image/png");
  await assert.rejects(inspectEvidenceFile(new File([file,"x"],"large.png")),/FILE_TOO_LARGE/);
  await assert.rejects(inspectEvidenceFile(new File([],"empty.jpg")),/EMPTY_FILE/);
});
test("iPhone MOV and HEIC/HEIF are recognized even with an empty MIME type",async()=>{
  for(const [brand,type] of [["qt  ","video/quicktime"],["heic","image/heic"],["mif1","image/heif"],["M4V ","video/mp4"]])
    assert.equal(await inspectEvidenceFile(new File([ftyp(brand)],"camera-file")),type);
  assert.equal(evidenceContentType(new Uint8Array([26,69,223,163])),"video/webm");
  await assert.rejects(inspectEvidenceFile(new File(["<svg></svg>"],"photo.jpg",{type:"image/jpeg"})),/UNSUPPORTED_FILE/);
});

const account={id:"a".repeat(24),username:"Uploader",participation:"volunteer",session_context:"12345678-1234-4234-8234-123456789012"};
const path="bukti-lapangan/12345678-1234-4234-8234-123456789012.mov";
function uploadRequest(payload={},headers={}) {
  const info={size:EVIDENCE_MAX_BYTES,contentType:"video/quicktime",...payload};
  const body={type:"blob.generate-client-token",payload:{pathname:info.pathname||path,multipart:true,clientPayload:JSON.stringify(info)}};
  return new Request("http://localhost:3001/api/evidence/upload",{method:"POST",headers:{host:"localhost:3001",origin:"http://localhost:3001",cookie:"bp_session=fixture","x-session-context":account.session_context,...headers},body:JSON.stringify(body)});
}
test("direct tokens enforce an anonymous file path, content type, 50 MB limit and session",async()=>{
  process.env.NODE_ENV="test";process.env.API_UPSTREAM_URL="http://localhost:5000/api/v1";
  process.env.BLOB_READ_WRITE_TOKEN="vercel_blob_rw_unitstore_fixture-secret";
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({data:{user:account}});
  try {
    const response=await POST(uploadRequest());assert.equal(response.status,200);
    const token=(await response.json()).clientToken, limits=getPayloadFromClientToken(token);
    assert.equal(limits.maximumSizeInBytes,EVIDENCE_MAX_BYTES);
    assert.deepEqual(limits.allowedContentTypes,["video/quicktime"]);
    assert.equal(limits.allowOverwrite,false);
    assert.ok(limits.validUntil<=Date.now()+10*60_000);
    assert.equal(response.headers.get("cache-control"),"private, no-store");
    for(const payload of [{size:EVIDENCE_MAX_BYTES+1},{size:0},{contentType:"image/svg+xml"},{pathname:`bukti-lapangan/${account.id}/photo.mov`},{pathname:path.replace("bukti-lapangan","profiles")},{pathname:path.replace(".mov",".jpg")}])assert.equal((await POST(uploadRequest(payload))).status,400);
    assert.equal((await POST(uploadRequest({},{origin:"https://other.example"}))).status,403);
    assert.equal((await POST(uploadRequest({},{"x-session-context":"old-session"}))).status,409);
    assert.equal((await POST(uploadRequest({},{cookie:""}))).status,401);
    assert.equal((await POST(new Request("http://localhost:3001/api/evidence/upload",{method:"POST",body:"x".repeat(8193)}))).status,413);
  } finally { globalThis.fetch=original;delete process.env.BLOB_READ_WRITE_TOKEN; }
});
// --- end of Evidence media checks ---
