/** Small local-only vision board helpers. Photos are compressed before storage. */
export function currentVisionImage(vision, now=Date.now()){
  const images=vision?.images??[];
  if(!vision?.visible||!images.length)return null;
  const hours=[1,3,6,12,24].includes(vision.rotationHours)?vision.rotationHours:3;
  const index=vision.mode==="rotate"?Math.floor(now/(hours*3600000))%images.length:0;
  return images[index];
}
export async function compressVisionPhoto(file){
  if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12_000_000)
    throw new Error("Επίλεξε JPG, PNG ή WebP έως 12 MB.");
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    await new Promise((resolve,reject)=>{
      image.onload=resolve;image.onerror=()=>reject(new Error("Δεν ανοίγει η φωτογραφία."));image.src=url;
    });
    const scale=Math.min(1,850/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.floor(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.floor(image.naturalHeight*scale));
    const context=canvas.getContext("2d");
    if(!context)throw new Error("Η συμπίεση φωτογραφιών δεν υποστηρίζεται.");
    context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.8,.65,.5,.35]){
      const dataUrl=canvas.toDataURL("image/jpeg",quality);
      if(dataUrl.length<=240000)return dataUrl;
    }
    throw new Error("Η εικόνα παραμένει πολύ μεγάλη. Δοκίμασε μικρότερη.");
  }finally{URL.revokeObjectURL(url);}
}
