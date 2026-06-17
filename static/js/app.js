// App state variables
let releaseNotes = [];
let filteredNotes = [];
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const refreshBtn = document.getElementById('btn-refresh');
const exportBtn = document.getElementById('btn-export');
const searchInput = document.getElementById('search-input');
const filterPills = document.querySelectorAll('.filter-pill');
const lastUpdatedEl = document.getElementById('last-updated-time');

// Stats Elements
const statTotal = document.getElementById('stat-total-val');
const statFeature = document.getElementById('stat-feature-val');
const statIssue = document.getElementById('stat-issue-val');
const statBreaking = document.getElementById('stat-breaking-val');
const statChange = document.getElementById('stat-change-val');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const btnSubmitTweet = document.getElementById('btn-submit-tweet');
const btnCloseModal = document.getElementById('btn-close-modal');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  fetchReleases();
  
  // Event Listeners
  refreshBtn.addEventListener('click', () => fetchReleases(true));
  exportBtn.addEventListener('click', exportToCSV);
  searchInput.addEventListener('input', handleSearch);
  
  filterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      filterPills.forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      activeFilter = e.target.dataset.filter;
      applyFiltersAndSearch();
    });
  });
  
  // Modal close events
  btnCloseModal.addEventListener('click', closeModal);
  tweetModal.addEventListener('click', (e) => {
    if (e.target === tweetModal) closeModal();
  });
  
  // Textarea input event for Twitter character counting
  tweetTextarea.addEventListener('input', updateCharCount);
  
  // Submit tweet event
  btnSubmitTweet.addEventListener('click', submitTweet);
});

// Fetch releases from the backend Flask API
async function fetchReleases(forceRefresh = false) {
  setLoadingState(true);
  try {
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load release notes: ${response.statusText}`);
    }
    const result = await response.json();
    
    if (result.status === 'success') {
      releaseNotes = result.data;
      
      // Update last updated timestamp
      if (result.last_updated) {
        const date = new Date(result.last_updated);
        lastUpdatedEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        lastUpdatedEl.textContent = 'Just now';
      }
      
      calculateStats();
      applyFiltersAndSearch();
      
      if (forceRefresh) {
        showToast('Successfully refreshed latest release notes!', 'success');
      }
    } else {
      throw new Error(result.message || 'Error fetching releases');
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to load release notes. Please try again.', 'error');
    renderErrorState();
  } finally {
    setLoadingState(false);
  }
}

// Set loading animation states
function setLoadingState(isLoading) {
  if (isLoading) {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    renderSkeletonLoader();
  } else {
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;
  }
}

// Calculate dashboard statistics from dataset
function calculateStats() {
  let total = 0;
  let features = 0;
  let issues = 0;
  let breaking = 0;
  let changes = 0;
  
  releaseNotes.forEach(entry => {
    entry.updates.forEach(update => {
      total++;
      const type = update.type.toLowerCase();
      if (type === 'feature') features++;
      else if (type === 'issue') issues++;
      else if (type === 'breaking') breaking++;
      else if (type === 'change' || type === 'announcement') changes++;
    });
  });
  
  // Animate statistics counter numbers
  animateValue(statTotal, total);
  animateValue(statFeature, features);
  animateValue(statIssue, issues);
  animateValue(statBreaking, breaking);
  animateValue(statChange, changes);
}

// Animate values counting up
function animateValue(obj, end, duration = 600) {
  let start = 0;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end;
    }
  };
  window.requestAnimationFrame(step);
}

// Search handler
function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  applyFiltersAndSearch();
}

// Filter and search dataset in memory
function applyFiltersAndSearch() {
  filteredNotes = [];
  
  releaseNotes.forEach(entry => {
    const matchingUpdates = entry.updates.filter(update => {
      // Type matching
      let matchesType = true;
      if (activeFilter !== 'all') {
        const updateType = update.type.toLowerCase();
        if (activeFilter === 'announcement_change') {
          matchesType = (updateType === 'announcement' || updateType === 'change');
        } else {
          matchesType = (updateType === activeFilter);
        }
      }
      
      // Keyword matching
      let matchesSearch = true;
      if (searchQuery) {
        const textContent = stripHtml(update.content).toLowerCase();
        const typeContent = update.type.toLowerCase();
        const dateContent = entry.date.toLowerCase();
        matchesSearch = textContent.includes(searchQuery) || 
                        typeContent.includes(searchQuery) ||
                        dateContent.includes(searchQuery);
      }
      
      return matchesType && matchesSearch;
    });
    
    if (matchingUpdates.length > 0) {
      filteredNotes.push({
        ...entry,
        updates: matchingUpdates
      });
    }
  });
  
  renderFeed();
}

// Utility to strip HTML tags for text processing
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Render skeleton loaders for a clean page loading experience
function renderSkeletonLoader() {
  feedContainer.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-badge"></div>
      <div class="skeleton-line long"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line short"></div>
    `;
    feedContainer.appendChild(skeleton);
  }
}

// Render error visual container
function renderErrorState() {
  feedContainer.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <h3>Failed to Load Release Notes</h3>
      <p>There was an error communicating with the RSS Feed server. Please check your network connection and click refresh to try again.</p>
    </div>
  `;
}

// Render the filtered feed list
function renderFeed() {
  feedContainer.innerHTML = '';
  
  if (filteredNotes.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <h3>No updates found</h3>
        <p>No release notes match your search keywords or category filters. Try clearing your search query or selecting a different tab.</p>
      </div>
    `;
    return;
  }
  
  filteredNotes.forEach(entry => {
    const dateGroup = document.createElement('div');
    dateGroup.className = 'date-group';
    
    // Header for Date Column
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header-container';
    dateHeader.innerHTML = `
      <div class="date-header">
        <div class="date-title">
          <span class="date-dot"></span>
          ${entry.date}
        </div>
      </div>
    `;
    dateGroup.appendChild(dateHeader);
    
    // Updates Column
    const updatesList = document.createElement('div');
    updatesList.className = 'updates-list';
    
    entry.updates.forEach((update, index) => {
      const card = document.createElement('div');
      const lowerType = update.type.toLowerCase();
      
      // Select corresponding class
      let typeClass = 'general';
      if (['feature', 'issue', 'breaking', 'announcement', 'change'].includes(lowerType)) {
        typeClass = lowerType;
      }
      
      card.className = `update-card ${typeClass}`;
      
      // Render clean card content
      card.innerHTML = `
        <div class="update-header">
          <span class="badge ${typeClass}">${update.type}</span>
        </div>
        <div class="update-body">
          ${update.content}
        </div>
        <div class="update-footer">
          <button class="btn-copy" id="copy-btn-${entry.date.replace(/[^a-zA-Z0-9]/g, '')}-${index}">
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copy Text
          </button>
          <button class="btn-tweet" id="tweet-btn-${entry.date.replace(/[^a-zA-Z0-9]/g, '')}-${index}">
            <svg viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Tweet this
          </button>
        </div>
      `;
      
      updatesList.appendChild(card);
      
      // Bind Tweet and Copy button listeners
      setTimeout(() => {
        const tweetBtn = document.getElementById(`tweet-btn-${entry.date.replace(/[^a-zA-Z0-9]/g, '')}-${index}`);
        if (tweetBtn) {
          tweetBtn.addEventListener('click', () => openTweetModal(entry.date, update, entry.link));
        }
        const copyBtn = document.getElementById(`copy-btn-${entry.date.replace(/[^a-zA-Z0-9]/g, '')}-${index}`);
        if (copyBtn) {
          copyBtn.addEventListener('click', () => copyToClipboard(entry.date, update));
        }
      }, 0);
    });
    
    dateGroup.appendChild(updatesList);
    feedContainer.appendChild(dateGroup);
  });
}

// Open tweet customizer modal
function openTweetModal(date, update, link) {
  const cleanText = stripHtml(update.content).trim();
  
  // Calculate text limit dynamically
  // Twitter links count as 23 characters
  const hashtags = "\n\n#BigQuery #GoogleCloud #GCP";
  const linkText = link ? `\n\nLink: ${link}` : "";
  const header = `BigQuery Update (${date}):\n\n`;
  
  // Find allowable length for description
  const reservedLength = header.length + hashtags.length + (link ? 30 : 0); // 30 is safety limit for link
  const maxDescLength = 280 - reservedLength;
  
  let formattedDesc = cleanText;
  if (cleanText.length > maxDescLength) {
    formattedDesc = cleanText.substring(0, maxDescLength - 3) + "...";
  }
  
  const defaultTweet = `${header}${formattedDesc}${hashtags}${linkText}`;
  
  tweetTextarea.value = defaultTweet;
  updateCharCount();
  
  tweetModal.classList.add('active');
}

// Close tweet modal
function closeModal() {
  tweetModal.classList.remove('active');
}

// Track Twitter character counter limit (280 max)
function updateCharCount() {
  const currentLength = tweetTextarea.value.length;
  charCounter.textContent = `${currentLength} / 280`;
  
  // Clear status classes
  charCounter.className = 'char-counter';
  
  if (currentLength > 280) {
    charCounter.classList.add('error');
    btnSubmitTweet.disabled = true;
  } else if (currentLength > 240) {
    charCounter.classList.add('warning');
    btnSubmitTweet.disabled = false;
  } else {
    btnSubmitTweet.disabled = false;
  }
}

// Open Twitter intent to post tweet
function submitTweet() {
  const text = tweetTextarea.value;
  if (text.length > 280) {
    showToast('Tweet text exceeds 280 characters limit!', 'error');
    return;
  }
  
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  closeModal();
  showToast('Twitter composer opened in a new tab!', 'success');
}

// Display float action feedback toasts
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    `;
  } else {
    iconHtml = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
    `;
  }
  
  toast.innerHTML = `
    ${iconHtml}
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Trigger animations
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Copy update text to clipboard
async function copyToClipboard(date, update) {
  const cleanText = stripHtml(update.content).trim();
  const textToCopy = `BigQuery Update (${date}) [${update.type}]:\n\n${cleanText}`;
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast('Copied update details to clipboard!', 'success');
  } catch (err) {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy to clipboard.', 'error');
  }
}

// Export filtered release notes dataset to CSV
function exportToCSV() {
  if (filteredNotes.length === 0) {
    showToast('No notes available to export.', 'error');
    return;
  }
  
  const csvRows = ["Date,Type,Update Content,Link"];
  
  filteredNotes.forEach(entry => {
    entry.updates.forEach(update => {
      const dateVal = entry.date;
      const typeVal = update.type;
      const contentVal = stripHtml(update.content).trim();
      const linkVal = entry.link || "";
      
      // Escape double quotes by doubling them, and wrap text in quotes
      const escapedDate = `"${dateVal.replace(/"/g, '""')}"`;
      const escapedType = `"${typeVal.replace(/"/g, '""')}"`;
      const escapedContent = `"${contentVal.replace(/"/g, '""')}"`;
      const escapedLink = `"${linkVal.replace(/"/g, '""')}"`;
      
      csvRows.push(`${escapedDate},${escapedType},${escapedContent},${escapedLink}`);
    });
  });
  
  const csvString = csvRows.join("\r\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Release notes exported to CSV!', 'success');
}
