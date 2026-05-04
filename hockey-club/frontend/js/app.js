// ===== HOCKEY CLUB APP =====
const App = (() => {
  let me = null;
  let currentPage = 'dashboard';
  let canvasCtx = null; // {context:'drill'|'session', id, item}

  // ── NAVEGACIÓN ──
  const NAV_COACH = [
    {id:'dashboard',       icon:'⬡', label:'Panel'},
    {id:'sessions',        icon:'📋', label:'Entrenamientos'},
    {id:'drills',          icon:'✏️', label:'Ejercicios'},
    {id:'users',           icon:'👥', label:'Plantel'},
  ];
  const NAV_PLAYER = [
    {id:'dashboard',            icon:'⬡', label:'Panel'},
    {id:'mis-entrenamientos',   icon:'📋', label:'Entrenamientos'},
    {id:'drills',               icon:'✏️', label:'Ejercicios'},
    {id:'mi-perfil',            icon:'🏑', label:'Mi Perfil'},
  ];

  function buildNav() {
    const nav = document.getElementById('sb-nav');
    const pages = me.role === 'coach' ? NAV_COACH : NAV_PLAYER;
    nav.innerHTML = pages.map(p => `
      <button class="nav-btn ${p.id === currentPage ? 'active' : ''}" data-page="${p.id}">
        <span class="ni">${p.icon}</span>${p.label}
      </button>`).join('');
    nav.querySelectorAll('.nav-btn').forEach(b =>
      b.addEventListener('click', () => navigate(b.dataset.page)));
  }

  function navigate(pageId, extra) {
    currentPage = pageId;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    buildNav();
    if (pageId === 'dashboard')            loadDashboard();
    if (pageId === 'users')                loadUsers();
    if (pageId === 'drills')               loadDrills();
    if (pageId === 'sessions')             loadSessions();
    if (pageId === 'mi-perfil')            loadMiPerfil();
    if (pageId === 'mis-entrenamientos')   loadMisEntrenamientos();
    if (pageId === 'player-detail')        loadPlayerDetail(extra);
  }

  // ── LOGIN ──
  function initLogin() {
    document.getElementById('login-btn').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      errEl.classList.add('hidden');
      try {
        const res = await api.login(email, password);
        api.setAuth(res.token, res.user);
        initApp(res.user);
      } catch(e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    });
    document.getElementById('login-password')
      .addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('login-btn').click(); });
  }

  function initApp(user) {
    me = user;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('sb-name').textContent = user.name;
    document.getElementById('sb-role').textContent = user.role === 'coach' ? 'Entrenadora' : 'Jugadora';
    document.getElementById('sb-avatar').textContent = initials(user.name);
    document.getElementById('logout-btn').addEventListener('click', () => { api.clearAuth(); location.reload(); });
    initCanvasModal();
    navigate('dashboard');
  }

  // ── DASHBOARD ──
  async function loadDashboard() {
    const hour = new Date().getHours();
    const sal = hour<12?'Buenos días':hour<19?'Buenas tardes':'Buenas noches';
    document.getElementById('dash-greeting').textContent = `${sal}, ${me.name.split(' ')[0]} 👋`;
    const cardsEl = document.getElementById('dash-cards');
    const recentEl = document.getElementById('dash-recent');
    cardsEl.innerHTML = '<div class="loading">Cargando...</div>';
    try {
      const [drills, sessions] = await Promise.all([api.getDrills(), api.getSessions()]);
      let players = [];
      if (me.role === 'coach') players = await api.getPlayers();

      if (me.role === 'coach') {
        cardsEl.innerHTML = [
          {label:'Jugadoras', val:players.length, icon:'👥', cls:'green'},
          {label:'Entrenamientos', val:sessions.length, icon:'📋', cls:'red'},
          {label:'Ejercicios', val:drills.length, icon:'✏️', cls:''},
        ].map(c=>`
          <div class="stat-card ${c.cls}">
            <div class="stat-icon">${c.icon}</div>
            <div><div class="stat-val">${c.val}</div><div class="stat-lbl">${c.label}</div></div>
          </div>`).join('');
      } else {
        cardsEl.innerHTML = [
          {label:'Mis entrenamientos', val:sessions.length, icon:'📋', cls:'red'},
          {label:'Ejercicios', val:drills.length, icon:'✏️', cls:''},
        ].map(c=>`
          <div class="stat-card ${c.cls}">
            <div class="stat-icon">${c.icon}</div>
            <div><div class="stat-val">${c.val}</div><div class="stat-lbl">${c.label}</div></div>
          </div>`).join('');
      }

      recentEl.innerHTML = `
        <div class="recent-section">
          <h2>${me.role==='coach'?'Últimos entrenamientos':'Mis próximos entrenamientos'}</h2>
          ${sessions.slice(0,5).map(s=>`
            <div class="recent-row">
              <span class="recent-name">${s.title}</span>
              <span class="recent-meta">${s.date ? fmtDate(s.date) : 'Sin fecha'}${s.duration?` · ${s.duration} min`:''}</span>
            </div>`).join('') || '<div class="empty-state"><p>Sin entrenamientos aún</p></div>'}
        </div>`;
    } catch(e) { cardsEl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
  }

  // ── USERS (coach) ──
  async function loadUsers() {
    const grid = document.getElementById('users-grid');
    grid.innerHTML = '<div class="loading">Cargando plantel...</div>';
    try {
      const users = await api.getUsers();
      const players = users.filter(u=>u.role==='player');
      const coaches = users.filter(u=>u.role==='coach');
      const render = [...coaches, ...players];
      grid.innerHTML = render.map(u=>`
        <div class="user-card" onclick="App.goPlayerDetail(${u.id})">
          <div class="uc-avatar ${u.role==='coach'?'coach-av':''}">${initials(u.name)}</div>
          <div class="uc-name">${u.name}</div>
          ${u.position?`<div class="uc-pos">${u.position}</div>`:''}
          ${u.number?`<span class="uc-num">#${u.number}</span>`:''}
          <div><span class="role-badge ${u.role}">${u.role==='coach'?'Entrenadora':'Jugadora'}</span></div>
          ${u.id!==me.id?`
            <div class="uc-actions">
              <button class="btn-danger" onclick="event.stopPropagation();App.deleteUser(${u.id})">Eliminar</button>
            </div>`:''}
        </div>`).join('');
    } catch(e) { grid.innerHTML = `<div class="error-msg">${e.message}</div>`; }
    document.getElementById('add-user-btn').onclick = () => openAddUserModal();
  }

  function openAddUserModal() {
    showModal('Nueva persona', `
      <div class="form-group"><label>Nombre completo</label><input id="m-name" type="text" placeholder="Valentina García"/></div>
      <div class="form-group"><label>Email</label><input id="m-email" type="email" placeholder="val@club.com"/></div>
      <div class="form-group"><label>Contraseña</label><input id="m-pass" type="password" placeholder="••••••••"/></div>
      <div class="form-group"><label>Rol</label>
        <select id="m-role"><option value="player">Jugadora</option><option value="coach">Entrenadora</option></select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Posición</label><input id="m-pos" type="text" placeholder="Delantera"/></div>
        <div class="form-group"><label>Número</label><input id="m-num" type="number" placeholder="9"/></div>
      </div>
      <div class="form-group"><label>Bio</label><textarea id="m-bio" placeholder="Datos adicionales..."></textarea></div>
      <button class="btn-primary" onclick="App.submitAddUser()">GUARDAR</button>`);
  }

  async function submitAddUser() {
    try {
      await api.createUser({
        name:     document.getElementById('m-name').value,
        email:    document.getElementById('m-email').value,
        password: document.getElementById('m-pass').value,
        role:     document.getElementById('m-role').value,
        position: document.getElementById('m-pos').value,
        number:   document.getElementById('m-num').value,
        bio:      document.getElementById('m-bio').value,
      });
      closeModal(); loadUsers();
    } catch(e) { alert(e.message); }
  }

  async function deleteUser(id) {
    if(!confirm('¿Eliminar esta persona?')) return;
    await api.deleteUser(id); loadUsers();
  }

  // ── PLAYER DETAIL (coach) ──
  function goPlayerDetail(userId) {
    navigate('player-detail', userId);
  }

  async function loadPlayerDetail(userId) {
    const el = document.getElementById('player-detail-content');
    el.innerHTML = '<div class="loading">Cargando...</div>';

    document.getElementById('back-to-plantel').onclick = () => navigate('users');

    try {
      const users = await api.getUsers();
      const player = users.find(u => u.id == userId);
      if (!player) { el.innerHTML = '<div class="error-msg">Jugadora no encontrada</div>'; return; }

      document.getElementById('player-detail-title').textContent = player.name;
      document.getElementById('add-note-btn').onclick = () => openAddNoteModal(userId);

      const [notes, attStats, sessions, allSessions] = await Promise.all([
        api.getPlayerNotes(userId),
        api.getPlayerAttStats(userId),
        api.getSessionAssignments_forPlayer ? api.getSessionAssignments_forPlayer(userId) : Promise.resolve([]),
        api.getSessions(),
      ]);

      // Attendance stats
      const statMap = {};
      for(const r of attStats) statMap[r.status] = parseInt(r.total);
      const totalAtt = Object.values(statMap).reduce((a,b)=>a+b,0);

      el.innerHTML = `
        <div class="pd-grid">
          <div class="pd-card">
            <div class="pd-avatar">${initials(player.name)}</div>
            <div class="pd-name">${player.name}</div>
            <div class="pd-pos">${player.position||'Posición no definida'}</div>
            ${player.number?`<div class="pd-num">#${player.number}</div>`:''}
            ${player.bio?`<div class="pd-bio">${player.bio}</div>`:''}
          </div>

          <div class="pd-right">

            <!-- Asistencia stats -->
            <div class="pd-section">
              <div class="pd-section-hdr"><h3>Estadísticas de asistencia</h3></div>
              <div class="pd-section-body">
                ${totalAtt===0 ? '<p style="color:var(--g500);font-size:13px">Sin registros aún</p>' : `
                <div class="att-stats">
                  ${statMap.present?`<span class="att-stat-pill" style="background:#d1f2eb;color:#1a6b47">✔ Presente: ${statMap.present}</span>`:''}
                  ${statMap.absent?`<span class="att-stat-pill" style="background:#fde8ea;color:#c1121f">✕ Ausente: ${statMap.absent}</span>`:''}
                  ${statMap.late?`<span class="att-stat-pill" style="background:#fff3cd;color:#856404">⏰ Tarde: ${statMap.late}</span>`:''}
                  ${statMap.excused?`<span class="att-stat-pill" style="background:#e8edf7;color:#1D3557">📋 Justificada: ${statMap.excused}</span>`:''}
                  <span class="att-stat-pill" style="background:var(--g200);color:var(--g600)">Total: ${totalAtt}</span>
                </div>`}
              </div>
            </div>

            <!-- Asignar a entrenamientos -->
            <div class="pd-section">
              <div class="pd-section-hdr">
                <h3>Asignar entrenamientos</h3>
                <button class="btn-primary" style="padding:7px 14px;font-size:13px" onclick="App.saveAssignments(${userId})">Guardar</button>
              </div>
              <div class="pd-section-body">
                <div class="assign-list" id="assign-list-${userId}">
                  ${allSessions.length===0?'<p style="color:var(--g500);font-size:13px">No hay entrenamientos creados</p>':
                    allSessions.map(s=>`
                      <label class="assign-row">
                        <input type="checkbox" class="assign-chk" data-sid="${s.id}" data-uid="${userId}"
                          ${s._assigned?'checked':''}>
                        <span>${s.title}</span>
                        <span style="margin-left:auto;font-size:11px;color:var(--g500)">${s.date?fmtDate(s.date):''}</span>
                      </label>`).join('')}
                </div>
              </div>
            </div>

            <!-- Notas del coach -->
            <div class="pd-section">
              <div class="pd-section-hdr"><h3>Notas del coach</h3></div>
              <div class="pd-section-body" id="notes-body-${userId}">
                ${notes.length===0?'<p style="color:var(--g500);font-size:13px">Aún no hay notas para esta jugadora</p>':
                  notes.map(n=>`
                    <div class="note-card">
                      <div class="note-title">
                        ${n.title}
                        <button class="btn-icon" onclick="App.deleteNote(${n.id},${userId})" title="Eliminar">✕</button>
                      </div>
                      <div class="note-content">${n.content}</div>
                      <div class="note-meta">
                        ${n.session_title?`📋 ${n.session_title} · `:''}
                        ${fmtDate(n.created_at)}
                      </div>
                    </div>`).join('')}
              </div>
            </div>

          </div>
        </div>`;

      // Now load actual assignments to check checkboxes
      loadAssignmentChecks(userId, allSessions);

    } catch(e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
  }

  async function loadAssignmentChecks(userId, allSessions) {
    try {
      const assigned = await api.getSessionAssignments(null, userId);
      const assignedIds = new Set(assigned.map(a=>a.id||a.session_id));
      document.querySelectorAll(`.assign-chk[data-uid="${userId}"]`).forEach(chk => {
        chk.checked = assignedIds.has(parseInt(chk.dataset.sid));
      });
    } catch {}
  }

  async function saveAssignments(userId) {
    const chks = document.querySelectorAll(`.assign-chk[data-uid="${userId}"]`);
    const ids = [...chks].filter(c=>c.checked).map(c=>parseInt(c.dataset.sid));
    // Save per session
    const allSessions = await api.getSessions();
    for(const s of allSessions) {
      const include = ids.includes(s.id);
      const currentlyAssigned = await api.getSessionAssignments(s.id);
      const alreadyIn = currentlyAssigned.some(p=>p.id==userId);
      if(include && !alreadyIn) {
        const newIds = [...currentlyAssigned.map(p=>p.id), userId];
        await api.setSessionAssignments(s.id, newIds);
      } else if(!include && alreadyIn) {
        const newIds = currentlyAssigned.map(p=>p.id).filter(id=>id!=userId);
        await api.setSessionAssignments(s.id, newIds);
      }
    }
    alert('✅ Asignaciones guardadas');
  }

  function openAddNoteModal(playerId) {
    api.getSessions().then(sessions => {
      showModal('Nueva nota', `
        <div class="form-group"><label>Título</label><input id="m-note-title" type="text" placeholder="Mejora en defensa..."/></div>
        <div class="form-group"><label>Contenido</label><textarea id="m-note-content" placeholder="Descripción detallada..."></textarea></div>
        <div class="form-group"><label>Entrenamiento (opcional)</label>
          <select id="m-note-session">
            <option value="">— ninguno —</option>
            ${sessions.map(s=>`<option value="${s.id}">${s.title}</option>`).join('')}
          </select>
        </div>
        <button class="btn-primary" onclick="App.submitNote(${playerId})">GUARDAR</button>`);
    });
  }

  async function submitNote(playerId) {
    try {
      await api.createPlayerNote(playerId, {
        title:      document.getElementById('m-note-title').value,
        content:    document.getElementById('m-note-content').value,
        session_id: document.getElementById('m-note-session').value || null,
      });
      closeModal();
      loadPlayerDetail(playerId);
    } catch(e) { alert(e.message); }
  }

  async function deleteNote(noteId, playerId) {
    if(!confirm('¿Eliminar esta nota?')) return;
    await api.deleteNote(noteId);
    loadPlayerDetail(playerId);
  }

  // ── DRILLS ──
  async function loadDrills() {
    const grid = document.getElementById('drills-grid');
    grid.innerHTML = '<div class="loading">Cargando ejercicios...</div>';
    try {
      const drills = await api.getDrills();
      if(!drills.length) {
        grid.innerHTML = '<div class="empty-state"><div class="ei">✏️</div><h3>Sin ejercicios aún</h3><p>Creá el primero con el editor de cancha</p></div>';
      } else {
        grid.innerHTML = drills.map(d=>`
          <div class="drill-card">
            <div class="drill-preview" onclick="App.openCanvas('drill',${d.id})">
              <canvas id="prev-${d.id}"></canvas>
              <div class="drill-overlay">${me.role==='coach'?'✏ Editar diagrama':'👁 Ver diagrama'}</div>
            </div>
            <div class="drill-body">
              <h3>${d.name}</h3>
              <p>${d.description||'Sin descripción'}</p>
              <div class="tag-row">
                ${d.duration?`<span class="tag">⏱ ${d.duration} min</span>`:''}
                ${d.intensity?`<span class="tag ${d.intensity}">${cap(d.intensity)}</span>`:''}
                <span class="tag">👤 ${d.coach_name||'Coach'}</span>
              </div>
              ${me.role==='coach'?`
                <div class="drill-actions">
                  <button class="btn-edit" onclick="App.editDrillMeta(${d.id})">Editar</button>
                  <button class="btn-danger" onclick="App.deleteDrill(${d.id})">Eliminar</button>
                </div>`:''}
            </div>
          </div>`).join('');
        setTimeout(()=>{
          drills.forEach(d=>{
            const c=document.getElementById(`prev-${d.id}`);
            if(c) FieldCanvas.drawPreview(c,d.canvas_data);
          });
        },60);
      }
    } catch(e) { grid.innerHTML = `<div class="error-msg">${e.message}</div>`; }

    const btn = document.getElementById('add-drill-btn');
    if(me.role!=='coach') { btn.style.display='none'; return; }
    btn.style.display='';
    btn.onclick = openNewDrillModal;
  }

  function openNewDrillModal() {
    showModal('Nuevo ejercicio', `
      <div class="form-group"><label>Nombre</label><input id="m-drill-name" type="text" placeholder="Pase y remate"/></div>
      <div class="form-group"><label>Descripción</label><textarea id="m-drill-desc" placeholder="Descripción del ejercicio..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Duración (min)</label><input id="m-drill-dur" type="number" placeholder="15"/></div>
        <div class="form-group"><label>Intensidad</label>
          <select id="m-drill-int">
            <option value="">— seleccionar —</option>
            <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" onclick="App.submitNewDrill()">GUARDAR Y ABRIR CANCHA</button>`);
  }

  async function submitNewDrill() {
    const name = document.getElementById('m-drill-name').value.trim();
    if(!name) { alert('El nombre es obligatorio'); return; }
    try {
      await api.createDrill({name, description:document.getElementById('m-drill-desc').value,
        duration:document.getElementById('m-drill-dur').value,
        intensity:document.getElementById('m-drill-int').value, canvas_data:null});
      closeModal();
      const drills = await api.getDrills();
      if(drills[0]) openCanvas('drill', drills[0].id);
      else loadDrills();
    } catch(e) { alert(e.message); }
  }

  async function editDrillMeta(id) {
    const drills = await api.getDrills();
    const d = drills.find(x=>x.id==id);
    if(!d) return;
    showModal('Editar ejercicio', `
      <div class="form-group"><label>Nombre</label><input id="m-drill-name" type="text" value="${esc(d.name)}"/></div>
      <div class="form-group"><label>Descripción</label><textarea id="m-drill-desc">${esc(d.description||'')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Duración (min)</label><input id="m-drill-dur" type="number" value="${d.duration||''}"/></div>
        <div class="form-group"><label>Intensidad</label>
          <select id="m-drill-int">
            <option value="">— seleccionar —</option>
            <option value="baja" ${d.intensity==='baja'?'selected':''}>Baja</option>
            <option value="media" ${d.intensity==='media'?'selected':''}>Media</option>
            <option value="alta" ${d.intensity==='alta'?'selected':''}>Alta</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" onclick="App.saveEditDrill(${id})">GUARDAR</button>`);
  }

  async function saveEditDrill(id) {
    const drills = await api.getDrills();
    const d = drills.find(x=>x.id==id);
    await api.updateDrill(id, {name:document.getElementById('m-drill-name').value,
      description:document.getElementById('m-drill-desc').value,
      duration:document.getElementById('m-drill-dur').value,
      intensity:document.getElementById('m-drill-int').value,
      canvas_data:d?.canvas_data||null});
    closeModal(); loadDrills();
  }

  async function deleteDrill(id) {
    if(!confirm('¿Eliminar este ejercicio?')) return;
    await api.deleteDrill(id); loadDrills();
  }

  // ── SESSIONS (coach) ──
  async function loadSessions() {
    const list = document.getElementById('sessions-list');
    list.innerHTML = '<div class="loading">Cargando...</div>';
    try {
      const sessions = await api.getSessions();
      if(!sessions.length) {
        list.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>Sin entrenamientos aún</h3></div>';
      } else {
        list.innerHTML = sessions.map(s=>`
          <div class="session-card">
            <div class="session-hdr">
              <h3>${s.title}</h3>
              <span class="session-date-badge">${s.date?fmtDate(s.date):'Sin fecha'}</span>
            </div>
            <div class="session-body">
              <div class="session-info">
                <p>${s.description||'Sin descripción'}</p>
                <div class="tag-row">
                  ${s.duration?`<span class="tag">⏱ ${s.duration} min</span>`:''}
                  ${s.intensity?`<span class="tag ${s.intensity}">${cap(s.intensity)}</span>`:''}
                </div>
              </div>
              ${me.role==='coach'?`
                <div class="session-acts">
                  <button class="btn-edit" onclick="App.openCanvas('session',${s.id})">🏑 Cancha</button>
                  <button class="btn-secondary" onclick="App.manageAttendance(${s.id})">✔ Asistencia</button>
                  <button class="btn-danger" onclick="App.deleteSession(${s.id})">Eliminar</button>
                </div>`:''}
            </div>
          </div>`).join('');
      }
    } catch(e) { list.innerHTML = `<div class="error-msg">${e.message}</div>`; }
    const btn = document.getElementById('add-session-btn');
    if(me.role!=='coach') { btn.style.display='none'; return; }
    btn.style.display='';
    btn.onclick = openNewSessionModal;
  }

  function openNewSessionModal() {
    showModal('Nuevo entrenamiento', `
      <div class="form-group"><label>Título</label><input id="m-sess-title" type="text" placeholder="Martes de defensa"/></div>
      <div class="form-group"><label>Descripción</label><textarea id="m-sess-desc" placeholder="Objetivos del entrenamiento..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Fecha</label><input id="m-sess-date" type="date"/></div>
        <div class="form-group"><label>Duración (min)</label><input id="m-sess-dur" type="number" placeholder="90"/></div>
      </div>
      <div class="form-group"><label>Intensidad</label>
        <select id="m-sess-int">
          <option value="">— seleccionar —</option>
          <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
        </select>
      </div>
      <button class="btn-primary" onclick="App.submitNewSession()">GUARDAR Y ABRIR CANCHA</button>`);
  }

  async function submitNewSession() {
    const title = document.getElementById('m-sess-title').value.trim();
    if(!title) { alert('El título es obligatorio'); return; }
    try {
      await api.createSession({title,
        description: document.getElementById('m-sess-desc').value,
        date:        document.getElementById('m-sess-date').value,
        duration:    document.getElementById('m-sess-dur').value,
        intensity:   document.getElementById('m-sess-int').value,
        canvas_data: null, drills: null});
      closeModal();
      const sessions = await api.getSessions();
      if(sessions[0]) openCanvas('session', sessions[0].id);
      else loadSessions();
    } catch(e) { alert(e.message); }
  }

  async function deleteSession(id) {
    if(!confirm('¿Eliminar este entrenamiento?')) return;
    await api.deleteSession(id); loadSessions();
  }

  // Attendance modal
  async function manageAttendance(sessionId) {
    const [players, existing] = await Promise.all([
      api.getPlayers(),
      api.getSessionAttendance(sessionId)
    ]);
    const attMap = {};
    for(const r of existing) attMap[r.player_id] = r.status;

    showModal('Tomar asistencia', `
      <table class="att-table">
        <thead><tr><th>Jugadora</th><th>Posición</th><th>Estado</th></tr></thead>
        <tbody>
          ${players.map(p=>`
            <tr>
              <td>${p.name}</td>
              <td>${p.position||'—'}</td>
              <td>
                <select class="att-select" data-pid="${p.id}">
                  <option value="present"  ${(attMap[p.id]||'present')==='present' ?'selected':''}>✔ Presente</option>
                  <option value="absent"   ${attMap[p.id]==='absent'  ?'selected':''}>✕ Ausente</option>
                  <option value="late"     ${attMap[p.id]==='late'    ?'selected':''}>⏰ Tarde</option>
                  <option value="excused"  ${attMap[p.id]==='excused' ?'selected':''}>📋 Justificada</option>
                </select>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <button class="btn-primary" onclick="App.submitAttendance(${sessionId})" style="margin-top:16px">GUARDAR ASISTENCIA</button>`);
  }

  async function submitAttendance(sessionId) {
    const selects = document.querySelectorAll('.att-select');
    const records = [...selects].map(s=>({player_id:parseInt(s.dataset.pid), status:s.value}));
    try {
      await api.saveAttendance(sessionId, records);
      closeModal();
      alert('✅ Asistencia guardada');
    } catch(e) { alert(e.message); }
  }

  // ── MI PERFIL (player) ──
  async function loadMiPerfil() {
    const el = document.getElementById('mi-perfil-content');
    el.innerHTML = '<div class="loading">Cargando...</div>';
    try {
      const [profile, notes, attStats] = await Promise.all([
        api.me(),
        api.getPlayerNotes(me.id),
        api.getPlayerAttStats(me.id)
      ]);

      const statMap = {};
      for(const r of attStats) statMap[r.status] = parseInt(r.total);
      const totalAtt = Object.values(statMap).reduce((a,b)=>a+b,0);

      el.innerHTML = `
        <div class="mp-grid">
          <div class="mp-card">
            <div class="mp-avatar">${initials(profile.name)}</div>
            <div class="mp-name">${profile.name}</div>
            <div class="mp-pos">${profile.position||'Posición no definida'}</div>
            ${profile.number?`<div class="mp-num">#${profile.number}</div>`:''}
            ${profile.bio?`<div class="mp-bio">${profile.bio}</div>`:''}
          </div>
          <div class="mp-right">

            <div class="mp-section">
              <div class="mp-section-hdr"><h3>Mi asistencia</h3></div>
              <div class="mp-section-body">
                ${totalAtt===0 ? '<p style="color:var(--g500);font-size:13px">Sin registros aún</p>' : `
                <div class="att-stats">
                  ${statMap.present?`<span class="att-stat-pill" style="background:#d1f2eb;color:#1a6b47">✔ Presente: ${statMap.present}</span>`:''}
                  ${statMap.absent?`<span class="att-stat-pill" style="background:#fde8ea;color:#c1121f">✕ Ausente: ${statMap.absent}</span>`:''}
                  ${statMap.late?`<span class="att-stat-pill" style="background:#fff3cd;color:#856404">⏰ Tarde: ${statMap.late}</span>`:''}
                  ${statMap.excused?`<span class="att-stat-pill" style="background:#e8edf7;color:#1D3557">📋 Justificada: ${statMap.excused}</span>`:''}
                  <span class="att-stat-pill" style="background:var(--g200);color:var(--g600)">
                    ${totalAtt>0?Math.round((statMap.present||0)/totalAtt*100):0}% presencia
                  </span>
                </div>`}
              </div>
            </div>

            <div class="mp-section">
              <div class="mp-section-hdr"><h3>Notas del coach</h3></div>
              <div class="mp-section-body">
                ${notes.length===0 ? '<p style="color:var(--g500);font-size:13px">Sin notas aún</p>' :
                  notes.map(n=>`
                    <div class="note-card">
                      <div class="note-title">${n.title}</div>
                      <div class="note-content">${n.content}</div>
                      <div class="note-meta">${n.session_title?`📋 ${n.session_title} · `:''}${fmtDate(n.created_at)}</div>
                    </div>`).join('')}
              </div>
            </div>

          </div>
        </div>`;

      document.getElementById('edit-profile-btn').onclick = () => openEditProfileModal(profile);
    } catch(e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
  }

  function openEditProfileModal(profile) {
    showModal('Editar mi perfil', `
      <div class="form-group"><label>Nombre</label><input id="m-ep-name" type="text" value="${esc(profile.name)}"/></div>
      <div class="form-row">
        <div class="form-group"><label>Posición</label><input id="m-ep-pos" type="text" value="${esc(profile.position||'')}"/></div>
        <div class="form-group"><label>Número</label><input id="m-ep-num" type="number" value="${profile.number||''}"/></div>
      </div>
      <div class="form-group"><label>Bio</label><textarea id="m-ep-bio">${esc(profile.bio||'')}</textarea></div>
      <hr class="divider">
      <div class="form-group"><label>Contraseña actual (solo si cambiás)</label><input id="m-ep-curr" type="password" placeholder="••••••••"/></div>
      <div class="form-group"><label>Nueva contraseña</label><input id="m-ep-new" type="password" placeholder="••••••••"/></div>
      <button class="btn-primary" onclick="App.submitEditProfile()">GUARDAR CAMBIOS</button>`);
  }

  async function submitEditProfile() {
    const newPass = document.getElementById('m-ep-new').value;
    const body = {
      name:     document.getElementById('m-ep-name').value,
      position: document.getElementById('m-ep-pos').value,
      number:   document.getElementById('m-ep-num').value,
      bio:      document.getElementById('m-ep-bio').value,
    };
    if(newPass) {
      body.currentPassword = document.getElementById('m-ep-curr').value;
      body.newPassword = newPass;
    }
    try {
      await api.updateMe(body);
      closeModal();
      // Update sidebar name
      const updated = await api.me();
      me = {...me, ...updated};
      document.getElementById('sb-name').textContent = me.name;
      document.getElementById('sb-avatar').textContent = initials(me.name);
      loadMiPerfil();
    } catch(e) { alert(e.message); }
  }

  // ── MIS ENTRENAMIENTOS (player) ──
  async function loadMisEntrenamientos() {
    const el = document.getElementById('mis-entrenamientos-list');
    el.innerHTML = '<div class="loading">Cargando...</div>';
    try {
      const sessions = await api.getSessions();
      if(!sessions.length) {
        el.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>No tenés entrenamientos asignados aún</h3></div>';
        return;
      }
      el.innerHTML = sessions.map(s=>`
        <div class="me-session-card">
          <div class="me-session-hdr" onclick="App.toggleSession(${s.id})">
            <h3>${s.title}</h3>
            <span style="font-size:12px;color:rgba(255,255,255,.65)">${s.date?fmtDate(s.date):'Sin fecha'}${s.duration?` · ${s.duration} min`:''}</span>
          </div>
          <div class="me-session-body" id="me-sess-${s.id}">
            <p style="font-size:13px;color:var(--g600);margin-bottom:8px">${s.description||'Sin descripción'}</p>
            <div class="tag-row">
              ${s.intensity?`<span class="tag ${s.intensity}">${cap(s.intensity)}</span>`:''}
              <span class="tag">👤 ${s.coach_name||'Coach'}</span>
            </div>
            ${s.canvas_data?`
              <div class="me-canvas-preview">
                <canvas id="mecanv-${s.id}"></canvas>
              </div>`:
              '<p style="font-size:12px;color:var(--g500);margin-top:10px">Sin diagrama de cancha</p>'}
          </div>
        </div>`).join('');

      // Render previews
      setTimeout(()=>{
        sessions.forEach(s=>{
          if(s.canvas_data) {
            const c=document.getElementById(`mecanv-${s.id}`);
            if(c) FieldCanvas.drawPreview(c,s.canvas_data);
          }
        });
      },60);
    } catch(e) { el.innerHTML = `<div class="error-msg">${e.message}</div>`; }
  }

  function toggleSession(id) {
    const body = document.getElementById(`me-sess-${id}`);
    body.classList.toggle('open');
  }

  // ── CANVAS MODAL ──
  function initCanvasModal() {
    document.querySelectorAll('.tool-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        FieldCanvas.setTool(btn.dataset.tool);
      });
    });
    document.querySelectorAll('.color-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        FieldCanvas.setColor(btn.dataset.color);
      });
    });
    document.querySelectorAll('.elem-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        FieldCanvas.placeElement(btn.dataset.element);
        document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
        document.querySelector('[data-tool="select"]').classList.add('active');
        FieldCanvas.setTool('select');
      });
    });
    const bsEl = document.getElementById('brush-size');
    const blEl = document.getElementById('brush-label');
    bsEl.addEventListener('input',e=>{
      FieldCanvas.setBrushSize(parseInt(e.target.value));
      blEl.textContent = e.target.value+'px';
    });
    document.getElementById('canvas-clear-btn').addEventListener('click',()=>{
      if(confirm('¿Limpiar todo el diagrama?')) FieldCanvas.clear();
    });
    document.getElementById('canvas-save-btn').addEventListener('click', saveCanvas);
    document.getElementById('canvas-close-btn').addEventListener('click', closeCanvas);
  }

  async function openCanvas(context, id) {
    let item, data;
    if(context==='drill') {
      const drills = await api.getDrills();
      item = drills.find(d=>d.id==id);
      data = item?.canvas_data||null;
    } else {
      const sessions = await api.getSessions();
      item = sessions.find(s=>s.id==id);
      data = item?.canvas_data||null;
    }
    if(!item) return;
    canvasCtx = {context, id, item};
    document.getElementById('canvas-title').textContent =
      `${context==='drill'?'Ejercicio':'Entrenamiento'} — ${item.name||item.title}`;
    document.getElementById('canvas-modal').classList.remove('hidden');
    setTimeout(()=>{
      FieldCanvas.init(document.getElementById('field-canvas'));
      FieldCanvas.loadData(data);
    },50);
  }

  async function saveCanvas() {
    if(!canvasCtx) return;
    const data = FieldCanvas.getData();
    try {
      if(canvasCtx.context==='drill') {
        const d = canvasCtx.item;
        await api.updateDrill(d.id,{name:d.name,description:d.description,duration:d.duration,intensity:d.intensity,canvas_data:data});
      } else {
        const s = canvasCtx.item;
        await api.updateSession(s.id,{title:s.title,description:s.description,date:s.date,duration:s.duration,intensity:s.intensity,drills:s.drills,canvas_data:data});
      }
      closeCanvas();
      if(canvasCtx.context==='drill') loadDrills();
      else loadSessions();
    } catch(e) { alert('Error guardando: '+e.message); }
  }

  function closeCanvas() {
    document.getElementById('canvas-modal').classList.add('hidden');
    canvasCtx = null;
  }

  // ── MODAL GENÉRICO ──
  function showModal(title,body) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }
  function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

  // ── UTILS ──
  function initials(name) { return (name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
  function cap(s) { return s?s.charAt(0).toUpperCase()+s.slice(1):''; }
  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtDate(d) {
    if(!d) return '';
    try { return new Date(d).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}); }
    catch { return d; }
  }

  // ── INIT ──
  function init() {
    initLogin();
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e=>{
      if(e.target===document.getElementById('modal-overlay')) closeModal();
    });
    if(api.token && api.user) {
      api.me().then(user=>{ me=user; api.user=user; initApp(user); })
        .catch(()=>api.clearAuth());
    }
  }

  return {
    init,
    // plantel
    goPlayerDetail, deleteUser, submitAddUser,
    // player detail
    saveAssignments, openAddNoteModal, submitNote, deleteNote,
    // drills
    editDrillMeta, saveEditDrill, deleteDrill, submitNewDrill, openCanvas,
    // sessions
    submitNewSession, deleteSession, manageAttendance, submitAttendance,
    // player pages
    submitEditProfile, toggleSession,
  };
})();

document.addEventListener('DOMContentLoaded', ()=>App.init());
