/**
 * SocioSolve — Frontend Application Script
 * Societal Challenges & University-Industry Innovation Exchange
 */

// Global Application State
let currentView = 'citizen';
let problemsData = [];
let analyticsData = null;
let leafletMap = null;
let mapMarkersGroup = null;
let categoryChartInstance = null;
let statusChartInstance = null;
let currentUniBranchFilter = 'All';

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadProblems();
  loadAnalytics();

  // Close modals when clicking background backdrop
  ['submitModal', 'adoptModal', 'sponsorModal', 'detailsModal'].forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  });
});

// =========================================================================
// 1. VIEW & NAVIGATION SWITCHER
// =========================================================================

function switchView(viewName) {
  currentView = viewName;

  // Hide all view sections
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.add('hidden');
  });

  // Show target section
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }

  // Update navbar desktop buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeDesktopNav = document.getElementById(`nav-${viewName}`);
  if (activeDesktopNav) {
    activeDesktopNav.classList.add('active');
  }

  // Update navbar mobile buttons
  const activeMobileNav = document.getElementById(`m-nav-${viewName}`);
  if (activeMobileNav) {
    activeMobileNav.classList.add('active');
  }

  // Special handling for Impact Map tab
  if (viewName === 'impact') {
    setTimeout(() => {
      if (leafletMap) {
        leafletMap.invalidateSize();
      }
      renderCharts();
    }, 150);
  }
}

// Focus a problem when navigating from Citizen card to University hub
function focusProblem(problemId) {
  setTimeout(() => {
    const el = document.getElementById(`uni-card-${problemId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-indigo-500');
      setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500'), 2500);
    }
  }, 200);
}

// =========================================================================
// 2. DATA FETCHING & RENDERING
// =========================================================================

async function loadProblems() {
  try {
    const category = document.getElementById('citizenCategoryFilter')?.value || 'All';
    const status = document.getElementById('citizenStatusFilter')?.value || 'All';

    let url = '/api/problems?';
    if (category !== 'All') url += `category=${encodeURIComponent(category)}&`;
    if (status !== 'All') url += `status=${encodeURIComponent(status)}&`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      problemsData = data.problems || [];
      renderCitizenGrid();
      renderUniversityGrid();
      renderIndustryGrid();
      updateMapMarkers();
    } else {
      showToast(data.error || 'Failed to load challenges', 'error');
    }
  } catch (err) {
    console.error('Error loading problems:', err);
  }
}

// -------------------------------------------------------------------------
// 2A. Render Citizen View Cards
// -------------------------------------------------------------------------
function renderCitizenGrid() {
  const container = document.getElementById('problemsGrid');
  if (!container) return;

  if (problemsData.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
        <i class="fa-solid fa-inbox text-4xl text-slate-300 mb-3"></i>
        <p class="text-slate-600 font-bold">No societal challenges match the selected filters.</p>
        <button onclick="openSubmitModal()" class="mt-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl">
          Report New Challenge
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = problemsData.map(p => {
    const statusBadgeClass = getStatusBadgeClass(p.status);
    const severityBadgeClass = getSeverityBadgeClass(p.severity);
    const totalFunding = p.total_funding ? `₹${Number(p.total_funding).toLocaleString('en-IN')}` : null;

    return `
      <div class="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden flex flex-col justify-between transition duration-200">
        <div>
          <!-- Card Header Photo & Badges -->
          <div class="relative h-44 bg-slate-100 overflow-hidden">
            <img src="${escapeHtml(p.photo_url || getCategoryFallbackImage(p.category))}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover">
            <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-md ${severityBadgeClass}">
                ${escapeHtml(p.severity || 'Medium')}
              </span>
              <span class="text-[11px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-md bg-slate-900/80 text-white">
                ${escapeHtml(p.category)}
              </span>
            </div>
            <div class="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
              ${escapeHtml(p.ticket_code)}
            </div>
          </div>

          <!-- Card Body Content -->
          <div class="p-5 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs ${statusBadgeClass} font-bold px-2.5 py-0.5 rounded-full border">
                ${escapeHtml(p.status)}
              </span>
              <span class="text-xs text-slate-500 flex items-center space-x-1">
                <i class="fa-solid fa-users text-emerald-600"></i>
                <span>${p.affected_count || 100} affected</span>
              </span>
            </div>

            <h3 class="text-base font-bold text-slate-900 line-clamp-2 hover:text-emerald-700 cursor-pointer" onclick="viewProblemDetails(${p.id})">
              ${escapeHtml(p.title)}
            </h3>

            <p class="text-xs text-slate-600 line-clamp-2">
              ${escapeHtml(p.description)}
            </p>

            <div class="text-[11px] text-slate-500 pt-1 flex items-center space-x-1 border-t border-slate-100">
              <i class="fa-solid fa-location-dot text-rose-500"></i>
              <span class="truncate">${escapeHtml(p.village)}, ${escapeHtml(p.district)}, ${escapeHtml(p.state)}</span>
            </div>

            <!-- University Adoption Banner if present -->
            ${p.college_name ? `
              <div class="bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                <div class="flex justify-between items-center text-[11px]">
                  <span class="font-bold text-indigo-900 truncate">🎓 ${escapeHtml(p.college_name)}</span>
                  <span class="font-extrabold text-indigo-700">${p.progress_percent || 20}%</span>
                </div>
                <div class="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${p.progress_percent || 20}%"></div>
                </div>
              </div>
            ` : ''}

            <!-- CSR Funding Badge if present -->
            ${totalFunding ? `
              <div class="bg-emerald-50 text-emerald-800 p-2 rounded-xl text-[11px] font-bold flex items-center justify-between border border-emerald-100">
                <span><i class="fa-solid fa-hand-holding-dollar mr-1"></i> CSR Funded</span>
                <span class="text-emerald-700 font-extrabold">${totalFunding}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="px-5 pb-5 pt-2 flex items-center space-x-2">
          <button onclick="viewProblemDetails(${p.id})" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl transition text-center">
            View Details & Timeline
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------------------
// 2B. Render University R&D Cards
// -------------------------------------------------------------------------
function renderUniversityGrid() {
  const container = document.getElementById('universityProblemsGrid');
  if (!container) return;

  let filtered = problemsData;
  if (currentUniBranchFilter !== 'All') {
    filtered = problemsData.filter(p => p.category === currentUniBranchFilter);
  }

  container.innerHTML = filtered.map(p => {
    const isAdopted = Boolean(p.college_name);

    return `
      <div id="uni-card-${p.id}" class="bg-white rounded-2xl shadow-sm border ${isAdopted ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200'} p-5 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${isAdopted ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
              ${isAdopted ? 'Academic Project Active' : 'Open for Adoption'}
            </span>
            <span class="text-[11px] text-slate-400 font-mono">${escapeHtml(p.ticket_code)}</span>
          </div>

          <h3 class="text-base font-bold text-slate-900 leading-snug">
            ${escapeHtml(p.title)}
          </h3>

          <p class="text-xs text-slate-600 leading-relaxed">
            ${escapeHtml(p.description)}
          </p>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div class="flex justify-between text-slate-600">
              <span>Location:</span>
              <span class="font-bold text-slate-800">${escapeHtml(p.village)}, ${escapeHtml(p.district)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Domain / Sector:</span>
              <span class="font-bold text-slate-800">${escapeHtml(p.category)}</span>
            </div>
          </div>

          ${isAdopted ? `
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
              <div class="flex justify-between items-center text-xs font-bold text-indigo-900">
                <span>🎓 ${escapeHtml(p.college_name)}</span>
                <span>${p.progress_percent || 20}%</span>
              </div>
              <p class="text-[11px] text-indigo-800 font-medium">Project: "${escapeHtml(p.project_title || 'Capstone Project')}"</p>
              <p class="text-[11px] text-slate-500">Lead: ${escapeHtml(p.team_lead || 'Student Team')}</p>
            </div>
          ` : `
            <div class="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2">
              <i class="fa-solid fa-lightbulb text-amber-600 mt-0.5"></i>
              <span>Engineering capstone opportunity: Field survey & engineering solution development required.</span>
            </div>
          `}
        </div>

        <div class="pt-2">
          ${isAdopted ? `
            <button onclick="viewProblemDetails(${p.id})" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-1">
              <i class="fa-solid fa-tasks mr-1"></i>
              <span>Manage Milestones & Progress</span>
            </button>
          ` : `
            <button onclick="openAdoptModal(${p.id}, '${escapeJsString(p.title)}')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center space-x-1">
              <i class="fa-solid fa-graduation-cap mr-1"></i>
              <span>Adopt Challenge for R&D</span>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function filterUniversityBranch(branch) {
  currentUniBranchFilter = branch;
  document.querySelectorAll('.uni-branch-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-indigo-50', 'text-indigo-700');
    btn.classList.add('bg-slate-100', 'text-slate-600');
  });

  event?.target?.classList?.add('active', 'bg-indigo-50', 'text-indigo-700');
  event?.target?.classList?.remove('bg-slate-100', 'text-slate-600');

  renderUniversityGrid();
}

// -------------------------------------------------------------------------
// 2C. Render Industry CSR Cards
// -------------------------------------------------------------------------
function renderIndustryGrid() {
  const container = document.getElementById('industryProjectsGrid');
  if (!container) return;

  // Prioritize university-adopted projects for CSR sponsorship
  const adoptProjects = problemsData.filter(p => p.college_name);
  const displayList = adoptProjects.length > 0 ? adoptProjects : problemsData;

  container.innerHTML = displayList.map(p => {
    const totalFunding = p.total_funding ? Number(p.total_funding) : 0;
    const isFunded = totalFunding > 0;

    return `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${isFunded ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
              ${isFunded ? 'CSR Partner Sponsored' : 'Seeking Prototype Grant'}
            </span>
            <span class="text-xs font-bold text-emerald-700">
              ${isFunded ? `₹${totalFunding.toLocaleString('en-IN')}` : 'Grant Needed'}
            </span>
          </div>

          <h3 class="text-base font-bold text-slate-900 leading-snug">
            ${escapeHtml(p.title)}
          </h3>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div>
              <span class="text-slate-500 font-medium">Adopted Institution:</span>
              <span class="font-bold text-slate-900 block">${escapeHtml(p.college_name || 'COEP Tech / NIT Engineering Network')}</span>
            </div>
            <div>
              <span class="text-slate-500 font-medium">Proposed Tech Solution:</span>
              <span class="font-semibold text-slate-800 block">${escapeHtml(p.project_title || p.description)}</span>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold text-slate-700">
              <span>Solution Readiness</span>
              <span class="text-emerald-700">${p.progress_percent || 20}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: ${p.progress_percent || 20}%"></div>
            </div>
          </div>
        </div>

        <div class="pt-2 flex items-center space-x-2">
          <button onclick="openSponsorModal(${p.id}, '${escapeJsString(p.title)}')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl shadow transition flex items-center justify-center space-x-1">
            <i class="fa-solid fa-hand-holding-dollar mr-1"></i>
            <span>Pledge CSR Grant</span>
          </button>
          <button onclick="viewProblemDetails(${p.id})" class="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================================
// 3. PROBLEM DETAILS & TIMELINE MODAL
// =========================================================================

async function viewProblemDetails(problemId) {
  openDetailsModal(problemId);
}

async function openDetailsModal(problemId) {
  try {
    const modal = document.getElementById('detailsModal');
    if (!modal) return;

    const response = await fetch(`/api/problems/${problemId}`);
    const data = await response.json();

    if (!data.success) {
      showToast(data.error || 'Could not fetch details', 'error');
      return;
    }

    const { problem, adoption, milestones, sponsorships, updates } = data;

    // Fill Modal Header & Basic Details
    document.getElementById('modalCategoryBadge').textContent = problem.category || 'General';
    document.getElementById('modalTicketCode').textContent = problem.ticket_code || `SS-2026-${problem.id}`;

    const statusBadge = document.getElementById('modalStatusBadge');
    statusBadge.textContent = problem.status;
    statusBadge.className = `text-xs font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(problem.status)}`;

    document.getElementById('modalTitle').textContent = problem.title;
    document.getElementById('modalLocation').innerHTML = `<i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${escapeHtml(problem.village)}, ${escapeHtml(problem.district)}, ${escapeHtml(problem.state)}`;
    document.getElementById('modalCitizen').innerHTML = `<i class="fa-solid fa-user text-slate-400 mr-1"></i>Reported by ${escapeHtml(problem.citizen_name)}`;
    document.getElementById('modalAffected').innerHTML = `<i class="fa-solid fa-users text-emerald-600 mr-1"></i>${problem.affected_count || 100} Citizens Impacted`;
    document.getElementById('modalDate').innerHTML = `<i class="fa-solid fa-clock text-slate-400 mr-1"></i>${problem.created_at || 'Recent'}`;

    const photoImg = document.getElementById('modalPhoto');
    photoImg.src = problem.photo_url || getCategoryFallbackImage(problem.category);

    document.getElementById('modalDescription').textContent = problem.description;

    // University Adoption Section
    const adoptionSection = document.getElementById('modalAdoptionSection');
    if (adoption) {
      adoptionSection.classList.remove('hidden');
      document.getElementById('modalCollegeName').textContent = adoption.college_name;
      document.getElementById('modalProgressPercent').textContent = `${adoption.progress_percent}%`;
      document.getElementById('modalTeamLead').textContent = `${adoption.team_lead} (${adoption.department})`;
      document.getElementById('modalFacultyMentor').textContent = adoption.faculty_mentor;
      document.getElementById('modalProposedSolution').textContent = adoption.proposed_solution;

      // Render Milestones Checklist
      const milestonesList = document.getElementById('modalMilestonesList');
      if (milestones && milestones.length > 0) {
        milestonesList.innerHTML = milestones.map(m => {
          const isDone = m.status === 'Completed';
          return `
            <div class="flex items-start space-x-3 p-2.5 rounded-xl border ${isDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'} transition">
              <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleMilestone(${m.id}, '${m.status}', ${problem.id})" class="mt-1 h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer">
              <div class="flex-1 text-xs">
                <div class="flex justify-between items-center">
                  <span class="font-bold ${isDone ? 'text-emerald-900 line-through' : 'text-slate-900'}">${m.milestone_index}. ${escapeHtml(m.title)}</span>
                  <span class="text-[10px] font-semibold ${isDone ? 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded' : 'text-slate-400'}">${m.status}</span>
                </div>
                <p class="text-slate-600 mt-0.5">${escapeHtml(m.description || '')}</p>
                ${m.completed_at ? `<span class="text-[10px] text-slate-400 block mt-0.5">Completed: ${m.completed_at}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      } else {
        milestonesList.innerHTML = '<p class="text-xs text-slate-400 italic">No milestone breakdown available yet.</p>';
      }
    } else {
      adoptionSection.classList.add('hidden');
    }

    // CSR Sponsorship Section
    const sponsorSection = document.getElementById('modalSponsorshipSection');
    const sponsorSummary = document.getElementById('modalSponsorSummary');
    const sponsorDetails = document.getElementById('modalSponsorshipDetails');

    if (sponsorships && sponsorships.length > 0) {
      sponsorSection.classList.remove('hidden');
      const totalPledged = sponsorships.reduce((sum, s) => sum + (s.amount_pledged || 0), 0);
      sponsorSummary.textContent = `${sponsorships[0].company_name} & ${sponsorships.length} Partners`;
      sponsorDetails.innerHTML = `
        <div class="flex justify-between font-bold text-emerald-900">
          <span>Total CSR Funding Committed:</span>
          <span>₹${totalPledged.toLocaleString('en-IN')}</span>
        </div>
        <p class="mt-1 text-slate-600">${escapeHtml(sponsorships[0].notes || 'Pledged CSR grant for rapid student prototyping.')}</p>
        <span class="text-[10px] text-slate-400 block mt-1">Technical Mentor: ${escapeHtml(sponsorships[0].mentor_assigned || 'Senior Advisor')}</span>
      `;
    } else {
      sponsorSection.classList.add('hidden');
    }

    // Updates Timeline
    const timelineContainer = document.getElementById('modalUpdatesTimeline');
    if (updates && updates.length > 0) {
      timelineContainer.innerHTML = updates.map(u => `
        <div class="relative pl-4 space-y-1">
          <div class="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white"></div>
          <div class="flex items-center space-x-2 text-xs">
            <span class="font-bold text-slate-900">${escapeHtml(u.author_name)}</span>
            <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold">${escapeHtml(u.author_role)}</span>
            <span class="text-slate-400 text-[10px] ml-auto">${u.created_at || ''}</span>
          </div>
          <p class="text-xs text-slate-600">${escapeHtml(u.update_text)}</p>
        </div>
      `).join('');
    } else {
      timelineContainer.innerHTML = '<p class="text-xs text-slate-400 italic">No timeline updates recorded.</p>';
    }

    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Error in openDetailsModal:', err);
    showToast('Failed to load details modal', 'error');
  }
}

function closeDetailsModal() {
  document.getElementById('detailsModal')?.classList.add('hidden');
}

async function toggleMilestone(milestoneId, currentStatus, problemId) {
  try {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    const response = await fetch(`/api/problems/${problemId}/milestones/${milestoneId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();
    if (data.success) {
      showToast('Milestone progress updated!', 'success');
      await openDetailsModal(problemId);
      loadProblems();
    } else {
      showToast(data.error || 'Failed to update milestone', 'error');
    }
  } catch (err) {
    console.error('Error toggling milestone:', err);
  }
}

// Track Ticket Search
function trackTicketFromInput() {
  const input = document.getElementById('citizenTrackInput');
  const code = input?.value?.trim();

  if (!code) {
    showToast('Please enter a valid ticket code', 'error');
    return;
  }

  const match = problemsData.find(p => p.ticket_code?.toLowerCase() === code.toLowerCase() || p.title.toLowerCase().includes(code.toLowerCase()));
  if (match) {
    viewProblemDetails(match.id);
  } else {
    showToast(`No challenge found matching '${code}'`, 'error');
  }
}

// =========================================================================
// 4. FORM SUBMISSION MODALS & HANDLERS
// =========================================================================

// --- 4A. Submit Problem Modal ---
function openSubmitModal() {
  document.getElementById('submitModal')?.classList.remove('hidden');
}

function closeSubmitModal() {
  document.getElementById('submitModal')?.classList.add('hidden');
}

function autofillGarbageCase() {
  document.getElementById('formTitle').value = 'Garbage not collected for 5 days near Village Square & Primary School';
  document.getElementById('formCategory').value = 'Waste Management';
  document.getElementById('formSeverity').value = 'Critical';
  document.getElementById('formVillage').value = 'XYZ Village';
  document.getElementById('formDistrict').value = 'Pune';
  document.getElementById('formState').value = 'Maharashtra';
  document.getElementById('formLat').value = '18.8470';
  document.getElementById('formLng').value = '73.8640';
  document.getElementById('formDescription').value = 'Garbage has not been collected for 5 days. Overflowing dump site right next to Zilla Parishad school. Foul stench, flies, and stray animals causing severe sanitation risk for 450 school kids.';
  document.getElementById('formAffected').value = '450';
  document.getElementById('formCitizenName').value = 'Ramesh Patil (Ward 3 Resident)';
  document.getElementById('formContact').value = '+91 98230 45120';

  showToast('Demo case autofilled!', 'info');
}

function previewUploadImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const container = document.getElementById('imagePreviewContainer');
      const img = document.getElementById('imagePreview');
      if (container && img) {
        img.src = e.target.result;
        container.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }
}

async function handleProblemSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = document.getElementById('submitBtn');

  try {
    if (submitBtn) submitBtn.disabled = true;
    const formData = new FormData(form);

    const response = await fetch('/api/problems', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      showToast(`Success! Ticket generated: ${data.ticket_code}`, 'success');
      closeSubmitModal();
      form.reset();
      document.getElementById('imagePreviewContainer')?.classList.add('hidden');
      await loadProblems();
      await loadAnalytics();
      if (data.problem_id) {
        viewProblemDetails(data.problem_id);
      }
    } else {
      showToast(data.error || 'Failed to submit problem', 'error');
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('An error occurred submitting the problem', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// --- 4B. Adopt Problem Modal ---
function openAdoptModal(problemId, problemTitle) {
  document.getElementById('adoptProblemId').value = problemId;
  document.getElementById('adoptModalSubtitle').textContent = `Problem: "${problemTitle}"`;
  document.getElementById('adoptModal')?.classList.remove('hidden');
}

function closeAdoptModal() {
  document.getElementById('adoptModal')?.classList.add('hidden');
}

async function handleAdoptSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const problemId = document.getElementById('adoptProblemId').value;

  try {
    const formData = new FormData(form);
    const response = await fetch(`/api/problems/${problemId}/adopt`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      showToast('Challenge adopted successfully!', 'success');
      closeAdoptModal();
      form.reset();
      await loadProblems();
      viewProblemDetails(problemId);
    } else {
      showToast(data.error || 'Failed to adopt challenge', 'error');
    }
  } catch (err) {
    console.error('Adopt error:', err);
    showToast('Error submitting adoption request', 'error');
  }
}

// --- 4C. Sponsor Problem Modal ---
function openSponsorModal(problemId, problemTitle) {
  document.getElementById('sponsorProblemId').value = problemId;
  document.getElementById('sponsorModalSubtitle').textContent = `Grant for: "${problemTitle}"`;
  document.getElementById('sponsorModal')?.classList.remove('hidden');
}

function closeSponsorModal() {
  document.getElementById('sponsorModal')?.classList.add('hidden');
}

async function handleSponsorSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const problemId = document.getElementById('sponsorProblemId').value;

  try {
    const formData = new FormData(form);
    const response = await fetch(`/api/problems/${problemId}/sponsor`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      showToast(data.message || 'CSR Grant pledged successfully!', 'success');
      closeSponsorModal();
      form.reset();
      await loadProblems();
      await loadAnalytics();
      viewProblemDetails(problemId);
    } else {
      showToast(data.error || 'Failed to pledge grant', 'error');
    }
  } catch (err) {
    console.error('Sponsor error:', err);
    showToast('Error recording sponsorship', 'error');
  }
}

// --- 4D. Demo Reset ---
async function resetDemoData() {
  if (!confirm('Reset SocioSolve showcase database to original demo state?')) return;

  try {
    const response = await fetch('/api/reset-demo', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      showToast('Demo state successfully reset!', 'success');
      await loadProblems();
      await loadAnalytics();
    } else {
      showToast(data.error || 'Failed to reset demo', 'error');
    }
  } catch (err) {
    console.error('Reset error:', err);
  }
}

// =========================================================================
// 5. GIS INTERACTIVE MAP (LEAFLET.JS)
// =========================================================================

function initMap() {
  const mapContainer = document.getElementById('impactMap');
  if (!mapContainer || leafletMap) return;

  // Center on India [20.5937, 78.9629]
  leafletMap = L.map('impactMap').setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors | SocioSolve GIS'
  }).addTo(leafletMap);

  mapMarkersGroup = L.layerGroup().addTo(leafletMap);
}

function updateMapMarkers() {
  if (!leafletMap || !mapMarkersGroup) return;

  mapMarkersGroup.clearLayers();

  problemsData.forEach(p => {
    if (!p.lat || !p.lng) return;

    let markerColor = '#ef4444'; // Reported: Red
    if (p.status === 'Adopted by University' || p.status === 'Prototype In Progress') {
      markerColor = '#6366f1'; // University: Indigo
    } else if (p.status === 'CSR Sponsored') {
      markerColor = '#10b981'; // CSR: Emerald
    } else if (p.status === 'Field Testing' || p.status === 'Resolved & Handed Over') {
      markerColor = '#0d9488'; // Resolved: Teal
    }

    const customMarker = L.circleMarker([p.lat, p.lng], {
      radius: 9,
      fillColor: markerColor,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    });

    const popupContent = `
      <div class="space-y-1 text-xs">
        <span class="text-[10px] font-bold text-slate-400 block">${escapeHtml(p.ticket_code)}</span>
        <h4 class="font-bold text-slate-900 leading-snug">${escapeHtml(p.title)}</h4>
        <p class="text-slate-600">${escapeHtml(p.village)}, ${escapeHtml(p.district)}</p>
        <div class="pt-1 flex items-center justify-between">
          <span class="font-bold text-emerald-600">${escapeHtml(p.status)}</span>
          <button onclick="viewProblemDetails(${p.id})" class="text-[11px] bg-slate-900 text-white font-bold px-2 py-1 rounded">View</button>
        </div>
      </div>
    `;

    customMarker.bindPopup(popupContent);
    mapMarkersGroup.addLayer(customMarker);
  });
}

// =========================================================================
// 6. ANALYTICS & CHARTS (CHART.JS)
// =========================================================================

async function loadAnalytics() {
  try {
    const response = await fetch('/api/analytics');
    const data = await response.json();

    if (data.success && data.metrics) {
      analyticsData = data;
      const m = data.metrics;

      // Update KPI Cards
      const totalEl = document.getElementById('kpiTotalProblems');
      if (totalEl) totalEl.textContent = m.total_problems;

      const activeEl = document.getElementById('kpiActiveProjects');
      if (activeEl) activeEl.textContent = m.active_projects;

      const csrEl = document.getElementById('kpiTotalCSR');
      if (csrEl) csrEl.textContent = `₹${(m.total_csr_pledged / 100000).toFixed(1)}L`;

      const bannerCsr = document.getElementById('industryTotalPledgedBanner');
      if (bannerCsr) bannerCsr.textContent = `₹${Number(m.total_csr_pledged).toLocaleString('en-IN')}`;

      const citizensEl = document.getElementById('kpiCitizensImpacted');
      if (citizensEl) citizensEl.textContent = Number(m.total_citizens_impacted).toLocaleString('en-IN');

      const resolvedEl = document.getElementById('kpiResolved');
      if (resolvedEl) resolvedEl.textContent = m.resolved_count;

      renderCharts();
    }
  } catch (err) {
    console.error('Analytics load error:', err);
  }
}

function renderCharts() {
  if (!analyticsData || currentView !== 'impact') return;

  const categories = analyticsData.categories || {};
  const statuses = analyticsData.statuses || {};

  // Sector Doughnut Chart
  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  // Lifecycle Pipeline Chart
  const statusCanvas = document.getElementById('statusChart');
  if (statusCanvas) {
    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(statusCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(statuses),
        datasets: [{
          label: 'Challenges Count',
          data: Object.values(statuses),
          backgroundColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { ticks: { font: { size: 10 } } }
        }
      }
    });
  }
}

// =========================================================================
// 7. UTILITY FUNCTIONS
// =========================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-900';

  toast.className = `${bg} text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl border border-white/20 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition', 'duration-300');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Reported': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Adopted by University': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Prototype In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CSR Sponsored': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Field Testing': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'Resolved & Handed Over': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

function getSeverityBadgeClass(severity) {
  switch (severity) {
    case 'Critical': return 'bg-red-600 text-white';
    case 'High': return 'bg-orange-500 text-white';
    default: return 'bg-slate-700 text-white';
  }
}

function getCategoryFallbackImage(category) {
  const defaults = {
    'Waste Management': 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
    'Clean Water & Sanitation': 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
    'AgriTech & Rural Energy': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
    'Rural Infrastructure': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    'Healthcare & Assistive Tech': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'
  };
  return defaults[category] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
