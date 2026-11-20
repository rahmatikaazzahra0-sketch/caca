import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="topbar"><div class="brand"><span class="brand-mark">✦</span><span>CACA</span></div><span class="top-note">College Academic Companion & Assistant</span></header>
    <section class="hero"><div class="eyebrow">YOUR STUDY PARTNER ✧</div><h1>Ubah PPT kuliah menjadi<br><span>modul belajar yang jelas.</span></h1><p>Upload slide dosen, dapatkan ringkasan lengkap, tabel pembanding, latihan vignette HOTS, dan PDF yang siap dipelajari.</p></section>
    <section class="upload-card" id="uploadCard">
      <div class="upload-icon">⇧</div><h2>Masukkan materi kuliahmu</h2><p class="muted">Unggah file PowerPoint (.pptx). Bisa pilih beberapa file sekaligus.</p>
      <label class="dropzone" id="dropzone"><input id="fileInput" type="file" accept=".pptx" multiple hidden/><span class="upload-emoji">📚</span><strong>Tarik file ke sini atau <span>pilih file</span></strong><small>Format .pptx · Beberapa file sekaligus</small></label>
      <div id="fileList" class="file-list"></div>
      <div class="field-row"><label for="moduleName">Nama modul (opsional)</label><input id="moduleName" placeholder="Contoh: Blok Neurologi — Radicular Syndrome" /></div>
      <button id="generateBtn" class="primary" disabled>✨ Buat ringkasan & PDF</button>
      <p class="privacy-note">File PPT diproses untuk membuat ringkasan. Jangan upload data pasien, informasi pribadi, atau materi rahasia.</p>
    </section>
    <section id="statusBox" class="status hidden"><div class="spinner"></div><div><strong id="statusTitle">Menyiapkan materi…</strong><p id="statusText">Mohon tunggu. Proses bisa memerlukan beberapa menit.</p></div></section>
    <section id="result" class="result hidden"><div class="result-head"><div><div class="eyebrow">MODUL SELESAI ✧</div><h2 id="resultTitle">Ringkasan modul</h2><p class="muted">File PDF sudah dibuat.</p></div><button id="downloadBtn" class="primary download">↓ Download PDF</button></div><div class="preview" id="preview"></div><button id="downloadBtnBottom" class="primary">↓ Download PDF</button></section>
    <footer><span>CACA · Study smarter, understand deeper.</span><span>Free public access prototype</span></footer>
  </main>`;


const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const filesBox = document.getElementById('fileList');
const generateBtn = document.getElementById('generateBtn');
const statusBox = document.getElementById('statusBox');
const result = document.getElementById('result');
let chosenFiles = [];
let generatedPdfBlob = null;

function setFiles(files){ chosenFiles = [...files].filter(f=>f.name.toLowerCase().endsWith('.pptx'));
  filesBox.innerHTML = chosenFiles.map((f,i)=>`<div class="file-chip"><span>📄</span><span>${escapeHtml(f.name)}</span><small>${(f.size/1024/1024).toFixed(1)} MB</small><button aria-label="hapus" data-remove="${i}">×</button></div>`).join('');
  generateBtn.disabled = chosenFiles.length === 0;
}
fileInput.addEventListener('change',e=>setFiles(e.target.files));
dropzone.addEventListener('click',()=>fileInput.click());
['dragenter','dragover'].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.classList.add('dragging')}));
['dragleave','drop'].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();dropzone.classList.remove('dragging')}));
dropzone.addEventListener('drop',e=>setFiles(e.dataTransfer.files));
filesBox.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){chosenFiles.splice(Number(b.dataset.remove),1);setFiles(chosenFiles)}});
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function extractPptx(file){
  const zip=await JSZip.loadAsync(file); const slidePaths=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
  const slides=[];
  for(const path of slidePaths){const xml=await zip.files[path].async('text'); const texts=[...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m=>decodeXml(m[1])).filter(Boolean); slides.push({slide:path.match(/slide(\d+)/)[1],text:texts.join(' ')});}
  return {name:file.name,slides};
}
function decodeXml(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");}

generateBtn.addEventListener('click',async()=>{
  if(!chosenFiles.length)return;
  result.classList.add('hidden');statusBox.classList.remove('hidden');generateBtn.disabled=true;
  setStatus('Membaca slide PowerPoint…','Mengambil teks slide dan menyusunnya sesuai urutan.');
  try{
    const sources=[]; for(const f of chosenFiles){sources.push(await extractPptx(f));}
    const totalSlides=sources.reduce((n,s)=>n+s.slides.length,0);
    if(!totalSlides)throw new Error('Tidak berhasil menemukan teks di PPT. Pastikan file berisi slide teks dan berformat .pptx.');
    setStatus('AI sedang menyusun modul belajar…',`Menganalisis ${totalSlides} slide. Menyusun materi, tabel, dan 15 vignette HOTS.`);
    const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sources,moduleName:document.getElementById('moduleName').value})});
    const payload=await response.json(); if(!response.ok)throw new Error(payload.error||'Gagal membuat ringkasan.');
    setStatus('Menata PDF…','Menata heading, tabel, soal, dan pembahasan agar mudah dibaca.');
    generatedPdfBlob=createPdf(payload); renderPreview(payload); 
    document.getElementById('resultTitle').textContent=payload.title||'Ringkasan Modul';
    statusBox.classList.add('hidden');result.classList.remove('hidden');result.scrollIntoView({behavior:'smooth'});
  }catch(err){setStatus('Ada kendala',err.message);document.querySelector('.spinner').classList.add('error');}
  finally{generateBtn.disabled=chosenFiles.length===0;}
});
function setStatus(title,desc){document.getElementById('statusTitle').textContent=title;document.getElementById('statusText').textContent=desc;}

function renderPreview(d){
  const p=document.getElementById('preview');
  const esc=escapeHtml;
  p.innerHTML=`<h3>${esc(d.title||'Ringkasan Materi')}</h3>${(d.sections||[]).map(s=>`<article><h4>${esc(s.heading||'')}</h4><div class="preview-body">${(s.content||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${(s.bullets||[]).length?`<ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}${(s.tables||[]).map(t=>`<table><thead><tr>${t.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</div></article>`).join('')}
  <article><h4>15 Latihan Vignette HOTS</h4>${(d.questions||[]).slice(0,2).map((q,i)=>`<div class="question"><strong>${i+1}. ${esc(q.stem)}</strong><ul>${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ul><p><b>Jawaban:</b> ${esc(q.answer)}</p><p>${esc(q.explanation)}</p></div>`).join('')}<p class="muted">Preview menampilkan contoh soal. PDF akan memuat seluruh soal yang dibuat.</p></article>
  <article><h4>Quick Memory Kit</h4><ul>${(d.memoryKit||[]).map(m=>`<li>${esc(m)}</li>`).join('')}</ul></article>`;
}
function createPdf(d){
  const pdf=new jsPDF({unit:'mm',format:'a4'});const margin=15;const pageW=210;const pageH=297;let y=18;
  const navy=[36,49,72],lav=[104,84,174];
  function addHeader(){pdf.setFillColor(...navy);pdf.rect(0,0,pageW,11,'F');pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(255,255,255);pdf.text('CACA  |  MODUL BELAJAR',margin,7.3);}
  function footer(){const n=pdf.internal.getNumberOfPages();for(let i=1;i<=n;i++){pdf.setPage(i);pdf.setDrawColor(220,224,232);pdf.line(margin,pageH-12,pageW-margin,pageH-12);pdf.setFontSize(8);pdf.setTextColor(120);pdf.text('Ringkasan berdasarkan PPT yang diunggah',margin,pageH-7);pdf.text(`Halaman ${i}`,pageW-margin,pageH-7,{align:'right'});}}
  function check(needed=20){if(y+needed>pageH-18){pdf.addPage();addHeader();y=18;}}
  function title(text){check(15);pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.setTextColor(...navy);const lines=pdf.splitTextToSize(text,pageW-margin*2);pdf.text(lines,margin,y);y+=lines.length*7+3;}
  function sectionHead(text){check(12);pdf.setFillColor(...lav);pdf.rect(margin,y,pageW-margin*2,7,'F');pdf.setFontSize(10);pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.text(text,margin+2,y+4.8);y+=11;}
  function paragraph(text){pdf.setFont('helvetica','normal');pdf.setFontSize(9.5);pdf.setTextColor(40,45,55);const lines=pdf.splitTextToSize(text,pageW-margin*2);check(lines.length*4.6+2);pdf.text(lines,margin,y);y+=lines.length*4.6+2;}
  function bullets(items){items.forEach(it=>{const lines=pdf.splitTextToSize('• '+it,pageW-margin*2-2);check(lines.length*4.6+1);pdf.text(lines,margin+1,y);y+=lines.length*4.6+1;});}
  addHeader();title(d.title||'Ringkasan Modul Kuliah');if(d.subtitle)paragraph(d.subtitle);
  (d.sections||[]).forEach(s=>{sectionHead(s.heading||'Materi');(s.content||[]).forEach(paragraph);if(s.bullets?.length)bullets(s.bullets);(s.tables||[]).forEach(t=>{check(20);autoTable(pdf,{startY:y,head:[t.headers||[]],body:t.rows||[],margin:{left:margin,right:margin},theme:'grid',styles:{fontSize:7.5,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:navy,textColor:255},alternateRowStyles:{fillColor:[246,247,250]},rowPageBreak:'avoid',didDrawPage:()=>{}});y=pdf.lastAutoTable.finalY+5;});});
  sectionHead('LATIHAN VIGNETTE HOTS');(d.questions||[]).forEach((q,i)=>{const stem=`${i+1}. ${q.stem}`;const opts=(q.options||[]).join('\n');check(20);paragraph(stem);paragraph(opts);paragraph(`Jawaban: ${q.answer}`);paragraph(`Pembahasan: ${q.explanation}`);y+=2;});
  sectionHead('QUICK MEMORY KIT');bullets(d.memoryKit||[]);footer();return pdf.output('blob');
}
function downloadPdf(){if(!generatedPdfBlob)return;const a=document.createElement('a');a.href=URL.createObjectURL(generatedPdfBlob);a.download=(document.getElementById('moduleName').value.trim()||'CACA-Ringkasan-Modul').replace(/[^a-z0-9-_ ]/gi,'').replace(/\s+/g,'-')+'.pdf';a.click();URL.revokeObjectURL(a.href);}
document.getElementById('downloadBtn').addEventListener('click',downloadPdf);document.getElementById('downloadBtnBottom').addEventListener('click',downloadPdf);
