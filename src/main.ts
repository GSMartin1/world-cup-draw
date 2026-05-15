import './style.css'
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);
const app = document.querySelector<HTMLDivElement>('#app')!;

// --- ROUTING & SECURITY ---
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'boss';
const roomIdString = urlParams.get('roomId');
const currentRoomId = roomIdString ? (roomIdString as Id<"rooms">) : null;

// --- STATE ---
let lastDrawnTeam: any = null;
let isDrawing: boolean = false;
let isAutoDrawing: boolean = false; 
let activeTab: 'draw' | 'progress' = isAdmin ? 'draw' : 'progress';

// ==========================================
// 1. THE LOBBY VIEW
// ==========================================
async function renderLobby() {
  let adminRoomsHtml = '';
  if (isAdmin) {
    try {
      const rooms = await client.query(api.rooms.getAll, {});
      if (rooms && rooms.length > 0) {
        adminRoomsHtml = `
          <div style="background: var(--card-bg); border: 1px dashed #374151; padding: 2rem; border-radius: 12px; margin-top: 2rem; text-align: left;">
            <h3 style="margin-top: 0; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Resume Admin Session</h3>
            <div id="admin-rooms-container" style="display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1rem;">
              ${rooms.map((r: any) => `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <button class="admin-resume-btn" data-id="${r._id}" style="background: #1f2937; color: white; border: 1px solid #374151; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: bold; cursor: pointer; flex-grow: 1;">
                    ${r.name} ➔
                  </button>
                  <button class="admin-delete-btn" data-id="${r._id}" style="background: #7f1d1d; color: white; border: none; padding: 0.6rem; border-radius: 6px; cursor: pointer;">
                    🗑️
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } catch (err) { console.error("Failed to fetch rooms:", err); }
  }

  app.innerHTML = `
    <div style="text-align: center; padding: 8vh 1rem;">
      <h1 style="font-size: 3.5rem; margin-bottom: 0.5rem; font-weight: 900; letter-spacing: -1px;">WORLD CUP <span style="color: var(--accent-yellow);">2026</span></h1>
      <p style="color: var(--text-muted); margin-bottom: 4rem; font-size: 1.1rem; letter-spacing: 2px;">OFFICE DRAW PLATFORM</p>
      <div style="max-width: 850px; margin: 0 auto;">

      <div style="display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: flex-start; max-width: 900px; margin: 0 auto;">
        
        <div style="flex: 1; min-width: 300px; max-width: 400px; background: var(--card-bg); border: 1px solid var(--card-border); padding: 2rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--primary-blue);"></div>
          
          <h2 style="margin: 0.5rem 0 1.5rem 0; color: white; font-size: 1.5rem; text-align: center;">Join a Draw</h2>
          
          <div style="display: flex; flex-direction: column; gap: 0.8rem;">
            <input type="text" id="join-name-input" class="name-input" placeholder="Tournament Name" 
              style="width: 100%; box-sizing: border-box; background: var(--bg-color); padding: 0.8rem; border-radius: 8px; border: 1px solid var(--card-border); color: white;" />
            <button id="join-room-btn" class="btn-primary" style="width: 100%; padding: 0.8rem; font-weight: bold;">VIEW PROGRESS</button>
          </div>
        </div>

        ${isAdmin ? `
          <div style="flex: 1; min-width: 300px; max-width: 400px; background: var(--card-bg); border: 1px solid var(--card-border); padding: 2rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--accent-yellow);"></div>
            
            <h2 style="margin: 0.5rem 0 1.5rem 0; color: white; font-size: 1.5rem; text-align: center;">Start a New Draw</h2>
            
            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
              <input type="text" id="room-name-input" class="name-input" placeholder="e.g., Marketing Dept" 
                style="width: 100%; box-sizing: border-box; background: var(--bg-color); padding: 0.8rem; border-radius: 8px; border: 1px solid var(--card-border); color: white;" />
              <button id="create-room-btn" class="btn-primary" style="width: 100%; padding: 0.8rem; background: var(--accent-yellow); color: black; font-weight: bold;">GENERATE TOURNAMENT</button>
            </div>
          </div>
        ` : ''}

      </div>
        ${adminRoomsHtml}
      </div>
    </div>
  `;

  // Delegate clicks on the app container to handle all lobby interaction
  app.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Handle Join
    if (target.id === 'join-room-btn') {
      const name = (document.getElementById('join-name-input') as HTMLInputElement).value.trim();
      if (!name) return alert("Please enter a room name.");
      try {
        const room = await client.query(api.rooms.getByName, { name });
        if (room) window.location.href = `/?roomId=${room._id}${isAdmin ? '&admin=boss' : ''}`;
        else alert("Tournament not found.");
      } catch (e) { alert("Error joining room."); }
    }

    // Handle Create
    if (target.id === 'create-room-btn') {
      const name = (document.getElementById('room-name-input') as HTMLInputElement).value.trim();
      if (!name) return alert("Please enter a name.");
      try {
        const id = await client.mutation(api.rooms.create, { name });
        window.location.href = `/?roomId=${id}&admin=boss`;
      } catch (err: any) { alert("Error: " + (err.message || "Failed to create")); }
    }

    // Handle Delete
    if (target.classList.contains('admin-delete-btn')) {
      const roomId = target.dataset.id as Id<"rooms">;
      if (confirm("🚨 WARNING: This will permanently delete the tournament and all its data. Are you sure?")) {
        try {
          await client.mutation(api.rooms.deleteRoom, { roomId });
          renderLobby(); // Re-render the lobby to remove the deleted room
        } catch (err) { alert("Delete failed: " + err); }
      }
    }

    // Handle Resume Buttons
    const resumeBtn = target.closest('.admin-resume-btn') as HTMLButtonElement;
    if (resumeBtn && resumeBtn.dataset.id) {
      window.location.href = `/?roomId=${resumeBtn.dataset.id}&admin=boss`;
    }
  });
}

// ==========================================
// 2. THE MAIN TOURNAMENT VIEW
// ==========================================
function updateUI(teams: any[] | undefined, participantCount: number = 0) {
  if (!teams) {
    app.innerHTML = `<div class="status-msg">Loading Tournament Data...</div>`;
    return;
  }

  const drawnCount = teams.filter(t => t.isDrawn).length;
  const activeTeams = teams.filter(t => t.isDrawn && !t.isEliminated && !t.placement);
  const eliminatedTeams = teams.filter(t => t.isDrawn && t.isEliminated && !t.placement);
  const finalStandings = teams.filter(t => t.isDrawn && t.placement);

  app.innerHTML = `
    <div id="draw-modal" class="modal-overlay ${lastDrawnTeam || isDrawing || isAutoDrawing ? 'active' : ''}">
      <div class="modal-content">
        ${isAutoDrawing ? `
          <div class="modal-header pulse-text">FAST-FORWARDING...</div>
          <div class="drawing-state"><div class="loader"></div><h2 class="modal-team" style="font-size: 1.5rem;">SIMULATING <br><span class="modal-user" style="font-size: 2rem;">ALL MATCHUPS...</span></h2></div>
        ` : isDrawing ? `
          <div class="modal-header pulse-text">COMMUNICATING WITH SERVERS...</div>
          <div class="drawing-state"><div class="loader"></div><h2 class="modal-team" style="font-size: 1.5rem;">RANDOMIZING <br><span class="modal-user" style="font-size: 2rem;">MATCHUP...</span></h2></div>
        ` : lastDrawnTeam ? `
          <div class="modal-header">OFFICIAL SELECTION</div>
          <div class="modal-flag reveal-anim-drop"><img src="https://flagcdn.com/w320/${(lastDrawnTeam.flag || '').toLowerCase()}.png" /></div>
          <h2 class="modal-team reveal-anim-slide">${lastDrawnTeam.name}</h2>
          <div class="modal-divider reveal-anim-fade"></div>
          <div class="modal-assigned reveal-anim-fade"><span class="modal-label">DRAWN BY</span><span class="modal-user">${lastDrawnTeam.assignedTo}</span></div>
          ${isAdmin ? `<button id="close-modal-btn" class="btn-primary modal-btn reveal-anim-fade">CONTINUE</button>` : ''}
        ` : ''}
      </div>
    </div>

    <header class="main-header">
      <div class="logo-area" onclick="window.location.href='${isAdmin ? '/?admin=boss' : '/'}'" style="cursor: pointer;">
        <h1>WORLD CUP 2026</h1><span class="sub-logo">OFFICE DRAW</span>
      </div>
      ${isAdmin ? `
        <div class="tab-navigation">
          <button class="tab-btn ${activeTab === 'draw' ? 'active' : ''}" data-tab="draw">LIVE DRAW</button>
          <button class="tab-btn ${activeTab === 'progress' ? 'active' : ''}" data-tab="progress">TOURNAMENT PROGRESS</button>
        </div>
      ` : ''}
      <div class="action-area">
      ${isAdmin ? `
        <div class="admin-data-controls" style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;">
          <input type="file" id="csv-upload" accept=".csv" style="display: none;" />
          
          <div style="display: flex; gap: 0.5rem;">
            <button id="upload-csv-btn" class="btn-secondary">UPLOAD CSV</button>
            <button id="export-csv-btn" class="btn-secondary" ${drawnCount === 0 ? 'disabled' : ''}>EXPORT RESULTS</button>
          </div>

          <button id="clear-participants-btn" class="btn-text-danger" style="font-size: 0.5rem; padding: 0; background: none; border: none; text-decoration: underline; cursor: pointer;">
            CLEAR PARTICIPANTS
          </button>
        </div>
      ` : ''}
        <div class="stat-group">
          <span class="label">TEAMS DRAWN</span>
          <span class="value">${drawnCount} / 48</span>
          ${isAdmin ? `
            <button id="reset-btn" class="btn-text-danger" style="font-size: 0.5rem; display: block; margin-top: 4px; padding: 0; background: none; border: none; text-decoration: underline; cursor: pointer;">
              RESET DRAW
            </button>
          ` : ''}
        </div>

          <button id="share-link-btn" class="btn-secondary" style="font-size: 0.7rem; height: fit-content; align-self: center;">
          🔗 SHARE LINK
          </button>

          ${isAdmin && activeTab === 'draw' ? `
              <div class="input-group">
                <button id="draw-btn" class="btn-primary" ${participantCount === 0 || drawnCount === 48 ? 'disabled' : ''}>
                  ${participantCount === 0 ? 'UPLOAD CSV FIRST' : 'DRAW RANDOM MATCH'}
                </button>
                <button id="auto-draw-btn" class="btn-secondary" style="border-color: var(--accent-yellow); color: var(--accent-yellow);" ${participantCount === 0 || drawnCount === 48 ? 'disabled' : ''}>
                  ⚡ AUTO FINISH
                </button>
              </div>
            ` : ''}
      </div>
    </header>
    <main class="content-area">
      ${activeTab === 'draw' && isAdmin ? renderDrawGrid(teams) : renderProgressGrid(activeTeams, eliminatedTeams, finalStandings)}
    </main>
  `;

  if (isAdmin) attachEventListeners(teams);
  // Make sure the share button works for everyone, not just admins
  const shareBtn = document.getElementById('share-link-btn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      // Create a clean URL without the admin=boss tag
      const shareUrl = window.location.origin + window.location.pathname + `?roomId=${currentRoomId}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = "✅ COPIED!";
        shareBtn.style.borderColor = "var(--accent-yellow)";
        
        // Reset button after 2 seconds
        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.style.borderColor = "";
        }, 2000);
      }).catch(() => {
        // Fallback just in case a browser blocks clipboard access
        prompt("Copy this link to share:", shareUrl);
      });
    };
  }
}

function renderDrawGrid(teams: any[]) {
  return `<div class="draw-grid">${teams.map(team => `
        <div class="team-card ${team.isDrawn ? 'is-finalized' : 'is-available'}">
          <div class="card-inner">
            <div class="pot-badge">P${team.pot}</div>
            <div class="flag-icon"><img src="https://flagcdn.com/w160/${(team.flag || '').toLowerCase()}.png" loading="lazy" /></div>
            <div class="name-display">${team.name}</div>
            <div class="card-odds">ODDS: ${team.odds}/1</div>
            ${team.isDrawn ? `<div class="assigned-tag">${team.assignedTo}</div>` : ''}
          </div>
        </div>`).join('')}</div>`;
}

function renderProgressGrid(activeTeams: any[], eliminatedTeams: any[], finalStandings: any[]) {
  if (activeTeams.length === 0 && eliminatedTeams.length === 0 && finalStandings.length === 0) {
    return `<div class="status-msg">The official draw has not started yet. Check back soon!</div>`;
  }

  const renderDropdown = (team: any) => isAdmin ? `
    <select class="status-select-dropdown" data-id="${team._id}" style="margin-bottom: 10px; width: 100%; padding: 8px; background: var(--bg-color); color: white; border: 1px solid var(--primary-blue); border-radius: 6px; cursor: pointer; font-weight: bold;">
      <option value="active" ${!team.isEliminated && !team.placement ? 'selected' : ''}>🟢 Active</option>
      <option value="eliminated" ${team.isEliminated ? 'selected' : ''}>❌ Knocked Out</option>
      <option value="1st" ${team.placement === '1st' ? 'selected' : ''}>🏆 1st</option>
      <option value="2nd" ${team.placement === '2nd' ? 'selected' : ''}>🥈 2nd</option>
      <option value="3rd" ${team.placement === '3rd' ? 'selected' : ''}>🥉 3rd</option>
      <option value="wooden_spoon" ${team.placement === 'wooden_spoon' ? 'selected' : ''}>🥄 Spoon</option>
    </select>
  ` : '';

  const renderCard = (team: any, extraClass: string, badgeHtml: string = '') => `
    <div class="team-card is-finalized ${extraClass}">
      <div class="card-inner">
        ${renderDropdown(team)}
        ${badgeHtml}
        <div class="flag-icon ${extraClass === 'is-eliminated' ? 'grayscale' : ''}"><img src="https://flagcdn.com/w160/${(team.flag || '').toLowerCase()}.png" loading="lazy" /></div>
        <div class="name-display">${team.name}</div>
        <div class="assigned-tag ${extraClass === 'is-eliminated' ? 'grayscale' : ''}">${team.assignedTo}</div>
      </div>
    </div>
  `;

  return `
    <div class="progress-container">
      ${finalStandings.length > 0 ? `
        <h2 class="section-title" style="color: var(--accent-yellow);">FINAL STANDINGS 🏆</h2>
        <div class="draw-grid" style="margin-bottom: 4rem;">
          ${finalStandings.sort((a,b) => {
            const order: any = { '1st': 1, '2nd': 2, '3rd': 3, 'wooden_spoon': 4 };
            return order[a.placement] - order[b.placement];
          }).map(team => {
            let label = team.placement.toUpperCase();
            if (team.placement === 'wooden_spoon') label = '🥄 WOODEN SPOON';
            return renderCard(team, 'active-pulse', `<div style="background: var(--accent-yellow); color: black; font-weight: bold; padding: 4px; border-radius: 4px; margin-bottom: 10px;">${label}</div>`);
          }).join('')}
        </div>
      ` : ''}
      ${activeTeams.length > 0 ? `
        <h2 class="section-title text-green">STILL IN THE FIGHT</h2>
        <div class="draw-grid" style="margin-bottom: 4rem;">${activeTeams.map(team => renderCard(team, 'active-pulse')).join('')}</div>
      ` : ''}
      ${eliminatedTeams.length > 0 ? `
        <h2 class="section-title text-red">ELIMINATED</h2>
        <div class="draw-grid opacity-low">${eliminatedTeams.map(team => renderCard(team, 'is-eliminated', `<div class="knocked-out-stamp">ELIMINATED</div>`)).join('')}</div>
      ` : ''}
    </div>
  `;
}

// ==========================================
// 3. EVENT LISTENERS
// ==========================================
function attachEventListeners(teams: any[]) {
  if (!currentRoomId) return;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', async (e) => {
      activeTab = (e.target as HTMLButtonElement).dataset.tab as 'draw' | 'progress';
      const parts = await client.query(api.participants.getAll, { roomId: currentRoomId! });
      updateUI(teams, parts.length); 
    }));

  document.querySelectorAll('.status-select-dropdown').forEach(select => select.addEventListener('change', async (e) => {
    const target = e.target as HTMLSelectElement;
    try { await client.mutation(api.teams.setTeamStatus, { teamId: target.dataset.id as Id<"teams">, status: target.value }); } 
    catch (err) { alert("Status update failed: " + err); }
  }));

  const uploadBtn = document.getElementById('upload-csv-btn');
  const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      const file = target.files[0]; 
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        let names = text.split('\n').map(n => n.trim().replace(/,/g, '')).filter(n => n.length > 0);
        for (let i = names.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [names[i], names[j]] = [names[j], names[i]];
        }
        uploadBtn.innerText = "Uploading...";
        try {
          await client.mutation(api.teams.addParticipants, { roomId: currentRoomId, names });
          
          const [teams, participants] = await Promise.all([
            client.query(api.teams.get, { roomId: currentRoomId }),
            client.query(api.participants.getAll, { roomId: currentRoomId })
          ]);
          updateUI(teams, participants.length); // Update UI with new count
          
          alert(`Successfully shuffled!`);
        } catch (err) { alert("Upload failed: " + err); }
        finally { uploadBtn.innerText = "Upload CSV"; fileInput.value = ""; }
      };
      reader.readAsText(file);
    };

    const clearPartBtn = document.getElementById('clear-participants-btn');
    if (clearPartBtn) {
      clearPartBtn.onclick = async () => {
        if (confirm("🚨 This will remove all uploaded names and reset any teams already drawn. Continue?")) {
          try {
            // 1. Perform the clear
            await client.mutation(api.teams.clearParticipants, { roomId: currentRoomId! });
            
            // 2. FORCE A RE-FETCH to get the new '0' count
            const [teams, participants] = await Promise.all([
              client.query(api.teams.get, { roomId: currentRoomId! }),
              client.query(api.participants.getAll, { roomId: currentRoomId! })
            ]);
            
            // 3. Update the UI with the fresh data
            updateUI(teams, participants.length);
            
            alert("Participants cleared and draw reset!");
          } catch (err) { alert("Failed to clear: " + err); }
        }
      };
    }
  }

  document.getElementById('export-csv-btn')?.addEventListener('click', async (_) => {
    const drawnTeams = await client.query(api.teams.getDrawnTeams, { roomId: currentRoomId });
    let csvContent = "Participant,Team\n";
    drawnTeams.forEach(t => csvContent += `"${t.assignedTo}","${t.name}"\n`);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "draw_results.csv";
    link.click();
  });

  document.getElementById('draw-btn')?.addEventListener('click', async () => {
      if ((document.getElementById('draw-btn') as HTMLButtonElement).disabled) {
        return alert("Please upload a CSV of names before starting the draw.");
      }
      
      // 1. Fetch the count so we don't lose it during the loading animation!
      const parts = await client.query(api.participants.getAll, { roomId: currentRoomId! });
      const count = parts.length;

      isDrawing = true;
      updateUI(teams, count); 
      
      try {
        const result = await client.mutation(api.teams.drawTeam, { roomId: currentRoomId! });
        await new Promise(resolve => setTimeout(resolve, 2500)); 
        lastDrawnTeam = result; 
        isDrawing = false;
        
        // 2. Fetch the fresh teams and pass BOTH arguments back to updateUI
        const updatedTeams = await client.query(api.teams.get, { roomId: currentRoomId! });
        updateUI(updatedTeams, count);
      } catch (err: any) { 
        isDrawing = false; 
        updateUI(teams, count); 
        alert(err.message); 
      }
    });

    document.getElementById('reset-btn')?.addEventListener('click', async () => {
      if (confirm("🚨 Reset entire draw?")) await client.mutation(api.teams.resetDraw, { roomId: currentRoomId! });
    });

    document.getElementById('auto-draw-btn')?.addEventListener('click', async () => {
      if (!confirm("⚡ Auto-Finish?")) return;
      
      // Fetch the count so the UI doesn't break during auto-draw
      const parts = await client.query(api.participants.getAll, { roomId: currentRoomId! });
      const count = parts.length;
      
      isAutoDrawing = true;
      updateUI(teams, count); 
      
      try {
        while (true) await client.mutation(api.teams.drawTeam, { roomId: currentRoomId! });
      } catch (err) { /* finished */ }
      
      isAutoDrawing = false;
      const updatedTeams = await client.query(api.teams.get, { roomId: currentRoomId! });
      updateUI(updatedTeams, count);
    });

    document.getElementById('close-modal-btn')?.addEventListener('click', async () => { 
      lastDrawnTeam = null; 
      // Fetch one last time so closing the modal doesn't reset the button to 0
      const parts = await client.query(api.participants.getAll, { roomId: currentRoomId! });
      updateUI(teams, parts.length); 
    });
    };

// ==========================================
// 4. APP INITIALIZATION
// ==========================================
// --- 4. APP INITIALIZATION ---
if (currentRoomId) {
  // We use an async wrapper to fetch both counts
  const syncData = async () => {
    const [teams, participants] = await Promise.all([
      client.query(api.teams.get, { roomId: currentRoomId }),
      client.query(api.participants.getAll, { roomId: currentRoomId }) // Assuming this returns array
    ]);
    if (!isDrawing) updateUI(teams, participants.length);
  };

  client.onUpdate(api.teams.get, { roomId: currentRoomId }, syncData);
  syncData(); 
} else {
  renderLobby();
}