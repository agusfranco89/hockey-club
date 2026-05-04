// ===== HOCKEY FIELD CANVAS ENGINE =====
const FieldCanvas = (() => {
  let canvas, ctx;
  let tool = 'select', color = '#E63946', brushSize = 3;
  let isDrawing = false, lineStart = null;
  let elements = [], strokes = [];
  let currentStroke = null, selectedEl = null;
  let dragOffset = { x: 0, y: 0 };

  const ELEMS = {
    'player-red':  { w:36, h:44, draw: (c,x,y) => drawPerson(c,x,y,'#E63946','#fff') },
    'player-blue': { w:36, h:44, draw: (c,x,y) => drawPerson(c,x,y,'#1D3557','#fff') },
    'goalkeeper':  { w:36, h:44, draw: (c,x,y) => drawPerson(c,x,y,'#FFB703','#222','GK') },
    'ref':         { w:36, h:44, draw: (c,x,y) => drawPerson(c,x,y,'#888','#fff','R') },
    'ball':        { w:24, h:24, draw: drawBall },
    'cone':        { w:20, h:30, draw: (c,x,y) => drawCone(c,x,y,'#FF6B00','#cc5500') },
    'cone-blue':   { w:20, h:30, draw: (c,x,y) => drawCone(c,x,y,'#1D3557','#0d1f33') },
    'cone-yellow': { w:20, h:30, draw: (c,x,y) => drawCone(c,x,y,'#FFB703','#cc9200') },
    'goal-left':   { w:80, h:36, draw: drawGoal },
    'hurdle':      { w:60, h:24, draw: drawHurdle },
  };

  function drawPerson(c,x,y,fill,text,label='') {
    c.fillStyle = fill;
    c.beginPath(); c.arc(x,y-13,8,0,Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(x,y+2,11,7,0,0,Math.PI*2); c.fill();
    if (label) {
      c.fillStyle = text;
      c.font = 'bold 7px sans-serif';
      c.textAlign = 'center';
      c.fillText(label, x, y-10);
    }
    // hockey stick
    c.strokeStyle = fill === '#fff' ? '#666' : 'rgba(255,255,255,0.7)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x+8,y-4); c.lineTo(x+16,y+8); c.lineTo(x+10,y+10); c.stroke();
  }

  function drawBall(c,x,y) {
    c.fillStyle = '#f0f0f0';
    c.strokeStyle = '#444'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x,y,9,0,Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = '#aaa';
    c.beginPath(); c.arc(x-2,y-2,3,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+3,y+2,2,0,Math.PI*2); c.fill();
  }

  function drawCone(c,x,y,fill,shadow) {
    c.fillStyle = fill;
    c.beginPath(); c.moveTo(x,y-14); c.lineTo(x+9,y+6); c.lineTo(x-9,y+6); c.closePath(); c.fill();
    c.fillStyle = shadow;
    c.beginPath(); c.ellipse(x,y+6,9,3,0,0,Math.PI*2); c.fill();
    // stripes
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x-5,y-2); c.lineTo(x+5,y-2); c.stroke();
  }

  function drawGoal(c,x,y) {
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5;
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(x-40,y-18,80,36);
    c.strokeRect(x-40,y-18,80,36);
    // net lines
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.7;
    for(let i=-28;i<40;i+=12){
      c.beginPath(); c.moveTo(x+i,y-18); c.lineTo(x+i,y+18); c.stroke();
    }
    // crossbar highlight
    c.strokeStyle = '#E63946'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x-40,y-18); c.lineTo(x+40,y-18); c.stroke();
  }

  function drawHurdle(c,x,y) {
    c.fillStyle = '#FFB703'; c.strokeStyle = '#cc9200'; c.lineWidth = 1;
    c.fillRect(x-26,y-4,52,5); c.strokeRect(x-26,y-4,52,5);
    c.fillRect(x-20,y+1,4,12); c.fillRect(x+16,y+1,4,12);
  }

  // ── HOCKEY FIELD (cancha de hockey sobre césped) ──
  function drawField() {
    const W = canvas.width, H = canvas.height;

    // Base césped
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1a7a30');
    g.addColorStop(0.5,'#1e8a36');
    g.addColorStop(1,'#1a7a30');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // Franjas alternadas de césped (característico del hockey sobre césped)
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    const stripe = W / 10;
    for(let i=0;i<10;i+=2) ctx.fillRect(i*stripe,0,stripe,H);

    const pad = { x:30, y:20 };
    const fw = W - pad.x*2, fh = H - pad.y*2;

    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);

    // ── Línea exterior ──
    ctx.strokeRect(pad.x, pad.y, fw, fh);

    // ── Línea de centro ──
    ctx.beginPath();
    ctx.moveTo(W/2, pad.y);
    ctx.lineTo(W/2, pad.y+fh);
    ctx.stroke();

    // ── Punto central ──
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(W/2, H/2, 4, 0, Math.PI*2); ctx.fill();

    // ── Círculo central ──
    ctx.beginPath(); ctx.arc(W/2, H/2, fh*0.14, 0, Math.PI*2); ctx.stroke();

    // ── Círculo de penales y área (característico del hockey) ──
    // El área de penalty es un semicírculo desde el fondo
    const cr = fh * 0.285; // radio del círculo de penalty

    // Área izquierda (semicírculo)
    ctx.beginPath();
    ctx.arc(pad.x, H/2, cr, -Math.PI/2, Math.PI/2);
    ctx.lineTo(pad.x, H/2 - cr);
    ctx.stroke();

    // Área derecha (semicírculo)
    ctx.beginPath();
    ctx.arc(pad.x + fw, H/2, cr, Math.PI/2, Math.PI*1.5);
    ctx.lineTo(pad.x + fw, H/2 + cr);
    ctx.stroke();

    // ── Puntos de penalty (6.4m, aprox 15% del ancho) ──
    const penDist = fw * 0.115;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(pad.x + penDist, H/2, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad.x + fw - penDist, H/2, 4, 0, Math.PI*2); ctx.fill();

    // ── Puntos de stroke (penalty corner) ── 
    const sc = fw * 0.048;
    const scY1 = H/2 - fh*0.22;
    const scY2 = H/2 + fh*0.22;
    ctx.beginPath(); ctx.arc(pad.x+sc, scY1, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad.x+sc, scY2, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad.x+fw-sc, scY1, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad.x+fw-sc, scY2, 3, 0, Math.PI*2); ctx.fill();

    // ── Arcos (goals) ── Centrados verticalmente
    const gH = fh * 0.2;   // alto del arco
    const gY = H/2 - gH/2;
    const gDepth = fw * 0.022;

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.5;

    // Arco izquierdo
    ctx.strokeRect(pad.x - gDepth, gY, gDepth, gH);
    // Arco derecho
    ctx.strokeRect(pad.x + fw, gY, gDepth, gH);

    // Backboard (barra trasera del arco)
    ctx.strokeStyle = '#E63946'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pad.x, gY); ctx.lineTo(pad.x, gY+gH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.x+fw, gY); ctx.lineTo(pad.x+fw, gY+gH); ctx.stroke();

    // ── Cuartos de cancha (líneas de 23m) ──
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    const q = fw * 0.25;
    ctx.beginPath(); ctx.moveTo(pad.x+q, pad.y); ctx.lineTo(pad.x+q, pad.y+fh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.x+fw-q, pad.y); ctx.lineTo(pad.x+fw-q, pad.y+fh); ctx.stroke();
    ctx.setLineDash([]);

    // ── Etiqueta discreta ──
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '500 11px Barlow Condensed, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOCKEY SOBRE CÉSPED', W/2, H-8);
  }

  function redraw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawField();

    // strokes
    for(const s of strokes) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if(s.type==='pen') {
        ctx.strokeStyle = s.color; ctx.lineWidth = s.size;
        ctx.setLineDash([]);
        ctx.beginPath();
        if(s.points.length) {
          ctx.moveTo(s.points[0].x,s.points[0].y);
          s.points.slice(1).forEach(p => ctx.lineTo(p.x,p.y));
          ctx.stroke();
        }
      } else if(s.type==='line'||s.type==='dashed') {
        ctx.strokeStyle = s.color; ctx.lineWidth = s.size;
        ctx.setLineDash(s.type==='dashed'?[8,5]:[]);
        ctx.beginPath();
        ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
        ctx.setLineDash([]);
        if(s.type==='line') drawArrowHead(s.x1,s.y1,s.x2,s.y2,s.color,s.size);
      }
    }

    // elements
    for(const el of elements) {
      ctx.save();
      ELEMS[el.type]?.draw(ctx,el.x,el.y);
      if(el===selectedEl) {
        ctx.strokeStyle='#FFB703'; ctx.lineWidth=2;
        ctx.setLineDash([4,3]);
        const d=ELEMS[el.type];
        ctx.strokeRect(el.x-d.w/2-4,el.y-d.h/2-4,d.w+8,d.h+8);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function drawArrowHead(x1,y1,x2,y2,col,size) {
    const angle = Math.atan2(y2-y1,x2-x1);
    const len = Math.min(14+size,20);
    ctx.strokeStyle = col; ctx.lineWidth = size;
    ctx.lineCap = 'round'; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-len*Math.cos(angle-0.4),y2-len*Math.sin(angle-0.4));
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-len*Math.cos(angle+0.4),y2-len*Math.sin(angle+0.4));
    ctx.stroke();
  }

  function pos(e) {
    const r=canvas.getBoundingClientRect();
    const sx=canvas.width/r.width, sy=canvas.height/r.height;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return {x:(cx-r.left)*sx, y:(cy-r.top)*sy};
  }

  function hit(x,y) {
    for(let i=elements.length-1;i>=0;i--) {
      const el=elements[i], d=ELEMS[el.type];
      if(Math.abs(x-el.x)<d.w/2+6 && Math.abs(y-el.y)<d.h/2+6) return el;
    }
    return null;
  }

  function onDown(e) {
    e.preventDefault();
    const p=pos(e);
    isDrawing=true;
    if(tool==='select') {
      selectedEl=hit(p.x,p.y);
      if(selectedEl) { dragOffset.x=p.x-selectedEl.x; dragOffset.y=p.y-selectedEl.y; }
    } else if(tool==='pen') {
      currentStroke={type:'pen',color,size:brushSize,points:[p]};
    } else if(tool==='line'||tool==='dashed') {
      lineStart=p;
    } else if(tool==='erase') {
      eraseAt(p.x,p.y);
    }
    redraw();
  }

  function onMove(e) {
    if(!isDrawing) return;
    e.preventDefault();
    const p=pos(e);
    if(tool==='select'&&selectedEl) {
      selectedEl.x=p.x-dragOffset.x; selectedEl.y=p.y-dragOffset.y;
    } else if(tool==='pen'&&currentStroke) {
      currentStroke.points.push(p);
      strokes=strokes.filter(s=>s!==currentStroke);
      strokes.push(currentStroke);
    } else if((tool==='line'||tool==='dashed')&&lineStart) {
      redraw();
      ctx.strokeStyle=color; ctx.lineWidth=brushSize; ctx.lineCap='round';
      ctx.setLineDash(tool==='dashed'?[8,5]:[]);
      ctx.beginPath(); ctx.moveTo(lineStart.x,lineStart.y); ctx.lineTo(p.x,p.y); ctx.stroke();
      ctx.setLineDash([]);
      if(tool==='line') drawArrowHead(lineStart.x,lineStart.y,p.x,p.y,color,brushSize);
      return;
    } else if(tool==='erase') {
      eraseAt(p.x,p.y);
    }
    redraw();
  }

  function onUp(e) {
    if(!isDrawing) return;
    isDrawing=false;
    if(tool==='pen') currentStroke=null;
    if((tool==='line'||tool==='dashed')&&lineStart) {
      const p=pos(e);
      strokes.push({type:tool,color,size:brushSize,x1:lineStart.x,y1:lineStart.y,x2:p.x,y2:p.y});
      lineStart=null;
    }
    redraw();
  }

  function eraseAt(x,y) {
    const el=hit(x,y);
    if(el) elements.splice(elements.indexOf(el),1);
    strokes=strokes.filter(s => {
      if(s.type==='pen') return !s.points.some(p=>Math.hypot(p.x-x,p.y-y)<16);
      if(s.type==='line'||s.type==='dashed') {
        const mx=(s.x1+s.x2)/2, my=(s.y1+s.y2)/2;
        return Math.hypot(mx-x,my-y)>20;
      }
      return true;
    });
  }

  function resize() {
    const wrap=canvas.parentElement;
    const maxW=wrap.clientWidth-40, maxH=wrap.clientHeight-40;
    // Hockey field ratio: 91.4m x 55m = ~1.66:1
    let w=maxW, h=w/1.66;
    if(h>maxH) { h=maxH; w=h*1.66; }
    canvas.width=Math.floor(w);
    canvas.height=Math.floor(h);
    redraw();
  }

  function init(canvasEl) {
    if(canvas===canvasEl) { resize(); return; }
    canvas=canvasEl; ctx=canvas.getContext('2d');
    window.addEventListener('resize',resize);
    canvas.addEventListener('mousedown',onDown);
    canvas.addEventListener('mousemove',onMove);
    canvas.addEventListener('mouseup',onUp);
    canvas.addEventListener('mouseleave',onUp);
    canvas.addEventListener('touchstart',onDown,{passive:false});
    canvas.addEventListener('touchmove',onMove,{passive:false});
    canvas.addEventListener('touchend',onUp);
    resize();
  }

  function loadData(data) {
    elements=[]; strokes=[];
    if(!data) { redraw(); return; }
    try {
      const p=typeof data==='string'?JSON.parse(data):data;
      elements=p.elements||[]; strokes=p.strokes||[];
    } catch {}
    redraw();
  }

  function getData() { return JSON.stringify({elements,strokes}); }
  function clear() { elements=[]; strokes=[]; selectedEl=null; redraw(); }

  // Preview miniatura (para tarjetas de drills/sessions)
  function drawPreview(c,data) {
    const pCtx=c.getContext('2d');
    const W=c.offsetWidth||c.width||300, H=c.offsetHeight||c.height||150;
    c.width=W; c.height=H;

    // Fondo césped
    pCtx.fillStyle='#1e7a33'; pCtx.fillRect(0,0,W,H);
    pCtx.fillStyle='rgba(0,0,0,0.07)';
    const s=W/8;
    for(let i=0;i<8;i+=2) pCtx.fillRect(i*s,0,s,H);

    // Líneas básicas de la cancha de hockey
    const pad=8;
    pCtx.strokeStyle='rgba(255,255,255,0.7)'; pCtx.lineWidth=1.5;
    pCtx.strokeRect(pad,pad,W-pad*2,H-pad*2);
    pCtx.beginPath(); pCtx.moveTo(W/2,pad); pCtx.lineTo(W/2,H-pad); pCtx.stroke();
    pCtx.beginPath(); pCtx.arc(W/2,H/2,Math.min(W,H)*0.12,0,Math.PI*2); pCtx.stroke();
    // Semicírculos de penalty
    const cr=Math.min(W,H)*0.3;
    pCtx.beginPath(); pCtx.arc(pad,H/2,cr,-Math.PI/2,Math.PI/2); pCtx.stroke();
    pCtx.beginPath(); pCtx.arc(W-pad,H/2,cr,Math.PI/2,Math.PI*1.5); pCtx.stroke();

    if(!data) return;
    try {
      const parsed=JSON.parse(data);
      const scX=W/800, scY=H/500;
      pCtx.save(); pCtx.scale(scX,scY);
      for(const el of (parsed.elements||[])) ELEMS[el.type]?.draw(pCtx,el.x,el.y);
      pCtx.restore();
    } catch {}
  }

  return {
    init, loadData, getData, clear, drawPreview,
    setTool: t => { tool=t; selectedEl=null; },
    setColor: c => { color=c; },
    setBrushSize: s => { brushSize=s; },
    placeElement: type => {
      elements.push({type,x:canvas.width/2,y:canvas.height/2});
      selectedEl=elements[elements.length-1];
      redraw();
    }
  };
})();
