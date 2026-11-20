const PROMPT = `Kamu adalah asisten akademik yang menyusun modul belajar dari slide kuliah. Gunakan hanya informasi yang didukung teks PPT yang diberikan. Jangan mengarang fakta, angka, diagnosis, guideline, atau detail yang tidak terdapat di sumber. Jika ada bagian yang tidak tercakup, tulis bahwa PPT tidak menjelaskan bagian tersebut. Boleh menjelaskan ulang dengan bahasa sederhana, tetapi tandai penjelasan tambahan sebagai 'Penjelasan untuk memahami' dan jangan membuatnya tampak sebagai isi slide. Output harus berupa JSON valid dengan struktur: {title:string,subtitle:string,sections:[{heading:string,content:string[],bullets:string[],tables:[{headers:string[],rows:string[][]}]}],questions:[{stem:string,options:string[] (5 opsi A-E),answer:string (huruf pilihan),explanation:string}],memoryKit:string[]}. Buat ringkasan lengkap, berurutan mengikuti organisasi materi slide, mempertahankan istilah, membahas konsep yang relevan, serta tabel perbandingan berdasarkan materi. Buat tepat 15 vignette HOTS yang realistis dan hanya menguji materi slide; setiap soal punya opsi A-E, jawaban satu huruf, dan pembahasan termasuk alasan opsi benar. Sertakan tabel jika berguna. Quick Memory Kit berisi poin kunci/strategi pembeda, tanpa klaim baru. Hindari repetisi. Bahasa Indonesia jelas dan mudah dipelajari mahasiswa kedokteran.`;
export async function onRequestPost({request,env}){
  try{
    if(!env.GEMINI_API_KEY)return new Response(JSON.stringify({error:'API key belum dipasang. Admin perlu mengatur GEMINI_API_KEY pada Cloudflare Pages Settings → Variables and secrets.'}),{status:500,headers:{'Content-Type':'application/json'}});
    const body=await request.json(); const sources=body.sources||[];
    const slideText=sources.map(s=>`FILE: ${s.name}\n`+(s.slides||[]).map(sl=>`SLIDE ${sl.slide}: ${sl.text}`).join('\n')).join('\n\n');
    const prompt=`${PROMPT}\nNama modul yang diminta: ${body.moduleName||'Tentukan judul sesuai materi'}.\n\nSUMBER PPT:\n${slideText}`;
    const model=env.GEMINI_MODEL||'gemini-2.5-flash';
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.35,responseMimeType:'application/json'}})});
    const raw=await resp.json(); if(!resp.ok){return new Response(JSON.stringify({error:raw.error?.message||'Provider AI error'}),{status:resp.status,headers:{'Content-Type':'application/json'}})}
    let output=raw.candidates?.[0]?.content?.parts?.[0]?.text||''; output=output.replace(/^```json\s*/,'').replace(/```\s*$/,'');
    let data;try{data=JSON.parse(output)}catch{throw new Error('AI mengembalikan format yang tidak terbaca. Silakan coba lagi.')}
    if(!Array.isArray(data.questions)||data.questions.length<15)throw new Error('AI belum menghasilkan 15 soal. Silakan coba ulang.');
    data.questions=data.questions.slice(0,15);return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  }catch(e){return new Response(JSON.stringify({error:e.message||'Terjadi kesalahan'}),{status:500,headers:{'Content-Type':'application/json'}})}
}
