// Pass-through browser instrumentation, not a canvas or application-state mock.
// This function is self-contained because Playwright serializes it into the page.
export function installCanvasObservation(){
    const proto=CanvasRenderingContext2D.prototype;
    // Normalize the renderer's two site colors through the same native Canvas
    // property as the observed draw (hex-alpha may read back as rgba()).
    const palette=document.createElement('canvas').getContext('2d'),siteColors=new Set();
    for(const color of ['#d0e7a67a','#52644733']){palette.strokeStyle=color;siteColors.add(palette.strokeStyle);}
    const CSS_STROKE_EPSILON=1e-6; // Native matrix/style roundoff only: one millionth CSS px.

    window.__qaCanvas={mini:null,battle:null};
    const originals=new Map();
    let mini=null,battle=null,path=[];
    for(const method of ['setTransform','moveTo','lineTo','stroke','fillRect','strokeRect','drawImage','fillText']){
      const original=proto[method];originals.set(method,original);
      proto[method]=function(...args){
        const id=this.canvas.id;
        if(id==='minimap'){
          if(method==='setTransform'){mini={lines:[],fills:[],viewport:null};path=[];}
          if(method==='moveTo')path=[args];
          if(method==='lineTo')path.push(args);
          if(method==='stroke'&&mini)mini.lines.push(path.map(point=>[...point]));
          if(method==='fillRect'&&mini)mini.fills.push({args:[...args],color:this.fillStyle});
          if(method==='strokeRect'&&mini){mini.viewport=[...args];window.__qaCanvas.mini=mini;}
        }
        if(id==='battle'){
          if(method==='setTransform'){battle={slots:[],slotStrokes:[],text:[],terrain:null,dpr:args[0]};window.__qaCanvas.battle=battle;}
          if(method==='strokeRect'&&battle&&args[2]===110&&args[3]===110){
            const transform=this.getTransform(),scale=transform.a/battle.dpr;
            // The real renderer guarantees at least one CSS pixel at small
            // world scales. Observe the delivered transform, not viewport size.
            const cssStrokeWidth=this.lineWidth*scale,expectedCssStrokeWidth=Math.max(1.5*scale,1);
            if(scale>0&&Number.isFinite(scale)&&transform.b===0&&transform.c===0&&transform.d===transform.a&&
              siteColors.has(this.strokeStyle)&&Math.abs(cssStrokeWidth-expectedCssStrokeWidth)<=CSS_STROKE_EPSILON){
              battle.slots.push([args[0]+55,args[1]+55]);
              battle.slotStrokes.push({x:args[0]+55,y:args[1]+55,scale,lineWidth:this.lineWidth,cssStrokeWidth,expectedCssStrokeWidth});
            }
          }
          if(method==='drawImage'&&battle&&!battle.terrain&&args[0] instanceof HTMLCanvasElement&&args.length===3)
            battle.terrain={width:args[0].width,height:args[0].height};
          if(method==='fillText'&&battle)battle.text.push({text:String(args[0]),font:this.font});
        }
        return original.apply(this,args);
      };
    }
    return ()=>{for(const [method,original] of originals)proto[method]=original;};
}
