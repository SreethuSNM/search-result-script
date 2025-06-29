//<script>
// Generate or get visitor ID
async function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

// Check if the token has expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
    } catch (e) {
        return true;
    }
}

// Get or fetch visitor session token
async function getVisitorSessionToken() {
    try {
        const existingToken = localStorage.getItem('visitorSessionToken');
        if (existingToken && !isTokenExpired(existingToken)) {
            console.log("Using existing token from localStorage");
            return existingToken;
        }

        const visitorId = await getOrCreateVisitorId();
        const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
        console.log("Current Hostname for get visitorId: ", siteName);

        const response = await fetch('https://search-server.long-rain-28bb.workers.dev/api/visitor-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visitorId,
                userAgent: navigator.userAgent,
                siteName,
            }),
        });

        if (!response.ok) throw new Error('Failed to fetch visitor session token');

        const data = await response.json();
        localStorage.setItem('visitorSessionToken', data.token);
        return data.token;
    } catch (error) {
        console.error('Error getting visitor session token:', error);
        return null;
    }
}

// Render search results with pagination
function renderResults(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1, isPageResult = true, styles = {}) {
    
    if (!Array.isArray(results) || results.length === 0) return "";
    const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
    const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
    const endIndex = maxItems ? startIndex + maxItems : results.length;
    const pagedResults = results.slice(startIndex, endIndex);

     const {
        titleFontSize = "16px",
        titleFontFamily = "Arial",
        titleColor = "#000",
        borderRadius = "6px",
        otherFieldsColor = "#333",
        otherFieldsFontSize = "14px",
         boxShadow = true,
    } = styles;

    
    const itemsHtml = pagedResults.map(item => {
  const titleText = item.name || item.title || "Untitled";
  //const detailUrl = isPageResult
   // ? (item.publishedPath || item.slug || "#")
    //: (item.detailUrl || "#");

const detailUrl = item._type === 'page'
  ? (item.publishedPath || item.slug || "#")
  : (item.detailUrl || "#");
  const matchedText = item.matchedText?.slice(0, 200) || "";

  const fieldsHtml = Object.entries(item)
    .filter(([key]) => key !== "name" && key !== "title" && key !== "detailUrl")
    .map(([key, value]) => {
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        value = new Date(value).toLocaleString();
      }

      if (typeof value === 'object' && value !== null) {
        const imageUrl = (Array.isArray(value) && value[0]?.url)
          || value.url || value.src || value.href;

        if (imageUrl) {
          const imageStyle = displayMode === 'Grid'
            ? 'max-width: 100%;'
            : 'max-width: 50%;';

          return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">
                    <img src="${imageUrl}" alt="${key}" class="item-image" style="${imageStyle} border-radius: 4px;" />
                  </p>`;
        }

        return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">${JSON.stringify(value)}</p>`;
      }

      return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">${value}</p>`;
    })
    .join("");

  const boxShadowStyle = boxShadow ? "0 2px 6px rgba(255, 0, 0, 0.4)" : "none";

  if (displayMode === "Grid") {
    //  Grid: whole card is clickable
    return `
      <a href="${detailUrl}" target="_blank" style="text-decoration: none; color: inherit;">
        <div class="search-result-item" 
          style="
            background: #fff;
            border: 1px solid #ddd;
            border-radius: ${borderRadius};
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: ${boxShadowStyle};
          ">
          <h4 style="font-size: ${titleFontSize}; font-family: ${titleFontFamily}; color: ${titleColor}; margin-bottom: 0.5rem;">
            ${titleText}
          </h4>
          ${matchedText
            ? `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">${matchedText}...</p>`
            : fieldsHtml}
        </div>
      </a>
    `;
  } else {
    //  List: no card, only title is clickable
    return `
      <div class="search-result-item" style="margin-bottom: 1rem; padding-left: 1rem;">
        <a href="${detailUrl}" target="_blank" style="font-size: ${titleFontSize}; font-family: ${titleFontFamily}; color: ${titleColor}; font-weight: bold; text-decoration: underline;">
          ${titleText}
        </a>
        ${matchedText
          ? `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">${matchedText}...</p>`
          : fieldsHtml}
      </div>
    `;
  }
}).join("");


    let paginationHtml = "";
    if (paginationType === "Numbered" && totalPages > 1) {
        paginationHtml = `<div class="pagination" style="margin-top: 1rem;">`;
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<button class="pagination-button" data-page="${i}" style="margin: 0 4px; padding: 4px 8px;">${i}</button>`;
        }
        paginationHtml += `</div>`;
    }

    if (paginationType === "Load More" && endIndex < results.length) {
        paginationHtml += `<div style="text-align:center;"><button class="load-more-button" style="margin-top:1rem;">Load More</button></div>`;
    }

    const sectionHtml = `
        <section style="margin-top: 2rem;">
            
            <div class="search-results-wrapper" style="
  display: ${displayMode === 'Grid' ? 'grid' : 'block'};
  grid-template-columns: repeat(${gridColumns}, 1fr);
  gap: 1rem;
">

                ${itemsHtml}
            </div>
            ${paginationHtml}
        </section>`;

    if (container) {
        container.innerHTML = sectionHtml;
        if (paginationType === "Numbered") {
            container.querySelectorAll('.pagination-button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.getAttribute('data-page'));
                    renderResults(results, title, displayMode, maxItems, gridColumns, paginationType, container, page,isPageResult,styles);
                });
            });
        }

        if (paginationType === "Load More") {
            const loadBtn = container.querySelector('.load-more-button');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    renderResults(results, title, displayMode, endIndex + maxItems, gridColumns, paginationType, container, 1,isPageResult,
                        styles);
                });
            }
        }
    }

    return sectionHtml;
}

document.addEventListener("DOMContentLoaded", async function () {
    const searchConfigDiv = document.querySelector('#search-config');

    if (!searchConfigDiv) {
        console.error(" 'search-config' div not found.");
        return;
    }

    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-display') || '[]');
    const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
    const displayMode = searchConfigDiv.getAttribute('data-display-mode');
    const paginationType = searchConfigDiv.getAttribute('data-pagination-type') || "None";
    const gridRows = parseInt(searchConfigDiv.getAttribute('data-grid-rows'), 10) || 1;
    const gridColumns = parseInt(searchConfigDiv.getAttribute('data-grid-columns'), 10) || 1;
    const itemsPerPage = parseInt(searchConfigDiv.getAttribute('data-items-per-page'), 10) || 10;
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
    const resultPage = searchConfigDiv.getAttribute('data-result-page') || "Same page";
    const shouldOpenInNewPage = resultPage === "New Page";

    const titleFontSize = searchConfigDiv.getAttribute("data-title-font-size") || "16px";
    const titleFontFamily = searchConfigDiv.getAttribute("data-title-font-family") || "Arial";
    const titleColor = searchConfigDiv.getAttribute("data-title-color") || "#000";
    const otherFieldsColor = searchConfigDiv.getAttribute("data-other-fields-color") || "#333";
    const otherFieldsFontSize = searchConfigDiv.getAttribute("data-other-fields-font-size") || "14px";
    const borderRadius = searchConfigDiv.getAttribute("data-border-radius") || "6px";
    const boxShadow = searchConfigDiv.getAttribute("data-box-shadow") === "true";

    const maxItems = displayMode === "Grid" ? gridRows * gridColumns : itemsPerPage;
    const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));
    const fieldsDisplayParam = encodeURIComponent(JSON.stringify(selectedFieldsDisplay));


     const styles = {
      titleFontSize,
      titleFontFamily,
      titleColor,
      otherFieldsColor,
      otherFieldsFontSize,
      borderRadius,
         boxShadow,
    };

 
const wrapper = document.querySelector(".searchresultformwrapper");

  const form = wrapper.querySelector("form.w-form"); // form inside wrapper
  const input = wrapper.querySelector("input[name='query']"); // input inside wrapper
    const resultsContainer = document.querySelector(".searchresults");
    const base_url = "https://search-server.long-rain-28bb.workers.dev";
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

     if (input) {
    input.style.borderRadius = '8px'; 
  }

    // Hide submit button if Auto result
const submitButton = form?.querySelector("input[type='submit']");

submitButton.style.display = "none";


    if (!form || !input || !resultsContainer) {
        console.warn("Search form or elements not found.");
        return;
    }

    form.removeAttribute("action");
    form.setAttribute("action", "#");

    const token = await getVisitorSessionToken();
    console.log("Generated Token: ", token);

     // === Implement Search Bar Display Mode ===
  if (searchBarType === "Icon") {
  // Hide form initially, show icon container (assumed to already exist)
  form.style.display = "none";

  const iconContainer = document.querySelector(".searchiconcontainer");
  if (!iconContainer) {
    console.error("'.searchiconcontainer' element not found.");
    return;
  }

  iconContainer.style.cursor = "pointer";
  iconContainer.style.display = ""; // Make sure icon is visible

  // On click show the form and hide the icon container
  iconContainer.addEventListener("click", () => {
    form.style.display = "";
    iconContainer.style.display = "none";
    input.focus();
  });
} else {
  // Expand mode: show form and hide icon container if exists
  form.style.display = "";
  const iconContainer = document.querySelector(".searchiconcontainer");
  if (iconContainer) iconContainer.style.display = "none";
}

function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

    // Inject styles dynamically for suggestions
    const style = document.createElement("style");
    style.textContent = `
    .searchsuggestionbox {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ccc;
    max-height: 200px;
    overflow-y: auto;
    width: 100%;
    display: none;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
 

  .searchsuggestionbox .suggestion-item {
    padding: 8px;
    cursor: pointer;
    color: black !important;
    font-size: 12px !important;
    font-family: 'Inter', 'Arial', sans-serif !important;
    line-height: 1.4;
    background: white !important;
    border: none !important;
    text-transform: capitalize !important;
    white-space: normal;
  }

  .searchsuggestionbox .suggestion-item:hover {
    background-color: #eee;
  }
  .searchsuggestionbox .view-all-link {
    padding: 10px;
    text-align: center;
    font-weight: bold;
    color: #0073e6 !important;
    cursor: pointer;
    border-top: 1px solid #eee;
    background: #fafafa;
    font-family: Arial, sans-serif !important;
    font-size: 16px !important;
  }
    `;
    document.head.appendChild(style);

    // Create suggestion box if it doesn't exist
    let suggestionBox = document.querySelector(".searchsuggestionbox");
    if (!suggestionBox) {
        suggestionBox = document.createElement("div");
        suggestionBox.className = "searchsuggestionbox";
        // Append right after the input or somewhere appropriate in DOM
         input.parentNode.style.position = "relative";
        input.parentNode.appendChild(suggestionBox);
    }

    // Add input event listener for suggestion box
    input.addEventListener("input", async () => {
        const query = input.value.trim();

        if (!query) {
            suggestionBox.style.display = "none";
            suggestionBox.innerHTML = "";
            return;
        }

        try {
            const url = `https://search-server.long-rain-28bb.workers.dev/api/suggestions?query=${encodeURIComponent(query)}&siteName=${encodeURIComponent(siteName)}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}`;

            const response = await fetch(url);

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            if (data.suggestions && data.suggestions.length > 0) {
                suggestionBox.style.display = "block";
                suggestionBox.innerHTML = data.suggestions
                    .map(s => {
      const clean = sanitizeText(s);
      const titled = toTitleCase(clean);
      return `<div class="suggestion-item">${titled}</div>`;
    })
                    .join("");

                // Attach click listeners to suggestions
suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
  item.addEventListener('click', () => {
    input.value = item.textContent;
    suggestionBox.style.display = "none";
    performSearch(); // Trigger the search
  });
});

            } else {
                suggestionBox.style.display = "none";
                suggestionBox.innerHTML = "";
            }
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
            suggestionBox.style.display = "none";
            suggestionBox.innerHTML = "";
        }
    });
    
    
   // Create spinner element
const spinner = document.createElement("div");
spinner.id = "search-spinner";
spinner.style.display = "none";
spinner.innerHTML = `
  <div class="spinner"></div>
`;

// Add spinner styles
const spinnerStyle = document.createElement("style");
spinnerStyle.textContent = `
#search-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60px;
}
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0073e6;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
`;

// Append spinner and styles to the document
document.head.appendChild(spinnerStyle);
document.body.appendChild(spinner);


function showSpinner() {
  spinner.style.display = "flex";
  // Optionally, position spinner over resultsContainer:
  resultsContainer.parentNode.insertBefore(spinner, resultsContainer);
}

function hideSpinner() {
  spinner.style.display = "none";
}

async function performSearch() {
    let query = input?.value.trim().toLowerCase();

    if (!query) {
        const params = new URLSearchParams(window.location.search);
        query = params.get('q')?.trim().toLowerCase() || '';
        console.log('Query from URL params:', query);
    }

    if (!query) return;
    
    
     showSpinner();
    resultsContainer.innerHTML = ""; 

    try {
        const headers = { Authorization: `Bearer ${token}` };

        let pageResPromise = Promise.resolve({ ok: true, json: () => ({ results: [] }) }); // Default to empty successful response
        let cmsResPromise = Promise.resolve({ ok: true, json: () => ({ results: [] }) }); // Default to empty successful response

        // Conditionally create promises based on selectedOption
        if (selectedOption === "Pages" || selectedOption === "Both") {
            pageResPromise = fetch(`${base_url}/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`, { headers });
        }

        if (selectedOption === "Collection" || selectedOption === "Both") {
            cmsResPromise = fetch(`${base_url}/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`, { headers });
        }

        // Wait for only the necessary promises to resolve
        const [pageRes, cmsRes] = await Promise.all([
            pageResPromise,
            cmsResPromise,
        ]);

        const pageData = pageRes.ok ? await pageRes.json() : { results: [] };
        const cmsData = cmsRes.ok ? await cmsRes.json() : { results: [] };

        // Clear previous results
        resultsContainer.innerHTML = "";

        // Combine results and add a type identifier
        let allResults = [];

        // Note: pageData.results and cmsData.results will now correctly be empty arrays
        // if their respective fetches were skipped or failed.
        if (Array.isArray(pageData.results) && pageData.results.length > 0) {
            allResults = allResults.concat(pageData.results.map(item => ({ ...item, _type: 'page' })));
        }

        if (Array.isArray(cmsData.results) && cmsData.results.length > 0) {
            allResults = allResults.concat(cmsData.results.map(item => ({ ...item, _type: 'cms' })));
        }

        if (allResults.length === 0) {
            resultsContainer.innerHTML = "<p>No results found.</p>";
            return;
        }

        // Optional: Sort combined results if needed, e.g., by a relevance score or date
        // allResults.sort((a, b) => /* your sorting logic here */);

        // Render all results into a single container with a single pagination
        const combinedResultsDiv = document.createElement("div");
        combinedResultsDiv.classList.add("combined-search-results"); // Add a class for styling
        resultsContainer.appendChild(combinedResultsDiv);

        // Call renderResults only once with the combined results
        // The `isPageResult` parameter is now effectively managed by the `_type` property within each item
        renderResults(allResults, "Search Results", displayMode, maxItems, gridColumns, paginationType, combinedResultsDiv, 1, false, styles); // Pass false for isPageResult, as it's now handled internally
 hideSpinner();
    } catch (error) {
        console.error('Error performing search:', error);
        resultsContainer.innerHTML = "<p>Error performing search. Please try again later.</p>";
    hideSpinner();
    }
}

    
    window.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("search-app-results")) {
    performSearch();
  }
});




       
      //  let debounceTimeout;
      //  input.addEventListener("input", () => {
        //    clearTimeout(debounceTimeout);
         //   debounceTimeout = setTimeout(() => {
           //     performSearch();
           // }, 300); // 300ms debounce
       // });
    
        
        form.addEventListener("submit", (e) => {
  e.preventDefault();
  performSearch(); // ✅ trigger search on submit
});
    
document.addEventListener('click', (event) => {
  if (!suggestionBox.contains(event.target) && event.target !== input) {
    suggestionBox.style.display = "none";
  }
});


});   
//</script>
