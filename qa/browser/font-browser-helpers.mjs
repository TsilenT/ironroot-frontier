export const FONT_FILES=[
  'barlow-condensed-latin-500.woff2','barlow-condensed-latin-600.woff2',
  'barlow-condensed-latin-700.woff2','barlow-condensed-latin-800.woff2',
  'dm-sans-latin-400-700.woff2',
];
export async function loadFontFaces(page){
  return page.evaluate(async()=>{
    const faces=[];
    for(const [family,weights] of [['Barlow Condensed',[500,600,700,800]],['DM Sans',[400,500,600,700]]]){
      for(const weight of weights){
        const loaded=await document.fonts.load(weight+' 32px "'+family+'"','Ironroot 0123456789');
        faces.push({family,weight,loaded:loaded.map(face=>({family:face.family,weight:face.weight,status:face.status}))});
      }
    }
    await document.fonts.ready;return faces;
  });
}
export function normalizeNotice(text){return text.replace(/\r\n/g,'\n').trim();}
