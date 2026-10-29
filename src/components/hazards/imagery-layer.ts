// NASA daily JPEG tiles use black fill where imagery is missing.
import L from "leaflet";
import { clearBlackFill } from "./map-display";
export class ImageryLayer extends L.TileLayer {
  constructor(url:string,options:L.TileLayerOptions) {
    super(url,options);
    this.on("tileunload",event=>{
      const tile=event.tile as HTMLElement & {cancel?:()=>void};
      tile.cancel?.();
    });
  }
  createTile(coords:L.Coords,done:L.DoneCallback):HTMLElement {
    const tile=document.createElement("canvas") as HTMLCanvasElement & {cancel?:()=>void};
    const size=this.getTileSize();tile.width=size.x;tile.height=size.y;
    const image=new Image();let stopped=false,frame=0;
    const finish=(error?:Error)=>{if(!stopped){stopped=true;if(error)tile.dataset.failed="true";done(error,tile);}};
    const timeout=window.setTimeout(()=>{image.src="";finish(new Error("Imagery timeout"));},20000);
    tile.cancel=()=>{stopped=true;clearTimeout(timeout);cancelAnimationFrame(frame);image.onload=null;image.onerror=null;image.src="";};
    image.crossOrigin="anonymous";
    image.onerror=()=>{clearTimeout(timeout);finish(new Error("Imagery unavailable"));};
    image.onload=()=>{
      clearTimeout(timeout);
      frame=requestAnimationFrame(()=>{
        if(stopped)return;
        try {
          const context=tile.getContext("2d",{willReadFrequently:true});
          if(!context)throw Error("Canvas unavailable");
          context.drawImage(image,0,0,size.x,size.y);
          const pixels=context.getImageData(0,0,size.x,size.y);
          tile.dataset.coverage=String(clearBlackFill(pixels.data));
          context.putImageData(pixels,0,0);
          finish();
        } catch {
          tile.getContext("2d")?.clearRect(0,0,size.x,size.y);
          finish(new Error("Imagery unavailable"));
        }
      });
    };
    image.src=this.getTileUrl(coords);
    return tile;
  }
}
