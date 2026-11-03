/** Small local-only vision board helpers. Photos are compressed before storage. */
export const VISION_DATA_URL_LIMIT = 120_000;
const VISION_EDGES = [720, 540, 400];

/** Longest side becomes maxEdge, preserving aspect ratio. Already-small photos stay unchanged. */
export function fittedSize(width, height, maxEdge) {
  if (!(width > 0) || !(height > 0) || !(maxEdge > 0)) throw new Error("Μη έγκυρες διαστάσεις εικόνας.");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

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
    for(const edge of VISION_EDGES){
      const {width,height}=fittedSize(image.naturalWidth,image.naturalHeight,edge);
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Η συμπίεση φωτογραφιών δεν υποστηρίζεται.");
      context.fillStyle="#fff";context.fillRect(0,0,width,height);
      context.drawImage(image,0,0,width,height);
      for(const quality of [.72,.56,.42,.3]){
        const dataUrl=canvas.toDataURL("image/jpeg",quality);
        if(dataUrl.length<=VISION_DATA_URL_LIMIT)return dataUrl;
      }
    }
    throw new Error("Η εικόνα παραμένει πολύ μεγάλη. Δοκίμασε μικρότερη.");
  }finally{URL.revokeObjectURL(url);}
}
