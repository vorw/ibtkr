// A deliberately small, raster-only attachment. Never accept SVG, remote URLs,
// filenames or executable markup from an entry.
export const drawingByteLimit = 180_000;
export const drawingDataLimit = 240_023;
export function validDrawing(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > drawingDataLimit || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  try {
    const encoded=value.slice(23), raw=atob(encoded);
    if (btoa(raw)!==encoded || raw.length>drawingByteLimit || raw.length<100 || raw.charCodeAt(0)!==255 || raw.charCodeAt(1)!==216 || raw.charCodeAt(raw.length-2)!==255 || raw.charCodeAt(raw.length-1)!==217) return false;
    let offset=2, frame=false;
    while(offset<raw.length-2){
      if(raw.charCodeAt(offset++)!==255)return false;
      const marker=raw.charCodeAt(offset++);
      const length=raw.charCodeAt(offset)*256+raw.charCodeAt(offset+1);
      if(length<2||offset+length>raw.length-2)return false;
      if(marker===192||marker===194){
        const height=raw.charCodeAt(offset+3)*256+raw.charCodeAt(offset+4);
        const width=raw.charCodeAt(offset+5)*256+raw.charCodeAt(offset+6);
        if(length<8||raw.charCodeAt(offset+2)!==8||width<16||height<16||width>1400||height>1400)return false;
        frame=true;
      }
      if(marker===218)return frame;
      // Only ordinary JPEG metadata, quantization, Huffman tables and frames.
      if(![192,194,196,219,221,254].includes(marker)&&!(marker>=224&&marker<=239))return false;
      offset+=length;
    }
  } catch { return false; }
  return false;
}
